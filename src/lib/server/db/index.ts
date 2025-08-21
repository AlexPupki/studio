'use server';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getEnv } from '../config.server';
import * as schema from './schema';

const pool = new Pool({
  connectionString: getEnv('DATABASE_URL'),
  ssl: process.env.NODE_ENV === 'production',
});

export const db = drizzle(pool, { schema });
