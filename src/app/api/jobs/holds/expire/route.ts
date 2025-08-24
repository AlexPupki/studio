'use server';

import { NextRequest, NextResponse } from 'next/server';
import { withApiError, ApiError } from '@/lib/server/http/errors';
import { getEnv } from '@/lib/server/config.server';
import { db } from '@/lib/server/db';
import { bookings } from '@/lib/server/db/schema';
import { and, eq, lte } from 'drizzle-orm';
import { withPgTx } from '@/lib/server/db/tx';
import { releaseHold } from '@/lib/server/capacity';
import { audit } from '@/lib/server/audit';
import { createHmac } from 'crypto';

const MAX_BATCH_SIZE = 50;

/**
 * Verifies the HMAC signature of the request.
 * This is for server-to-server communication where the body is empty.
 * @param req The NextRequest object.
 * @returns A promise that resolves if the signature is valid, and rejects otherwise.
 */
async function verifySignature(req: NextRequest): Promise<void> {
    const signatureHeader = req.headers.get('X-Cron-Signature');
    if (!signatureHeader) {
        throw new ApiError('unauthorized', 'Missing X-Cron-Signature header', 401);
    }
    
    // For cron jobs, the signature is often just based on the secret, as the body is empty.
    const secret = getEnv('CRON_SECRET');
    if (!secret) {
        throw new ApiError('configuration_error', 'CRON_SECRET is not configured', 500);
    }

    const hmac = createHmac('sha256', secret);
    hmac.update(''); // Empty body for this specific cron job
    const expectedSignature = hmac.digest('hex');

    if (signatureHeader !== expectedSignature) {
        throw new ApiError('forbidden', 'Invalid signature', 403);
    }
}


async function handler(req: NextRequest, traceId: string) {
    // In production, HMAC signature is preferred. Bearer token is simpler for dev.
    if (process.env.NODE_ENV === 'production') {
        await verifySignature(req);
    } else {
        const cronSecret = req.headers.get('Authorization')?.replace('Bearer ', '');
        if (getEnv('CRON_SECRET') !== cronSecret) {
          throw new ApiError('unauthorized', 'Invalid cron secret', 401);
        }
    }

  const expiredBookings = await db
    .select({
      id: bookings.id,
      slotId: bookings.slotId,
      qty: bookings.qty
    })
    .from(bookings)
    .where(and(
      lte(bookings.holdExpiresAt, new Date()),
      eq(bookings.state, 'hold')
    ))
    .limit(MAX_BATCH_SIZE);

  if (expiredBookings.length === 0) {
    return NextResponse.json({ processed: 0, seatsReleased: 0, status: 'no_expired_holds' });
  }

  let releasedCount = 0;
  let canceledCount = 0;
  const startTime = Date.now();

  for (const booking of expiredBookings) {
    try {
        await withPgTx(async (tx) => {
          // Set the state to 'cancel' with reason 'expired'
          const [updated] = await tx
            .update(bookings)
            .set({ state: 'cancel', cancelReason: 'expired' })
            .where(and(
              eq(bookings.id, booking.id),
              eq(bookings.state, 'hold') // Double-check state inside transaction
            ))
            .returning({ id: bookings.id });
          
          // If the update was successful (i.e., the booking was still on hold)
          if (updated) {
            await releaseHold(tx, booking.slotId, booking.qty);
            
            releasedCount += booking.qty;
            canceledCount++;

            await audit({
                traceId,
                actor: { type: 'system', id: 'cron:expire_holds' },
                action: 'booking.expired',
                entity: { type: 'booking', id: booking.id },
                data: { from: 'hold', to: 'cancel' }
            });
          }
        });
    } catch(error) {
        console.error(`[${traceId}] Failed to process expired booking ${booking.id}:`, error);
        // Continue to the next booking even if one fails
    }
  }

  const durationMs = Date.now() - startTime;
  const logPayload = { job: "holds-expire", batchSize: expiredBookings.length, expiredCount: canceledCount, seatsReleased: releasedCount, durationMs, traceId };
  console.log(JSON.stringify(logPayload));

  return NextResponse.json(logPayload);
}

export const POST = withApiError(handler);
