'use server';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { getEnv } from '../config.server';
import * as schema from './schema';
import { parse } from 'pg-connection-string';

let pool: Pool;

function getPool(): Pool {
    if (pool) {
        return pool;
    }

    const connectionString = getEnv('DATABASE_URL');
    const socketPath = getEnv('DB_SOCKET_PATH');

    if (!connectionString) {
        throw new Error('DATABASE_URL is not set in environment variables');
    }

    const dbConfig = parse(connectionString);

    const config: PoolConfig = {
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database ?? undefined,
        port: dbConfig.port ? parseInt(dbConfig.port, 10) : 5432,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false, // Basic SSL support from connection string
    };
    
    // In a Google Cloud environment (like App Hosting or Cloud Run),
    // it's best practice to connect via a Unix socket for security and performance.
    if (socketPath && process.env.NODE_ENV === 'production') {
        config.host = `${socketPath}/${dbConfig.host}`;
    } else {
        // For local development or other environments, connect via TCP.
        config.host = dbConfig.host ?? 'localhost';
    }

    console.log(`Connecting to PostgreSQL with host: ${config.host}`);

    pool = new Pool(config);
    return pool;
}

export const db = drizzle(getPool(), { schema });
