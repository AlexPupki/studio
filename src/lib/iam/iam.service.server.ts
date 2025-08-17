'use server';

/**
 * @fileoverview Это основной сервисный слой для домена IAM.
 * Он инкапсулирует бизнес-логику, связанную с пользователями,
 * кодами входа и аудитом, в соответствии с playbook.
 */
import 'server-only';
import { createHash, createHmac, randomInt } from 'crypto';
import { IDatabaseService, LoginCode, User } from '../database/db.contracts';
import { createDbService } from '../database/db.service.server';
import { ISmsProvider, createSmsProvider } from './sms.provider.server';
import { IAnalyticsService, createAnalyticsService } from '../analytics/analytics.service.server';

export interface IIamService {
  findOrCreateUser(phoneE164: string): Promise<User>;
  requestLoginCode(phoneE164: string): Promise<{ success: boolean; error?: string }>;
  verifyLoginCode(phoneE164: string, code: string): Promise<{ success: boolean; user?: User; loginCode?: LoginCode, error?: string }>;
}

class IamService implements IIamService {
  private db: IDatabaseService;
  private sms: ISmsProvider;
  private analytics: IAnalyticsService;
  private otpPepper: string;

  constructor(db: IDatabaseService, sms: ISmsProvider, analytics: IAnalyticsService, otpPepper: string) {
    this.db = db;
    this.sms = sms;
    this.analytics = analytics;
    this.otpPepper = otpPepper;
  }

  private generateCode(): string {
    return randomInt(100000, 999999).toString();
  }

  private hashLoginCode(phone: string, code: string, issuedAt: string): string {
    const hmac = createHmac('sha256', this.otpPepper);
    hmac.update(`${phone}|${code}|${issuedAt}`);
    return hmac.digest('hex');
  }

  async findOrCreateUser(phoneE164: string): Promise<User> {
    let user = await this.db.findUserByPhone(phoneE164);
    if (!user) {
      user = await this.db.createUser({ phoneE164 });
      this.analytics.track('new_user_registered', { userId: user.id, phone: phoneE164 });
    }
    return user;
  }

  async requestLoginCode(phoneE164: string): Promise<{ success: boolean; error?: string }> {
    await this.findOrCreateUser(phoneE164);

    const code = this.generateCode();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000); // 5 минут

    const codeHash = this.hashLoginCode(phoneE164, code, issuedAt.toISOString());

    await this.db.createLoginCode({
      phoneE164,
      codeHash,
      expiresAt: expiresAt.toISOString(),
      issuedAt: issuedAt.toISOString(),
    });

    await this.sms.sendCode(phoneE164, code);
    
    this.analytics.track('login_code_requested', { phone: phoneE164 });

    return { success: true };
  }

  async verifyLoginCode(phoneE164: string, code: string): Promise<{ success: boolean; user?: User; loginCode?: LoginCode, error?: string }> {
    const loginCode = await this.db.findActiveLoginCode(phoneE164);

    if (!loginCode || loginCode.attempts >= 5) {
      this.analytics.track('login_code_failed', { phone: phoneE164, reason: 'not_found_or_attempts_exceeded' });
      return { success: false, error: 'Код недействителен или истек. Запросите новый.' };
    }
    
    const codeHash = this.hashLoginCode(phoneE164, code, loginCode.issuedAt);

    if (codeHash !== loginCode.codeHash) {
      await this.db.incrementLoginCodeAttempts(loginCode.id);
      this.analytics.track('login_code_failed', { phone: phoneE164, reason: 'invalid_code' });
      return { success: false, error: 'Неверный код подтверждения.' };
    }
    
    // Инвалидируем код после успешного использования
    await this.db.invalidateLoginCode(loginCode.id);

    const user = await this.findOrCreateUser(phoneE164);
    await this.db.updateUserLastLogin(user.id);
    
    this.analytics.track('login_code_verified', { userId: user.id, phone: phoneE164 });

    return { success: true, user, loginCode };
  }
}

// --- Service Factory ---

let iamServiceInstance: IIamService | null = null;

export async function createIamService(): Promise<IIamService> {
  if (iamServiceInstance) {
    return iamServiceInstance;
  }
  
  const otpPepper = process.env.SESSION_SECRET_KEY; // Используем тот же секрет для перца
  if (!otpPepper) throw new Error('SESSION_SECRET_KEY is not set for OTP pepper');

  const db = await createDbService();
  const sms = await createSmsProvider();
  const analytics = await createAnalyticsService();

  iamServiceInstance = new IamService(db, sms, analytics, otpPepper);
  return iamServiceInstance;
}
