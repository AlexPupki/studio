import { db } from "@/lib/server/db";
import { routes, slots } from "@/lib/server/db/schema";
import { ApiError, withApiError } from "@/lib/server/http/errors";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const AvailabilityQuerySchema = z.object({
  route: z.string(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const query = {
    route: url.searchParams.get("route"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };

  const parsedQuery = AvailabilityQuerySchema.safeParse(query);
  if (!parsedQuery.success) {
    throw new ApiError(
      "validation_error",
      "Invalid query parameters",
      400,
      parsedQuery.error.format()
    );
  }
  const { route: routeSlug, from, to } = parsedQuery.data;

  const [route] = await db
    .select({ id: routes.id })
    .from(routes)
    .where(eq(routes.slug, routeSlug));
  if (!route) {
    throw new ApiError("not_found", "Route not found", 404);
  }

  const conditions = [
    eq(slots.routeId, route.id),
    sql`${slots.capacityTotal} > ${slots.capacityHeld} + ${slots.capacityConfirmed}`,
  ];
  if (from) {
    conditions.push(gte(slots.startAt, new Date(from)));
  }
  if (to) {
    conditions.push(lte(slots.startAt, new Date(to)));
  }

  const availableSlots = await db
    .select({
      slotId: slots.id,
      startAt: slots.startAt,
      endAt: slots.endAt,
      capacityLeft:
        sql<number>`${slots.capacityTotal} - ${slots.capacityHeld} - ${slots.capacityConfirmed}`.as(
          "capacity_left"
        ),
    })
    .from(slots)
    .where(and(...conditions))
    .orderBy(asc(slots.startAt));

  const response = NextResponse.json(availableSlots);
  response.headers.set("Cache-Control", "public, max-age=30");
  return response;
}

export const GET = withApiError(handler);
