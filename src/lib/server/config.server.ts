
import { z } from 'zod';
import 'dotenv/config';

const optionalString = (schema: z.ZodString) =>
  z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // --- Core ---
  APP_BASE_URL: z.string().url('APP_BASE_URL must be a valid URL.').default('http://localhost:3002'),
  
  // --- PostgreSQL Database ---
  PG_HOST: z.string().min(1, 'PG_HOST is required.'),
  PG_PORT: z.coerce.number().int().positive().default(5432),
  PG_USER: z.string().min(1, 'PG_USER is required.'),
  PG_PASSWORD: z.string().min(1, 'PG_PASSWORD is required.'),
  PG_DATABASE: z.string().min(1, 'PG_DATABASE is required.'),
  DB_SOCKET_PATH: optionalString(z.string()),


  // --- Redis ---
  REDIS_URL: optionalString(z.string().url()),

  // --- Security ---
  SESSION_SECRET_KEY: z.string().min(32, 'SESSION_SECRET_KEY must be at least 32 characters.'),
  PEPPER: z.string().min(16, 'PEPPER must be at least 16 characters.'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters.'),
  COOKIE_NAME: z.string().default('gts_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  LOGIN_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  
  // --- S3-Compatible Storage ---
  S3_ENDPOINT_URL: optionalString(z.string().url()),
  S3_BUCKET_NAME: optionalString(z.string()),
  S3_REGION: optionalString(z.string()),
  S3_ACCESS_KEY_ID: optionalString(z.string()),
  S3_SECRET_ACCESS_KEY: optionalString(z.string()),
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  
  // --- Gemini AI ---
  GEMINI_API_KEY: optionalString(z.string()),
  
  // --- YCLIENTS Integration ---
  UCLIENTS_API_URL: optionalString(z.string().url()),
  UCLIENTS_API_KEY: optionalString(z.string()),
  UCLIENTS_WEBHOOK_SECRET: optionalString(z.string()),
  UCLIENTS_TZ: z.string().default('Europe/Moscow'),

  // --- Business Logic ---
  BOOKING_HOLD_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  BASE_CURRENCY: z.enum(['RUB', 'USD', 'EUR']).default('RUB'),
  DEFAULT_LOCALE: z.enum(['ru', 'en']).default('ru'),

  // --- Analytics ---
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalString(z.string()),
  
  // --- Rate Limiting ---
  RL_BOOKING_DRAFT_LIMIT: z.coerce.number().int().positive().default(10),
  RL_BOOKING_DRAFT_WINDOW: z.coerce.number().int().positive().default(60), // in seconds
  RL_BOOKING_DRAFT_PHONE_LIMIT: z.coerce.number().int().positive().default(5),
  RL_BOOKING_DRAFT_PHONE_WINDOW: z.coerce.number().int().positive().default(300), // in seconds
  RL_BOOKING_HOLD_LIMIT: z.coerce.number().int().positive().default(10),
  RL_BOOKING_HOLD_WINDOW: z.coerce.number().int().positive().default(60), // in seconds
  RL_BOOKING_CONFIRM_LIMIT: z.coerce.number().int().positive().default(10),
  RL_BOOKING_CONFIRM_WINDOW: z.coerce.number().int().positive().default(60), // in seconds
  
  // --- Feature Flags ---
  FEATURE_ACCOUNT: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
  FEATURE_REAL_SMS: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_CAPTCHA: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_JWT_ISSUING: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_I18N: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
  FEATURE_PAYMENTS_ONLINE: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_SEAT_SHARING: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_PARTNER_PORTAL: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_UCLIENTS_ENABLED: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  FEATURE_OPS_CONSOLE: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
});


let envConfig: z.infer<typeof EnvSchema>;

try {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const path = require('path');
      require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
      const parsedFromDotenv = EnvSchema.safeParse(process.env);
      if(!parsedFromDotenv.success) {
        console.error(
            '❌ Invalid environment variables:',
            parsedFromDotenv.error.flatten().fieldErrors
        );
        throw new Error('Invalid environment variables.');
      }
      envConfig = parsedFromDotenv.data;
    } else {
      envConfig = parsed.data;
    }
} catch (error) {
    // Gracefully handle case where env is not set on build servers
    console.warn("Could not parse environment variables. Using empty object as fallback.", error)
    envConfig = {} as z.infer<typeof EnvSchema>;
}


export function getEnv<T extends keyof typeof envConfig>(
  name: T
): (typeof envConfig)[T] {
  return envConfig[name];
}

export type FeatureFlag = 
  | 'FEATURE_ACCOUNT'
  | 'FEATURE_REAL_SMS'
  | 'FEATURE_CAPTCHA'
  | 'FEATURE_JWT_ISSUING'
  | 'FEATURE_I18N'
  | 'FEATURE_PAYMENTS_ONLINE'
  | 'FEATURE_SEAT_SHARING'
  | 'FEATURE_PARTNER_PORTAL'
  | 'FEATURE_UCLIENTS_ENABLED'
  | 'FEATURE_OPS_CONSOLE';


export function getFeature(name: FeatureFlag): boolean {
  return envConfig[name] ?? false;
}
