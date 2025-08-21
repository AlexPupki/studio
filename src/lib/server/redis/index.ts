'use server';

import Redis from 'ioredis';
import { getEnv } from '../config.server';

let redis: Redis | undefined;

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = getEnv('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set.');
    }
    redis = new Redis(redisUrl, {
        // Optional: Add more Redis options here, e.g., for TLS
        maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
        console.error('Redis Client Error', err);
    });
  }
  return redis;
}

export const redisClient = getRedisClient();
