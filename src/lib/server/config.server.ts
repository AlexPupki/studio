'use server';

import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  GCS_BUCKET: z.string().min(1),
  BASE_CURRENCY: z.enum(['RUB', 'USD', 'EUR']).default('RUB'),
  DEFAULT_LOCALE: z.enum(['ru', 'en']).default('ru'),
  SESSION_SECRET_KEY: z.string().min(32, "SESSION_SECRET_KEY must be at least 32 characters long"),
  PEPPER: z.string().min(16, "PEPPER must be at least 16 characters long"),
  COOKIE_NAME: z.string().default('gts_session'),
  SESSION_TTL_DAYS: z.string().default('30'),
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

const featureFlags = {
  // IAM
  FEATURE_ACCOUNT: process.env.FEATURE_ACCOUNT === 'true', // default: true
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

export type FeatureFlag = keyof typeof featureFlags;

export function getFeature(name: FeatureFlag): boolean {
  return featureFlags[name] ?? false;
}
