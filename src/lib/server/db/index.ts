
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { getEnv } from '../config.server';
import * as schema from './schema';

let pool: Pool;

function getPool(): Pool {
    if (pool) {
        return pool;
    }

    const socketPath = getEnv('DB_SOCKET_PATH');

    const config: PoolConfig = {
        user: getEnv('PG_USER'),
        password: getEnv('PG_PASSWORD'),
        database: getEnv('PG_DATABASE'),
        port: getEnv('PG_PORT'),
        host: getEnv('PG_HOST'),
        ssl: false, // For simplicity, SSL is off. Add logic if needed for prod.
    };
    
    // In a Google Cloud environment (like App Hosting or Cloud Run),
    // it's best practice to connect via a Unix socket for security and performance.
    if (socketPath && process.env.NODE_ENV === 'production') {
        config.host = `${socketPath}/${config.host}`;
    }

    console.log(`Connecting to PostgreSQL with host: ${config.host}`);

    pool = new Pool(config);
    return pool;
}

export const db = drizzle(getPool(), { schema });
