
import { z } from 'zod';

const optionalString = (schema: z.ZodString) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url('APP_BASE_URL must be a valid URL.').default('http://localhost:3000'),

  // --- Database (PostgreSQL) ---
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  DB_SOCKET_PATH: optionalString(z.string()), // For Cloud SQL connections from App Hosting/Run

  // --- Authentication & Security ---
  SESSION_SECRET_KEY: optionalString(z.string().min(32, 'SESSION_SECRET_KEY must be at least 32 characters.')),
  PEPPER: optionalString(z.string().min(16, 'PEPPER must be at least 16 characters.')),
  JWT_SECRET: optionalString(z.string().min(32, 'JWT_SECRET must be at least 32 characters.')),
  CRON_SECRET: optionalString(z.string().min(32, 'CRON_SECRET must be at least 32 characters.')),
  COOKIE_NAME: z.string().default('gts_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // --- Google Cloud Storage ---
  GCS_BUCKET: optionalString(z.string()),
  // GOOGLE_APPLICATION_CREDENTIALS_JSON is read directly by the SDK, so we check for its presence
  GOOGLE_APPLICATION_CREDENTIALS: optionalString(z.string()),

  // --- Google AI (Gemini) ---
  GEMINI_API_KEY: optionalString(z.string()),
  
  // --- YCLIENTS Integration ---
  UCLIENTS_API_URL: optionalString(z.string().url()),
  UCLIENTS_API_KEY: optionalString(z.string()),
  UCLIENTS_WEBHOOK_SECRET: optionalString(z.string()),
  UCLIENTS_TZ: z.string().default('Europe/Moscow'),

  // --- Other ---
  BASE_CURRENCY: z.enum(['RUB', 'USD', 'EUR']).default('RUB'),
  DEFAULT_LOCALE: z.enum(['ru', 'en']).default('ru'),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString(z.string()),
});


const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid server environment variables:',
    parsedEnv.error.flatten().fieldErrors
  );
  // Do not throw in test environment to allow for minimal setup
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Invalid server environment variables.');
  }
}

const envConfig = parsedEnv.data as z.infer<typeof EnvSchema>;

export function getEnv<T extends keyof typeof envConfig>(
  name: T
): (typeof envConfig)[T] {
  return envConfig[name];
}

const featureFlags = {
  // IAM
  FEATURE_ACCOUNT: process.env.FEATURE_ACCOUNT !== 'false', // default: true
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
