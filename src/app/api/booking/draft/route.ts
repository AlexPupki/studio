import { db } from "@/lib/server/db";
import { bookings } from "@/lib/server/db/schema";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { normalizePhone } from "@/lib/shared/phone.utils";
import { customAlphabet } from 'nanoid';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp } from "@/lib/server/redis/rateLimit";
import { assertTrustedOrigin } from "@/lib/server/http/origin";

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

const DraftRequestSchema = z.object({
  slotId: z.string().uuid(),
  qty: z.number().int().positive(),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  }),
});

async function handler(req: NextRequest) {
  await rateLimitByIp('booking_draft', 10, '1m');
  assertTrustedOrigin(req);

  const body = await req.json();
  const parsed = DraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("validation_error", "Invalid body", 400, parsed.error.format());
  }

  const { slotId, qty, customer } = parsed.data;

  const phoneE164 = normalizePhone(customer.phone);
  if (!phoneE164) {
    throw new ApiError("validation_error", "Invalid phone number format", 400);
  }

  const [newBooking] = await db
    .insert(bookings)
    .values({
      slotId,
      qty,
      customerName: customer.name,
      customerPhoneE164: phoneE164,
      state: "draft",
      code: nanoid(),
    })
    .returning({
      bookingId: bookings.id,
      code: bookings.code,
      state: bookings.state,
    });

  return NextResponse.json(newBooking, { status: 201 });
}

export const POST = withApiError(handler);