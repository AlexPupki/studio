import { NextRequest, NextResponse } from 'next/server';
import { withApiError, ApiError } from '@/lib/server/http/errors';
import { getEnv } from '@/lib/server/config';
import { db } from '@/lib/server/db';
import { bookings } from '@/lib/server/db/schema';
import { and, lt } from 'drizzle-orm';
import { withPgTx } from '@/lib/server/db/tx';
import { releaseHold } from '@/lib/server/capacity';

async function handler(req: NextRequest, traceId: string) {
  // In a real production environment, you would use OIDC to verify the token from Cloud Scheduler.
  // For this example, we'll use a simple bearer token secret.
  const cronSecret = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (getEnv('CRON_SECRET') !== cronSecret) {
    throw new ApiError('unauthorized', 'Invalid cron secret', 401);
  }

  const expiredBookings = await db
    .select({
      id: bookings.id,
      slotId: bookings.slotId,
      qty: bookings.qty
    })
    .from(bookings)
    .where(and(
      lt(bookings.holdExpiresAt, new Date()),
      lt(bookings.state, 'hold')
    ));

  if (expiredBookings.length === 0) {
    return NextResponse.json({ released: 0, canceled: 0 });
  }

  let releasedCount = 0;
  let canceledCount = 0;

  for (const booking of expiredBookings) {
    await withPgTx(async (tx) => {
      await releaseHold(booking.slotId, booking.qty);
      await tx
        .update(bookings)
        .set({ state: 'cancel' })
        .where(eq(bookings.id, booking.id));
        
      releasedCount += booking.qty;
      canceledCount++;
    });
  }

  return NextResponse.json({ released: releasedCount, canceled: canceledCount });
}

export const POST = withApiError(handler);
