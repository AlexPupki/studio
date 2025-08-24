import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withTransaction } from '@/lib/server/db/transaction';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { routes, slots } from '@/lib/server/db/schema';

const AvailabilityQuerySchema = z.object({
  routeId: z.string().uuid(),
  pax: z.coerce.number().int().positive().default(1),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
});

/**
 * @swagger
 * /api/public/availability:
 *   get:
 *     summary: Get available slots for a route
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the route.
 *       - in: query
 *         name: pax
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Number of passengers.
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of the date range to search for slots.
 *       - in: query
 *         name: dateTo
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of the date range to search for slots.
 *     responses:
 *       200:
 *         description: A list of available slots.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slots:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       startAt:
 *                         type: string
 *                         format: date-time
 *                       availableSeats:
 *                         type: integer
 *       400:
 *         description: Invalid input parameters.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const validation = AvailabilityQuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!validation.success) {
    return NextResponse.json({ error: validation.error.format() }, { status: 400 });
  }

  const { routeId, pax, dateFrom, dateTo } = validation.data;

  try {
    const availableSlots = await withTransaction(async (tx) => {
      return tx
        .select({
          id: slots.id,
          startAt: slots.startAt,
          availableSeats: sql<number>`${slots.capacityTotal} - ${slots.capacityHeld} - ${slots.capacityConfirmed}`,
        })
        .from(slots)
        .innerJoin(routes, eq(slots.routeId, routes.id))
        .where(
          and(
            eq(slots.routeId, routeId),
            eq(routes.status, 'active'),
            gte(slots.startAt, new Date(dateFrom)),
            lte(slots.startAt, new Date(dateTo)),
            sql`${slots.capacityTotal} - ${slots.capacityHeld} - ${slots.capacityConfirmed} >= ${pax}`
          )
        )
        .orderBy(slots.startAt);
    });

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error('Failed to fetch availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
