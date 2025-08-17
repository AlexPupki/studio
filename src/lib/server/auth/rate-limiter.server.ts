'use server';

export interface IRateLimiter {
  check(key: string): Promise<{ success: boolean; remaining?: number }>;
}

const rateLimits = new Map<
  string,
  { count: number; expiry: number; timer?: NodeJS.Timeout }
>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

// This is a simple in-memory rate limiter for demonstration.
// For production, use a distributed solution like Redis.
export class InMemoryRateLimiter implements IRateLimiter {
  async check(key: string): Promise<{ success: boolean; remaining?: number }> {
    const now = Date.now();
    let record = rateLimits.get(key);

    if (!record || record.expiry < now) {
      record = { count: 0, expiry: now + WINDOW_MS };
       if (record.timer) {
         clearTimeout(record.timer);
       }
       record.timer = setTimeout(() => {
           rateLimits.delete(key);
       }, WINDOW_MS);
    }
    
    record.count++;
    rateLimits.set(key, record);

    if (record.count > MAX_REQUESTS) {
      return { success: false, remaining: 0 };
    }

    return { success: true, remaining: MAX_REQUESTS - record.count };
  }
}
