
import { db } from '../db';
import { users, loginCodes as loginCodesSchema } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { User, VerifyResult } from '@/lib/shared/iam.contracts';
import { createHash, randomInt } from 'crypto';
import { getEnv, getFeature } from '../config.server';
import type { ISmsProvider } from '@/lib/shared/sms.contracts';
import { InMemoryRateLimiter, type IRateLimiter } from './rate-limiter.server';

// --- Hashing Utility ---
function hash(value: string): string {
  const pepper = getEnv('PEPPER');
  if (!pepper) {
      throw new Error('PEPPER environment variable is not set.');
  }
  return createHash('sha256').update(value + pepper).digest('hex');
}


// --- IAM Service ---
export interface IamService {
  findUserByPhone(phoneE164: string): Promise<User | null>;
  createLoginCode(
    phoneE164: string
  ): Promise<{ user: User; code: string }>;
  verifyLoginCode(input: {
    phoneE164: string;
    code: string;
  }): Promise<VerifyResult>;
  findUserById(userId: string): Promise<User | null>;
}


class IamServiceImpl implements IamService {
  
  async findUserByPhone(phoneE164: string): Promise<User | null> {
    return await db.query.users.findFirst({
      where: eq(users.phoneE164, phoneE164)
    }) || null;
  }

  async findUserById(userId: string): Promise<User | null> {
     return await db.query.users.findFirst({
      where: eq(users.id, userId)
    }) || null;
  }

  private async createUser(phoneE164: string): Promise<User> {
     const [newUser] = await db.insert(users).values({
        phoneE164,
        status: 'active',
        preferredLanguage: getEnv('DEFAULT_LOCALE'),
        roles: ['customer']
     }).returning();
     return newUser;
  }

  async createLoginCode(
    phoneE164: string
  ): Promise<{ user: User; code: string }> {
    let user = await this.findUserByPhone(phoneE164);
    if (!user) {
      user = await this.createUser(phoneE164);
    }

    const code = randomInt(100000, 999999).toString().padStart(6, '0');
    
    await db.insert(loginCodesSchema).values({
        phoneE164,
        codeHash: hash(code),
        expiresAt: new Date(Date.now() + getEnv('LOGIN_CODE_TTL_MINUTES') * 60 * 1000), 
    });

    return { user, code };
  }

  async verifyLoginCode(input: {
    phoneE164: string;
    code: string;
  }): Promise<VerifyResult> {
    const hashedCode = hash(input.code);

    const loginCode = await db.query.loginCodes.findFirst({
        where: and(
            eq(loginCodesSchema.phoneE164, input.phoneE164),
            eq(loginCodesSchema.codeHash, hashedCode),
            eq(loginCodesSchema.used, false),
            gt(loginCodesSchema.expiresAt, new Date()),
        )
    });


    if (!loginCode) {
      // Could increment an attempt counter here to prevent brute-force
      return { success: false };
    }
    
    await db.update(loginCodesSchema).set({ used: true }).where(eq(loginCodesSchema.id, loginCode.id));

    const user = await this.findUserByPhone(input.phoneE164);
    if (!user) {
      // Should not happen if createLoginCode works correctly
      return { success: false }; 
    }
    
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return { success: true, user };
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
  return new IamServiceImpl();
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
