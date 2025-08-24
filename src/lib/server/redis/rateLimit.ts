
'use server';
import { redisClient } from '.';
import { getIp } from '../http/ip';
import { ApiError } from '../http/errors';

/**
 * Limits the rate of requests for a given identifier within a sliding window.
 * Throws an ApiError if the rate limit is exceeded.
 * @param identifier A unique identifier for the action being rate-limited.
 * @param limit The maximum number of requests allowed within the window.
 * @param windowSec The time window in seconds.
 * @param key (Optional) A specific key to rate limit on (e.g., userId, phone number). Defaults to the client's IP address.
 */
export async function rateLimit(identifier: string, limit: number, windowSec: number, key?: string): Promise<void> {
    // If redis is not configured, bypass rate limiting.
    if (!redisClient) {
        return;
    }

    const targetKey = key || getIp();
    if (!targetKey) {
        // Cannot rate limit if no key is available
        return;
    }
    const redisKey = `rl:${identifier}:${targetKey}`;

    const now = Date.now();
    const windowStart = now - windowSec * 1000;

    const multi = redisClient.multi();
    // Remove timestamps outside the current window
    multi.zremrangebyscore(redisKey, 0, windowStart);
    // Get the number of requests in the current window
    multi.zcard(redisKey);
    // Add the current request timestamp
    multi.zadd(redisKey, now, now.toString());
    // Set the key to expire after the window duration
    multi.expire(redisKey, windowSec);

    const results = await multi.exec();
    
    // The count of requests is the result of the ZCARD command.
    // In ioredis' multi.exec(), results is an array of [error, result] tuples.
    const count = results?.[1]?.[1] as number | undefined ?? 0;

    if (count > limit) {
        // Find the timestamp of the oldest request to calculate Retry-After
        const oldestRequest = await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldestRequest.length > 1 ? parseFloat(oldestRequest[1]) : now;
        const retryAfter = Math.ceil((oldestTimestamp / 1000 + windowSec) - (now / 1000));
        
        throw new ApiError('RATE_LIMITED', 'Too many requests.', 429, { limit, remaining: 0 }, retryAfter);
    }
}


export async function rateLimitByIp(identifier: string, limit: number, windowSec: number): Promise<void> {
    return rateLimit(identifier, limit, windowSec, getIp());
}
