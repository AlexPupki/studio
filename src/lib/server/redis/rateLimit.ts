'use server';
import { redisClient } from '.';
import { headers } from 'next/headers';
import { ApiError } from '../http/errors';

type TimeUnit = 's' | 'm' | 'h' | 'd';

function parseDuration(duration: `${number}${TimeUnit}`): number {
    const unit = duration.slice(-1) as TimeUnit;
    const value = parseInt(duration.slice(0, -1));

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: throw new Error('Invalid time unit');
    }
}

function getIp(): string {
    const forwardedFor = headers().get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    const realIp = headers().get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    // For local development or environments without these headers
    return '127.0.0.1';
}

/**
 * Limits the rate of requests for a given identifier within a sliding window.
 * Throws an ApiError if the rate limit is exceeded.
 * @param identifier A unique identifier for the action being rate-limited.
 * @param limit The maximum number of requests allowed within the window.
 * @param window A string representing the time window (e.g., '60s', '1m', '1h').
 * @param key (Optional) A specific key to rate limit on (e.g., userId, phone number). Defaults to the client's IP address.
 */
export async function rateLimit(identifier: string, limit: number, window: `${number}${TimeUnit}`, key?: string): Promise<void> {
    const targetKey = key || getIp();
    const redisKey = `rl:${identifier}:${targetKey}`;
    const windowSec = parseDuration(window);

    const now = Date.now();
    const windowStart = now - windowSec * 1000;

    const multi = redisClient.multi();
    multi.zremrangebyscore(redisKey, 0, windowStart);
    multi.zcard(redisKey);
    multi.zadd(redisKey, now, now.toString());
    multi.expire(redisKey, windowSec);

    const [, count] = await multi.exec() as [[null, number], [null, number], [null, number], [null, number]];
    
    if (count > limit) {
        const retryAfter = Math.ceil((await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES'))[1] / 1000 + windowSec - (now/1000));
        throw new ApiError('rate_limited', 'Too many requests.', 429, { limit, remaining: 0 }, retryAfter);
    }
}


export async function rateLimitByIp(identifier: string, limit: number, window: `${number}${TimeUnit}`): Promise<void> {
    return rateLimit(identifier, limit, window, getIp());
}
