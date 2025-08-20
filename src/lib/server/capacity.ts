'use server';

import { slots } from './db/schema';
import { withPgTx } from './db/tx';
import { eq, sql } from 'drizzle-orm';
import { ApiError } from './http/errors';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations, SQL } from 'drizzle-orm';

type Tx = PgTransaction<any, any, ExtractTablesWithRelations<any>, SQL.Aliased<any, any>[] | SQL.Aliased<any, any>>;

/**
 * Reserves capacity for a given slot within a transaction.
 * Throws an ApiError if the slot is not found or if there is not enough capacity.
 * @param tx The database transaction object.
 * @param slotId The ID of the slot to reserve capacity for.
 * @param qty The quantity of seats to reserve.
 */
export async function holdCapacity(tx: Tx, slotId: string, qty: number): Promise<void> {
    // Lock the row for the duration of the transaction
    const [slot] = await tx
      .select()
      .from(slots)
      .where(eq(slots.id, slotId))
      .for('update');

    if (!slot) {
      throw new ApiError('slot_not_found', 'The requested slot does not exist.', 404);
    }

    const availableCapacity = slot.capacityTotal - slot.capacityHeld - slot.capacityConfirmed;
    if (availableCapacity < qty) {
      throw new ApiError('insufficient_capacity', 'Not enough capacity available for this slot.', 409);
    }

    await tx
      .update(slots)
      .set({ capacityHeld: sql`${slots.capacityHeld} + ${qty}` })
      .where(eq(slots.id, slotId));
}

/**
 * Confirms capacity that was previously held.
 * @param tx The database transaction object.
 * @param slotId The ID of the slot.
 * @param qty The quantity to confirm.
 */
export async function confirmCapacity(tx: Tx, slotId: string, qty: number): Promise<void> {
    const [slot] = await tx.select({ capacityHeld: slots.capacityHeld }).from(slots).where(eq(slots.id, slotId)).for('update');

    if (!slot) {
        throw new ApiError('slot_not_found', 'The requested slot does not exist.', 404);
    }

    if (slot.capacityHeld < qty) {
        throw new ApiError('confirm_capacity_error', 'Cannot confirm more capacity than was held.', 409);
    }

    await tx.update(slots).set({
        capacityHeld: sql`${slots.capacityHeld} - ${qty}`,
        capacityConfirmed: sql`${slots.capacityConfirmed} + ${qty}`
    }).where(eq(slots.id, slotId));
}

/**
 * Releases capacity that was previously held (e.g., when a hold expires).
 * @param tx The database transaction object.
 * @param slotId The ID of the slot.
 * @param qty The quantity to release.
 */
export async function releaseHold(tx: Tx, slotId: string, qty: number): Promise<void> {
    const [slot] = await tx.select({ capacityHeld: slots.capacityHeld }).from(slots).where(eq(slots.id, slotId)).for('update');

    if (!slot) {
        // It's possible the slot was deleted, so we don't throw an error here.
        console.warn(`Attempted to release hold on non-existent slot: ${slotId}`);
        return;
    }

    const newHeld = Math.max(0, slot.capacityHeld - qty);

    await tx.update(slots).set({
        capacityHeld: newHeld
    }).where(eq(slots.id, slotId));
}
