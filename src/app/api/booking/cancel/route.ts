import { assertTrustedOrigin } from "@/lib/server/http/origin";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { releaseHold } from "@/lib/server/capacity";
import { db } from "@/lib/server/db";
import { bookings, invoices } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { withPgTx } from "@/lib/server/db/tx";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/server/audit";

const CancelRequestSchema = z.object({
  bookingId: z.string().uuid(),
});

async function handler(req: NextRequest, traceId: string) {
  assertTrustedOrigin(req);
  const body = await req.json();
  const parsed = CancelRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("validation_error", "Invalid body", 400, parsed.error.format());
  }
  const { bookingId } = parsed.data;

  const result = await withPgTx(async (tx) => {
    const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId));

    if (!booking) {
      throw new ApiError("not_found", "Booking not found", 404);
    }
    
    // Only 'hold' and 'invoice' states can be cancelled by user
    if (booking.state !== 'hold' && booking.state !== 'invoice') {
      throw new ApiError("conflict", `Booking in state '${booking.state}' cannot be canceled.`, 409);
    }
    
    const previousState = booking.state;

    // If the booking was on hold, release the capacity
    if (booking.state === 'hold') {
        await releaseHold(tx, booking.slotId, booking.qty);
    }

    const [updatedBooking] = await tx
      .update(bookings)
      .set({ state: 'cancel', cancelReason: 'ops_request' })
      .where(eq(bookings.id, bookingId))
      .returning({ state: bookings.state });

    // If there is an invoice, void it
    await tx.update(invoices).set({ status: 'void' }).where(eq(invoices.bookingId, bookingId));
    
    await audit({
        traceId,
        actor: { type: 'ops', id: 'TODO' }, // TODO: get from session
        action: 'booking.canceled',
        entity: { type: 'booking', id: bookingId },
        data: { from: previousState, to: 'cancel', reason: 'ops_request' }
    });

    return updatedBooking;
  });
  
  return NextResponse.json(result);
}

export const POST = withApiError(handler);
