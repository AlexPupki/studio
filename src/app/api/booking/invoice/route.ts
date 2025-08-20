import { withIdempotency } from "@/lib/server/redis/idempotency";
import { assertTrustedOrigin } from "@/lib/server/http/origin";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { db } from "@/lib/server/db";
import { bookings, invoices } from "@/lib/server/db/schema";
import { eq } from "drizzle-orm";
import { withPgTx } from "@/lib/server/db/tx";
import { customAlphabet } from "nanoid";
import { generateAndUploadPdf } from "@/lib/server/pdf";
import { generateDownloadUrl } from "@/lib/server/gcs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const nanoid = customAlphabet('0123456789', 6);

const InvoiceRequestSchema = z.object({
  bookingId: z.string().uuid(),
});

async function handler(req: NextRequest) {
  return withIdempotency(req, async () => {
    assertTrustedOrigin(req);
    const body = await req.json();
    const parsed = InvoiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("validation_error", "Invalid body", 400, parsed.error.format());
    }
    const { bookingId } = parsed.data;

    const result = await withPgTx(async (tx) => {
      const [booking] = await tx
        .select({ state: bookings.state })
        .from(bookings)
        .where(eq(bookings.id, bookingId));

      if (!booking) throw new ApiError("not_found", "Booking not found", 404);
      if (booking.state !== "hold") throw new ApiError("conflict", "Booking must be in 'hold' state", 409);

      // Check if invoice already exists
      const [existingInvoice] = await tx.select().from(invoices).where(eq(invoices.bookingId, bookingId));
      if (existingInvoice) {
         const pdfUrl = existingInvoice.pdfPath ? await generateDownloadUrl(existingInvoice.pdfPath) : null;
         return { invoiceNumber: existingInvoice.number, pdfUrl };
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${nanoid()}`;
      
      // Placeholder for price calculation
      const amountMinor = 1000 * 100; // 1000 RUB in minor units

      const pdfPath = await generateAndUploadPdf(invoiceNumber, `Invoice for booking ${bookingId}. Amount: ${amountMinor/100} RUB`);

      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          bookingId,
          number: invoiceNumber,
          amountMinor,
          status: 'issued',
          pdfPath,
        })
        .returning();

      await tx.update(bookings).set({ state: 'invoice' }).where(eq(bookings.id, bookingId));

      const pdfUrl = await generateDownloadUrl(pdfPath);
      return { invoiceNumber: newInvoice.number, pdfUrl };
    });

    return NextResponse.json(result);
  });
}

export const POST = withApiError(handler);