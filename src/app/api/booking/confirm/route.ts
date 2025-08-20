import { withIdempotency } from "@/lib/server/redis/idempotency";
import { assertTrustedOrigin } from "@/lib/server/http/origin";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { confirmCapacity } from "@/lib/server/capacity";
import { db } from "@/lib/server/db";
import { bookings, invoices } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { withPgTx } from "@/lib/server/db/tx";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ConfirmRequestSchema = z.object({
  bookingId: z.string().uuid(),
  paymentRef: z.string(),
});

async function handler(req: NextRequest) {
  return withIdempotency(req, async () => {
    assertTrustedOrigin(req);
    const body = await req.json();
    const parsed = ConfirmRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("validation_error", "Invalid body", 400, parsed.error.format());
    }
    const { bookingId, paymentRef } = parsed.data;

    const result = await withPgTx(async (tx) => {
      const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!booking) throw new ApiError("not_found", "Booking not found", 404);

      const [invoice] = await tx.select().from(invoices).where(eq(invoices.bookingId, bookingId));
      if (!invoice) throw new ApiError("not_found", "Invoice not found for this booking", 404);
      if (invoice.status !== 'issued') throw new ApiError("conflict", "Invoice is not in 'issued' state", 409);

      await confirmCapacity(booking.slotId, booking.qty);
      
      const [updatedBooking] = await tx
        .update(bookings)
        .set({ state: 'confirm', paymentRef })
        .where(eq(bookings.id, bookingId))
        .returning({ state: bookings.state });
      
      await tx
        .update(invoices)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(invoices.bookingId, bookingId));

      return updatedBooking;
    });

    return NextResponse.json(result);
  });
}

export const POST = withApiError(handler);
