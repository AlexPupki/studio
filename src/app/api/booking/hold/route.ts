
import { withIdempotency } from "@/lib/server/redis/idempotency";
import { assertTrustedOrigin } from "@/lib/server/http/origin";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { holdCapacity } from "@/lib/server/capacity";
import { db } from "@/lib/server/db";
import { bookings } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { withPgTx } from "@/lib/server/db/tx";
import { addMinutes } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/server/redis/rateLimit";
import { audit } from "@/lib/server/audit";
import { getIp } from "@/lib/server/http/ip";
import { getEnv } from "@/lib/server/config.server";

const HoldRequestSchema = z.object({
  bookingId: z.string().uuid(),
});

async function handler(req: NextRequest, traceId: string) {
  return withIdempotency(req, traceId, async () => {
    await rateLimit('booking_hold', 5, '60s', getIp(req));
    assertTrustedOrigin(req);

    const body = await req.json();
    const parsed = HoldRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("validation_error", "Invalid body", 400, parsed.error.format());
    }
    const { bookingId } = parsed.data;

    const result = await withPgTx(async (tx) => {
      const [booking] = await tx
        .select({
          state: bookings.state,
          slotId: bookings.slotId,
          qty: bookings.qty,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId));
      
      if (!booking) {
        throw new ApiError("not_found", "Booking not found", 404);
      }
      if (booking.state !== 'draft') {
        throw new ApiError("conflict", "Booking is not in draft state", 409);
      }

      await holdCapacity(tx, booking.slotId, booking.qty);

      const holdExpiresAt = addMinutes(new Date(), getEnv('BOOKING_HOLD_TTL_MINUTES'));
      const [updatedBooking] = await tx
        .update(bookings)
        .set({ state: "hold", holdExpiresAt })
        .where(eq(bookings.id, bookingId))
        .returning({
          state: bookings.state,
          holdExpiresAt: bookings.holdExpiresAt,
        });

      await audit({
          traceId,
          actor: { type: 'user', id: 'TODO' }, // TODO: get from session
          action: 'booking.placed_on_hold',
          entity: { type: 'booking', id: bookingId },
          data: { from: 'draft', to: 'hold', expiresAt: holdExpiresAt }
      });
        
      return NextResponse.json(updatedBooking);
    });

    return result;
  });
}

export const POST = withApiError(handler);
