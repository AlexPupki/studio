'use server';

import { z } from 'zod';
import type { FeatureFlag } from '@/lib/shared/config';

const featureFlags = {
  // IAM
  FEATURE_ACCOUNT: process.env.FEATURE_ACCOUNT !== 'false', // default: true
  FEATURE_REAL_SMS: process.env.FEATURE_REAL_SMS === 'true', // default: false
  FEATURE_CAPTCHA: process.env.FEATURE_CAPTCHA === 'true', // default: false
  FEATURE_JWT_ISSUING: process.env.FEATURE_JWT_ISSUING === 'true', // default: false
  
  // i18n
  FEATURE_I18N: process.env.FEATURE_I18N !== 'false', // default: true
  
  // Payments
  FEATURE_PAYMENTS_ONLINE: process.env.FEATURE_PAYMENTS_ONLINE === 'true', // default: false

  // Booking
  FEATURE_SEAT_SHARING: process.env.FEATURE_SEAT_SHARING === 'true', // default: false

  // Partners
  FEATURE_PARTNER_PORTAL: process.env.FEATURE_PARTNER_PORTAL === 'true', // default: false
} as const;


export function getFeature(name: FeatureFlag): boolean {
  return featureFlags[name] ?? false;
}

const EnvSchema = z.object({
    SESSION_SECRET_KEY: z.string().min(32, "SESSION_SECRET_KEY must be at least 32 characters long").default('default-secret-key-for-session-32-chars'),
    PEPPER: z.string().min(16, "PEPPER must be at least 16 characters long").default('default-pepper-for-hashing-16-chars'),
    COOKIE_NAME: z.string().default('gts_session'),
    SESSION_TTL_DAYS: z.string().default('30'),
    CRON_SECRET: z.string().min(32).default('default-cron-secret-for-development-32-chars-long'),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsedEnv.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables.");
}

const envConfig = parsedEnv.data;

export function getEnv(name: keyof typeof envConfig) {
    return envConfig[name];
}
