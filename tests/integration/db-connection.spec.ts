import { describe, it, expect } from 'vitest';
import { db } from '@/lib/server/db';
import { sql } from 'drizzle-orm';

describe('Database Connection', () => {
  it('should connect to the database and execute a simple query', async () => {
    try {
      // Execute a raw, simple query to check the connection.
      const result = await db.execute(sql`SELECT 1 as value`);
      
      // The 'pg' driver returns a result object which contains the rows.
      // We need to access the 'rows' property to get the data.
      // @ts-ignore - Drizzle's execute type doesn't strongly type the raw result object
      const rows = result.rows as { value: number }[];

      // We expect the query to return one row with the value 1.
      expect(rows).toBeDefined();
      expect(rows.length).toBe(1);
      expect(rows[0].value).toBe(1);

      console.log('Database connection test successful!');

    } catch (error) {
      // If the test fails, provide a helpful error message.
      console.error("Database connection test failed. Please check your .env variables (PG_HOST, PG_USER, PG_PASSWORD, PG_DATABASE, PG_PORT).");
      // Re-throw the error to make the test fail.
      throw error;
    }
  });
});
