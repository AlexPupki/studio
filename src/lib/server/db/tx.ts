'use server';

import { PgTransaction } from 'drizzle-orm/pg-core';
import { db } from './index';
import { ExtractTablesWithRelations, SQL } from 'drizzle-orm';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 50;

/**
 * Executes a function within a database transaction, with automatic retries for serialization errors.
 * @param fn The function to execute. It receives the transaction object.
 * @returns The result of the executed function.
 */
export async function withPgTx<T>(
  fn: (
    tx: PgTransaction<
      any,
      any,
      ExtractTablesWithRelations<any>,
      SQL.Aliased<any, any> | SQL.Aliased<any, any>[]
    >
  ) => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // The `db.transaction()` method from Drizzle ORM automatically handles begin/commit/rollback.
      return await db.transaction(fn, {
        isolationLevel: 'repeatable read', // Or 'serializable' for stricter guarantees
      });
    } catch (error: any) {
      lastError = error;
      // PostgreSQL error code for serialization failure
      if (error.code === '40001') {
        if (i < MAX_RETRIES - 1) {
          // Wait before retrying with jitter
          const delay = RETRY_DELAY_MS * Math.pow(2, i) + Math.random() * RETRY_DELAY_MS;
          console.warn(`Transaction failed with serialization error. Retrying in ${delay.toFixed(0)}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      // If it's not a serialization error or retries are exhausted, re-throw.
      throw error;
    }
  }

  // This line should be unreachable if the loop is correct, but TypeScript needs it.
  console.error("Transaction failed after maximum retries.", lastError);
  throw lastError;
}
