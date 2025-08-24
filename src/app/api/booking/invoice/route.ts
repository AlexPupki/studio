
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
import { audit } from "@/lib/server/audit";
import { getEnv } from "@/lib/server/config.server";

const nanoid = customAlphabet('0123456789', 6);

const InvoiceRequestSchema = z.object({
  bookingId: z.string().uuid(),
});

async function handler(req: NextRequest, traceId: string) {
  return withIdempotency(req, traceId, async () => {
    assertTrustedOrigin(req);
    const body = await req.json();
    const parsed = InvoiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("validation_error", "Invalid body", 400, parsed.error.format());
    }
    const { bookingId } = parsed.data;

    const result = await withPgTx(async (tx) => {
      const [booking] = await tx
        .select({ state: bookings.state, code: bookings.code })
        .from(bookings)
        .where(eq(bookings.id, bookingId));

      if (!booking) throw new ApiError("not_found", "Booking not found", 404);
      if (booking.state !== "hold") throw new ApiError("conflict", `Booking must be in 'hold' state, but is in '${booking.state}'`, 409);

      // Check if invoice already exists
      const [existingInvoice] = await tx.select().from(invoices).where(eq(invoices.bookingId, bookingId));
      if (existingInvoice) {
         const pdfUrl = existingInvoice.pdfPath ? await generateDownloadUrl(existingInvoice.pdfPath) : null;
         return { 
            invoiceId: existingInvoice.id,
            number: existingInvoice.number, 
            amount: existingInvoice.amountMinor,
            currency: existingInvoice.currency,
            pdfUrl
         };
      }

      const invoiceNumber = `GTS-${new Date().getFullYear()}-${nanoid()}`;
      
      // Placeholder for price calculation
      const amountMinor = 1000 * 100; // 1000 RUB in minor units
      const currency = getEnv('BASE_CURRENCY');

      const pdfPath = await generateAndUploadPdf(invoiceNumber, `Invoice for booking ${booking.code}. Amount: ${amountMinor/100} ${currency}`);

      const [newInvoice] = await tx
        .insert(invoices)
        .values({
          bookingId,
          number: invoiceNumber,
          amountMinor,
          currency,
          status: 'issued',
          pdfPath,
        })
        .returning();

      await tx.update(bookings).set({ state: 'invoice' }).where(eq(bookings.id, bookingId));

      await audit({
          traceId,
          actor: { type: 'user', id: 'TODO' }, // TODO: get from session
          action: 'invoice.issued',
          entity: { type: 'invoice', id: newInvoice.id },
          data: { bookingId, number: newInvoice.number, amount: newInvoice.amountMinor }
      });

      const pdfUrl = await generateDownloadUrl(pdfPath);
      return { 
        invoiceId: newInvoice.id,
        number: newInvoice.number, 
        amount: newInvoice.amountMinor,
        currency: newInvoice.currency,
        pdfUrl
      };
    });

    return NextResponse.json(result);
  });
}

export const POST = withApiError(handler);
