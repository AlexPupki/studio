
'use server';

import { z } from 'zod';

const optionalString = (schema: z.ZodString) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(), // Optional during build
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: optionalString(
    z.string().min(32, 'JWT_SECRET must be at least 32 characters long')
  ),
  GCS_BUCKET: z.string().min(1).optional(),
  BASE_CURRENCY: z.enum(['RUB', 'USD', 'EUR']).default('RUB'),
  DEFAULT_LOCALE: z.enum(['ru', 'en']).default('ru'),
  SESSION_SECRET_KEY: optionalString(
    z.string().min(32, 'SESSION_SECRET_KEY must be at least 32 characters long')
  ),
  PEPPER: optionalString(
    z.string().min(16, 'PEPPER must be at least 16 characters long')
  ),
  COOKIE_NAME: z.string().default('gts_session'),
  SESSION_TTL_DAYS: z.string().default('30'),
  CRON_SECRET: optionalString(
    z.string().min(32, 'CRON_SECRET must be at least 32 characters long')
  ),

  // YCLIENTS Integration
  UCLIENTS_API_URL: z.string().url().optional(),
  UCLIENTS_API_KEY: z.string().min(1).optional(),
  UCLIENTS_WEBHOOK_SECRET: z.string().min(1).optional(),
  UCLIENTS_TZ: z.string().default('Europe/Moscow'),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid server environment variables:',
    parsedEnv.error.flatten().fieldErrors
  );
  throw new Error('Invalid server environment variables.');
}

const envConfig = parsedEnv.data;

export function getEnv<T extends keyof typeof envConfig>(
  name: T
): (typeof envConfig)[T] {
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
  FEATURE_PAYMENTS_ONLINE:
    process.env.FEATURE_PAYMENTS_ONLINE === 'true', // default: false

  // Booking
  FEATURE_SEAT_SHARING:
    process.env.FEATURE_SEAT_SHARING === 'true', // default: false

  // Partners
  FEATURE_PARTNER_PORTAL:
    process.env.FEATURE_PARTNER_PORTAL === 'true', // default: false

  // Integrations
  FEATURE_UCLIENTS_ENABLED:
    process.env.FEATURE_UCLIENTS_ENABLED === 'true', // default: false
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function getFeature(name: FeatureFlag): boolean {
  return featureFlags[name] ?? false;
}
