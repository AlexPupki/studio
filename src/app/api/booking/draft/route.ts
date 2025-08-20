'use server';

import { db } from "@/lib/server/db";
import { bookings } from "@/lib/server/db/schema";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { normalizePhone } from "@/lib/shared/phone.utils";
import { customAlphabet } from 'nanoid';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitByIp } from "@/lib/server/redis/rateLimit";
import { assertTrustedOrigin } from "@/lib/server/http/origin";
import { audit } from "@/lib/server/audit";

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

const DraftRequestSchema = z.object({
  slotId: z.string().uuid(),
  qty: z.number().int().positive(),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  }),
});

async function handler(req: NextRequest, traceId: string) {
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
      id: bookings.id,
      code: bookings.code,
      state: bookings.state,
    });
  
  await audit({
      traceId,
      actor: { type: 'user', id: 'TODO' }, // TODO: get from session
      action: 'booking.drafted',
      entity: { type: 'booking', id: newBooking.id },
      data: { slotId, qty, customerName: customer.name }
  });

  return NextResponse.json({
      bookingId: newBooking.id,
      code: newBooking.code,
      state: newBooking.state,
  }, { status: 201 });
}

export const POST = withApiError(handler);
