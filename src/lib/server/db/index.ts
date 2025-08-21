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
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    const dbConfig = parse(connectionString);

    const config: PoolConfig = {
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database ?? undefined,
        port: dbConfig.port ? parseInt(dbConfig.port, 10) : 5432,
    };
    
    const socketPath = process.env.DB_SOCKET_PATH;
    if (socketPath && process.env.NODE_ENV === 'production') {
        // Use the socket path for Cloud SQL in production
        config.host = `${socketPath}/${dbConfig.host}`;
    } else {
        // Use the host for local development
        config.host = dbConfig.host ?? 'localhost';
    }

    pool = new Pool(config);
    return pool;
}

export const db = drizzle(getPool(), { schema });
