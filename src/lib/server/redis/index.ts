
'use server';

import Redis from 'ioredis';
import { getEnv } from '../config.server';

let redis: Redis | undefined | null = null;

function getRedisClient(): Redis | undefined {
  if (redis !== null) {
    return redis;
  }

  const redisUrl = getEnv('REDIS_URL');
  if (!redisUrl) {
    console.warn('REDIS_URL environment variable is not set. Rate limiting and idempotency will be disabled.');
    redis = undefined; // Mark as checked and unavailable
    return undefined;
  }

  redis = new Redis(redisUrl, {
      // Optional: Add more Redis options here, e.g., for TLS
      maxRetriesPerRequest: 3,
      lazyConnect: true,
  });

  redis.on('error', (err) => {
      console.error('Redis Client Error', err);
      // Prevent further attempts if connection is permanently lost
      redis = undefined;
  });

  return redis;
}

export const redisClient = getRedisClient();
