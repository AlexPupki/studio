'use server';

import { createDbService, type DbService } from '../db/db.service.server';
import {
  createSessionStore,
  type SessionStore,
} from './session-store.server';
import {
  type User,
  type LoginCode,
  type Session,
  type IamService,
  type VerifyResult,
} from '@/lib/shared/iam.contracts';
import { createHash, createHmac, randomInt } from 'crypto';
import { getEnv, getFeature } from '../config.server';
import type { ISmsProvider } from '@/lib/shared/sms.contracts';
import { InMemoryRateLimiter, type IRateLimiter } from './rate-limiter.server';

// --- Hashing Utility ---
function hash(value: string): string {
  const pepper = getEnv('PEPPER');
  return createHmac('sha256', pepper).update(value).digest('hex');
}


// --- IAM Service ---
class IamServiceImpl implements IamService {
  constructor(private db: DbService) {}

  async findUserByPhone(phoneE164: string): Promise<User | null> {
    const users = await this.db.get<User[]>('users', []);
    return users.find((u) => u.phoneE164 === phoneE164) || null;
  }

  async findUserById(userId: string): Promise<User | null> {
    const users = await this.db.get<User[]>('users', []);
    return users.find((u) => u.id === userId) || null;
  }

  private async createUser(phoneE164: string): Promise<User> {
    const users = await this.db.get<User[]>('users', []);
    const newUser: User = {
      id: `user_${randomInt(10000, 99999)}`,
      phoneE164,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      status: 'active',
      preferredLanguage: 'ru',
      roles: ['customer'],
    };
    users.push(newUser);
    await this.db.set('users', users);
    return newUser;
  }

  async createLoginCode(
    phoneE164: string
  ): Promise<{ user: User; code: string }> {
    let user = await this.findUserByPhone(phoneE164);
    if (!user) {
      user = await this.createUser(phoneE164);
    }

    const loginCodes = await this.db.get<LoginCode[]>('loginCodes', []);
    const code = randomInt(100000, 999999).toString().padStart(6, '0');
    const newLoginCode: LoginCode = {
      id: `code_${randomInt(10000, 99999)}`,
      phoneE164,
      codeHash: hash(code),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      attempts: 0,
    };
    loginCodes.push(newLoginCode);
    await this.db.set('loginCodes', loginCodes);

    return { user, code };
  }

  async verifyLoginCode(input: {
    phoneE164: string;
    code: string;
  }): Promise<VerifyResult> {
    const loginCodes = await this.db.get<LoginCode[]>('loginCodes', []);
    const hashedCode = hash(input.code);

    const loginCode = loginCodes.find(
      (c) =>
        c.phoneE164 === input.phoneE164 &&
        c.codeHash === hashedCode &&
        !c.usedAt
    );

    if (
      !loginCode ||
      new Date(loginCode.expiresAt) < new Date() ||
      loginCode.attempts >= 5
    ) {
      // Increment attempts for the original code if found but invalid
      if(loginCode) {
        loginCode.attempts++;
        await this.db.set('loginCodes', loginCodes);
      }
      return { success: false };
    }

    loginCode.usedAt = new Date().toISOString();
    await this.db.set('loginCodes', loginCodes);

    const user = await this.findUserByPhone(input.phoneE164);
    if (!user) {
      return { success: false }; // Should not happen
    }
    
    user.lastLoginAt = new Date().toISOString();
    const users = await this.db.get<User[]>('users', []);
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
        users[userIndex] = user;
        await this.db.set('users', users);
    }


    return { success: true, user };
  }
}

// --- Session Service ---
interface SessionService {
  create(userId: string): Promise<Session>;
  read(token: string): Promise<Session | null>;
  revoke(token: string): Promise<void>;
  serialize(session: Session): { name: string; value: string; options: any };
  getCookieName(): string;
}

class SessionServiceImpl implements SessionService {
  private cookieName: string;
  constructor(private store: SessionStore) {
    this.cookieName = getEnv('COOKIE_NAME');
  }

  getCookieName(): string {
      return this.cookieName;
  }

  async create(userId: string): Promise<Session> {
    const session = {
      id: `sid_${randomInt(10000, 99999)}`,
      userId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(
        Date.now() + parseInt(getEnv('SESSION_TTL_DAYS')) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
    await this.store.set(session.id, session);
    return session;
  }

  async read(token: string): Promise<Session | null> {
    const session = await this.store.get(token);
    if (!session || new Date(session.expiresAt) < new Date() || session.revokedAt) {
      return null;
    }
    return session;
  }

  async revoke(token: string): Promise<void> {
    const session = await this.store.get(token);
    if (session) {
      session.revokedAt = new Date().toISOString();
      await this.store.set(token, session);
    }
  }

  serialize(session: Session) {
    return {
      name: this.cookieName,
      value: session.id, // In a real app, this would be a JWT or encrypted token
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(session.expiresAt),
        sameSite: 'lax' as const,
      },
    };
  }
}

// --- SMS Provider ---
class StubSmsProvider implements ISmsProvider {
  async send(to: string, body: string): Promise<{ sid: string }> {
    console.log('--- STUB SMS PROVIDER ---');
    console.log(`To: ${to}`);
    console.log(`Body: ${body}`);
    console.log('-------------------------');
    return { sid: `stub_${Date.now()}` };
  }
}

class RealSmsProvider implements ISmsProvider {
  async send(to: string, body: string): Promise<{ sid: string }> {
    // Integration with a real SMS gateway like Twilio or Vonage would go here
    throw new Error('RealSmsProvider not implemented');
  }
}

// --- Factories ---
export function createIamService(): IamService {
  return new IamServiceImpl(createDbService());
}

export function createSessionService(): SessionService {
  return new SessionServiceImpl(createSessionStore());
}

export function createSmsProvider(): ISmsProvider {
  if (getFeature('FEATURE_REAL_SMS')) {
    return new RealSmsProvider();
  }
  return new StubSmsProvider();
}

export function createRateLimiter(): IRateLimiter {
    // In a real app, you would use a Redis-based rate limiter for production
    return new InMemoryRateLimiter();
}
