'use server';

import type { Session } from '@/lib/shared/iam.contracts';
import { createDbService, type DbService } from '../db/db.service';

export interface SessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

class DbSessionStore implements SessionStore {
  private readonly key = 'sessions';
  constructor(private db: DbService) {}

  private async getAllSessions(): Promise<Record<string, Session>> {
    return this.db.get<Record<string, Session>>(this.key, {});
  }

  async get(sessionId: string): Promise<Session | null> {
    const sessions = await this.getAllSessions();
    return sessions[sessionId] || null;
  }

  async set(sessionId: string, session: Session): Promise<void> {
    const sessions = await this.getAllSessions();
    sessions[sessionId] = session;
    await this.db.set(this.key, sessions);
  }

  async delete(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    delete sessions[sessionId];
    await this.db.set(this.key, sessions);
  }
}

export function createSessionStore(): SessionStore {
    // In a real app, this could be a RedisSessionStore for better performance
    return new DbSessionStore(createDbService());
}
