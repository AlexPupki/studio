'use server';

// This file is being kept for now in case stateful sessions are needed for other purposes,
// but it is no longer used for the primary authentication flow in middleware.
// For example, it could be used to track active user sessions for an admin dashboard.

import type { Session } from '@/lib/shared/iam.contracts';
import { redisClient } from '../redis';

export interface SessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

class RedisSessionStore implements SessionStore {
  private readonly prefix = 'session:';

  private getTtl(session: Session): number {
    const now = new Date();
    const expires = new Date(session.expiresAt);
    return Math.round((expires.getTime() - now.getTime()) / 1000);
  }

  async get(sessionId: string): Promise<Session | null> {
    const data = await redisClient.get(this.prefix + sessionId);
    return data ? JSON.parse(data) : null;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    const ttl = this.getTtl(session);
    if (ttl > 0) {
        await redisClient.set(
            this.prefix + sessionId, 
            JSON.stringify(session), 
            'EX', 
            ttl
        );
    }
  }

  async delete(sessionId: string): Promise<void> {
    await redisClient.del(this.prefix + sessionId);
  }
}

export function createSessionStore(): SessionStore {
    return new RedisSessionStore();
}
