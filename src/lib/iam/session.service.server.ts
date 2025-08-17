// src/lib/iam/session.service.server.ts
'use server';

/**
 * @fileoverview Этот файл отвечает за управление сессиями: создание,
 * шифрование (sealing), расшифровка (unsealing) и инвалидация.
 */
import { randomBytes, createCipheriv, createDecipheriv, createHmac } from 'crypto';
import { Session, User } from '../database/db.contracts';
import { createDbService } from '../database/db.service.server';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

export interface SessionServiceConfig {
    secretKey: string;
    cookieName: string;
}

export interface ISessionService {
  createSession(userId: string): Promise<Session>;
  sealSession(session: Session): Promise<string>;
  unsealSession(sealedSession: string): Promise<Session | null>;
  revokeSession(sessionId: string): Promise<void>;
  getActiveSession(sealedSession: string): Promise<Session | null>;
}

class SessionService implements ISessionService {
  private readonly secretKey: Buffer;
  private readonly cookieName: string;

  constructor(config: SessionServiceConfig) {
    if (!config.secretKey || config.secretKey.length < 32) {
      throw new Error('SESSION_SECRET_KEY must be at least 32 characters long.');
    }
    this.secretKey = Buffer.from(config.secretKey);
    this.cookieName = config.cookieName;
  }

  async createSession(userId: string): Promise<Session> {
    const db = await createDbService();
    const sessionTtlDays = parseInt(process.env.SESSION_TTL_DAYS || '30', 10);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + sessionTtlDays * 24 * 60 * 60 * 1000);
    
    const newSession = await db.createSession({
        userId,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
    });
    
    return newSession;
  }
  
  async revokeSession(sessionId: string): Promise<void> {
    const db = await createDbService();
    await db.revokeSession(sessionId);
  }

  async sealSession(session: Session): Promise<string> {
    const iv = randomBytes(IV_LENGTH);
    const salt = randomBytes(SALT_LENGTH);
    
    const cipher = createCipheriv(ALGORITHM, this.secretKey, iv, {
      authTagLength: TAG_LENGTH
    });
    
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
  }

  async unsealSession(sealedSession: string): Promise<Session | null> {
    try {
      const data = Buffer.from(sealedSession, 'hex');
      const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
      const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = data.subarray(ENCRYPTED_POSITION);

      const decipher = createDecipheriv(ALGORITHM, this.secretKey, iv);
      decipher.setAuthTag(tag);

      const decrypted = decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
      
      return JSON.parse(decrypted) as Session;
    } catch (error) {
      console.error('Failed to unseal session:', error);
      return null;
    }
  }

  async getActiveSession(sealedSession: string): Promise<Session | null> {
      const session = await this.unsealSession(sealedSession);
      if (!session) return null;
      
      const db = await createDbService();
      const dbSession = await db.findSessionById(session.id);

      if (!dbSession || dbSession.revokedAt || new Date(dbSession.expiresAt) < new Date()) {
          return null;
      }

      return dbSession;
  }
}

// --- Service Factory ---

let sessionServiceInstance: ISessionService | null = null;

export async function createSessionService(config?: SessionServiceConfig): Promise<ISessionService> {
  if (sessionServiceInstance) {
    return sessionServiceInstance;
  }
  
  if (!config) {
      const secretKey = process.env.SESSION_SECRET_KEY;
      if (!secretKey) throw new Error('SESSION_SECRET_KEY is not set');

      const cookieName = process.env.COOKIE_NAME || 'gts.sid';
      config = { secretKey, cookieName };
  }

  sessionServiceInstance = new SessionService(config);
  return sessionServiceInstance;
}
