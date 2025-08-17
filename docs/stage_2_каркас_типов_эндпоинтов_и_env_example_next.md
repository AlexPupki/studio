# Stage 2 — Каркас типов, эндпоинтов и `.env.example`

> **Высокоуровневые цели:** Этот документ является техническим дополнением к основному плану этапа, описанному в [./stage_2_playbook.md](./stage_2_playbook.md).
>
> Базируется на: реализация Stage 1 (auth по телефону, cookie-сессии, server actions) + обновлённый Blueprint (v2). Ниже — минимально жизнеспособный каркас для публичного каталога/слотов/бронирования (draft→hold→invoice), операторских действий и CI.

---

## 📁 Рекомендуемая структура проекта

```
src/
  app/
    api/
      public/
        catalog/
          routes/route.ts            # GET /api/public/catalog/routes
        routes/[slug]/route.ts       # GET /api/public/routes/{slug}
        availability/route.ts        # GET /api/public/availability
      booking/
        draft/route.ts               # POST /api/booking/draft
        hold/route.ts                # POST /api/booking/hold
      billing/
        invoices/[code]/route.ts     # GET /api/billing/invoices/{code}
        invoices/[code]/pdf/route.ts # GET /api/billing/invoices/{code}/pdf (Signed URL)
      ops/                           # ЗАЩИЩЕНО MIDDLEWARE
        bookings/route.ts            # GET/POST (mark-payment-received)
        bookings/[id]/route.ts       # GET/POST/DELETE (деталь/отмена)
        slots/route.ts               # GET (календарь v0)
        slots/generate/route.ts      # POST (генерация по шаблону)
      jobs/                          # ЗАЩИЩЕНО HMAC/IAP
        holds/expire/route.ts        # POST /api/jobs/holds/expire (для Cloud Scheduler)
  domain/
    types.ts                         # Доменные типы (RU/EN i18n implied)
  services/
    price.server.ts                  # Сервис цен v0
    booking.server.ts                # Draft/Hold/Confirm с транзакциями
    invoice.server.ts                # Инвойсы + PDF метаданные
    pdf.server.ts                    # Рендер PDF (react-pdf) → GCS
    notifications.server.ts          # Шина уведомлений (stub)
  lib/
    env.server.ts                    # Zod-валидация ENV
    idempotency.server.ts            # Idempotency-Key (реализация на Redis)
    rateLimit.server.ts              # Rate limit (реализация на Redis)
    i18n.ts                          # Локализация (минимум RU/EN)
    gcs.server.ts                    # Signed URL v4 (чтение/запись)
    phone.server.ts                  # Валидация E.164 (libphonenumber-js)
  schemas/
    booking.ts                       # Zod DTO (request/response)
    catalog.ts                       # Zod DTO (route/slot/availability)
  tests/
    integration/booking.spec.ts      # vitest: конкурентный hold
    e2e/booking.spec.ts              # Playwright: маршрут→слот→draft→hold→invoice

.github/
  workflows/ci.yml                   # GitHub Actions (lint,typecheck,test,build)
middleware.ts                        # Защита /api/ops/*
.env.example                         # Переменные окружения (см. ниже)
```

---

## 🧩 Доменные типы (`src/domain/types.ts`)

```ts
// src/domain/types.ts
export type Locale = 'ru' | 'en';

export type Route = {
  id: string;
  slug: string; // Каноничный, непереводимый
  title_i18n: Record<Locale, string>;
  intro_i18n?: Record<Locale, string>;
  duration_min: number;
  capacity: number;
  meeting_instructions_i18n?: Record<Locale, string>;
  gallery?: string[];
  status: 'active' | 'inactive';
};

export type SlotState = 'planned' | 'held' | 'confirmed' | 'locked_maintenance' | 'done';
export type Slot = {
  id: string;
  route_id: string;
  asset_unit_id?: string | null;
  start_at: string; // ISO, UTC
  end_at: string;   // ISO, UTC
  capacity_total: number;
  capacity_held: number;
  capacity_confirmed: number;
  state: SlotState;
};

export type PriceValue = { kind: 'abs' | 'percent'; amount: number; per: 'total' | 'per_pax' };
export type PriceRule = {
  id: string;
  scope: 'route' | 'asset' | 'date_range' | 'dow' | 'time_range' | 'pax';
  condition: Record<string, unknown>;
  value: PriceValue;
  priority: number;
  valid_from?: string; // ISO, UTC
  valid_to?: string;   // ISO, UTC
  label_i18n?: Record<Locale, string>;
};

export type BookingState = 'draft' | 'on_hold' | 'confirmed' | 'canceled';
export type Booking = {
  id: string;
  code: string; // Уникальный, base32, 8 символов
  state: BookingState;
  client_phone: string; // E.164
  client_name?: string;
  locale: Locale;
  slot_id: string;
  pax_count: number;
  price_total_minor_units: number; // В копейках/центах
  price_breakdown_json: unknown;
  hold_expires_at?: string; // ISO, UTC
  cancel_reason?: string;
  created_at: string; // ISO, UTC
  updated_at: string; // ISO, UTC
};

export type InvoiceStatus = 'pending' | 'received' | 'refunded';
export type Invoice = {
  id: string;
  booking_id: string;
  number: string; // INV-YYYYMM-####
  amount_total_minor_units: number;
  currency: 'RUB' | 'EUR' | 'USD';
  status: InvoiceStatus;
  due_at: string;   // ISO, UTC
  pdf_key?: string; // путь в GCS
  raw_payload_json?: unknown;
};

export type Notification = {
  id: string;
  type: 'booking_hold_placed' | 'hold_expired' | 'payment_received' | 'booking_confirmed';
  channel: 'email' | 'sms' | 'wa' | 'stub';
  to: { phone?: string; email?: string; wa?: string };
  locale: Locale;
  template_key: string;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
  payload_json?: unknown;
};

export type AuditEvent = {
  ts: string; // ISO
  trace_id?: string;
  user_id?: string | null;
  booking_id?: string | null;
  event:
    | 'BookingDrafted'
    | 'HoldPlaced'
    | 'HoldExpired'
    | 'PaymentReceived'
    | 'BookingConfirmed'
    | 'BookingCanceled'
    | 'InvoicePdfGenerated'
    | 'NotificationSent'
    | 'NotificationFailed'
    | 'OpsAccessDenied';
  ip?: string;
  ua?: string;
  meta?: Record<string, unknown>;
};
```

---

## ✅ Zod-валидация ENV (`src/lib/env.server.ts`)

```ts
// src/lib/env.server.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url(),

  // Feature flags
  FEATURE_PUBLIC_SITE: z.coerce.boolean().default(true),
  FEATURE_I18N: z.coerce.boolean().default(true),
  FEATURE_PAYMENTS_ONLINE: z.coerce.boolean().default(false),
  FEATURE_OPS_CONSOLE: z.coerce.boolean().default(true),
  FEATURE_SEAT_SHARING: z.coerce.boolean().default(false),

  // Secrets & storage
  COOKIE_SECRET_CURRENT: z.string().min(32),
  COOKIE_SECRET_PREV: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(), // Обязателен, если FEATURE_OPS_CONSOLE=true для API
  CRON_SECRET: z.string().min(32), // Секрет для проверки вызовов от Cloud Scheduler

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(), // Обязателен для production

  // GCS
  GCS_BUCKET: z.string(),
  GCS_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  GOOGLE_CLOUD_PROJECT: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().min(10).refine(s => s.startsWith('{'), 'Must be a valid JSON string'),

  // Notifications (stub/real)
  SMTP_URL: z.string().optional(),

  // Rate limits / Idempotency
  RL_PUBLIC_DRAFT_PER_MIN: z.coerce.number().int().positive().default(30),
  RL_PUBLIC_HOLD_PER_MIN: z.coerce.number().int().positive().default(20),
  IDEMPOTENCY_TTL_SEC: z.coerce.number().int().positive().default(600),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('ENV validation error:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid ENV configuration');
  }
  return parsed.data as unknown as AppEnv;
})();
```

---

## 🔒 Защита эндпоинтов (`middleware.ts`, `route.ts`)

**Middleware для `/api/ops/*`:**
```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth/auth.actions'; // предполагая наличие такой функции

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/ops')) {
    const user = await getCurrentUser(); // Ваша логика получения пользователя из сессии
    // @ts-ignore
    if (!user || user.role !== 'Operator') {
      // Логирование события аудита
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/api/ops/:path*'] };
```

**Защита cron-джобы:**
```ts
// src/app/api/jobs/holds/expire/route.ts
import { NextRequest } from 'next/server';
import { env } from '@/lib/env.server';

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (env.CRON_SECRET !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... логика обработки
  return Response.json({ ok: true });
}
```

---

## 🧪 Zod-схемы DTO (`src/schemas/*.ts`)

```ts
// src/schemas/catalog.ts
import { z } from 'zod';

export const AvailabilityQuerySchema = z.object({
  routeId: z.string(),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  pax: z.coerce.number().int().positive().default(1),
  lang: z.enum(['ru', 'en']).default('ru'),
});
```

```ts
// src/schemas/booking.ts
import { z } from 'zod';

// Для валидации на сервере используем более строгую схему E.164
const PhoneSchema = z.string().refine(val => /^\+[1-9]\d{1,14}$/.test(val), {
  message: "Invalid E.164 phone number format"
});

export const DraftRequestSchema = z.object({
  routeId: z.string(),
  slotId: z.string(),
  pax: z.coerce.number().int().positive(),
  phone: z.string().min(10), // На клиенте может быть менее строгая
  name: z.string().optional(),
  locale: z.enum(['ru', 'en']).default('ru'),
});

export const HoldRequestSchema = z.object({
  bookingDraftId: z.string().optional(),
  data: DraftRequestSchema.optional(),
  consent: z.boolean().refine(Boolean, 'consent required'),
});
```

---

## 📦 Сервис бронирования (`src/services/booking.server.ts`)

```ts
// src/services/booking.server.ts
import { randomUUID } from 'node:crypto'; // Явный импорт
import type { Booking } from '@/domain/types';
import { getQuote } from './price.server';
import { db } from '@/lib/server/db'; // Пример импорта DB-адаптера

export async function placeHold(bookingIdOrData: /*...*/) {
  // ПСЕВДОКОД ТРАНЗАКЦИИ
  return db.transaction(async (tx) => {
    // 1. Блокируем слот от конкурентных изменений
    const slot = await tx.query('SELECT * FROM slot WHERE id=$1 FOR UPDATE', [slotId]);

    // 2. Проверяем инвариант вместимости
    if ((slot.held + slot.confirmed + pax) > slot.total) {
      throw new Error('slot_overbooked');
    }

    // 3. Обновляем слот и бронирование
    await tx.query('UPDATE slot SET held = held + $1 WHERE id=$2', [pax, slotId]);
    const booking = await tx.query('UPDATE booking SET state="on_hold", hold_expires_at=... WHERE id=$1 RETURNING *', [bookingId]);

    return { booking, invoiceUrl: `/invoice/${booking.code}` };
  });
}
```

---

## 🌐 Эндпоинты (Next.js App Router)

### `POST /api/booking/hold` — резервирование (on\_hold)

```ts
// src/app/api/booking/hold/route.ts
import { NextRequest } from 'next/server';
import { HoldRequestSchema } from '@/schemas/booking';
import { withIdempotency } from '@/lib/idempotency.server';
import { rateLimit } from '@/lib/rateLimit.server';
import { placeHold } from '@/services/booking.server';

// Фиксация runtime для гарантии доступа к Node.js API
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const idemKey = req.headers.get('idempotency-key') || undefined;
  const ip = req.headers.get('x-forwarded-for') || 'ip';
  const rl = await rateLimit(`hold:${ip}`, 20, 60_000);
  if (!rl.allowed) return Response.json({ error: 'rate_limited' }, { status: 429 });

  return withIdempotency(idemKey, async () => {
    const body = await req.json();
    const parsed = HoldRequestSchema.safeParse(body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.format() } };

    // ... вызов placeHold
  });
}
```

### `GET /api/public/catalog/routes` — список маршрутов с кешированием

```ts
// src/app/api/public/catalog/routes/route.ts
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const data = [/* ... */];
  return Response.json({ routes: data }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
```

---

## ⚙️ CI (GitHub Actions) — `.github/workflows/ci.yml`

```yaml
# ...
    env:
      NODE_ENV: test
      APP_BASE_URL: https://example.test
      COOKIE_SECRET_CURRENT: test_cookie_secret_32_bytes_min________
      CRON_SECRET: test_cron_secret_32_bytes_min__________
      DATABASE_URL: postgres://test:test@localhost:5432/test
      REDIS_URL: redis://localhost:6379
      GCS_BUCKET: gts-mvp-media-euw4
      # Валидный, но фейковый JSON для прохождения Zod-валидации в CI
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{"type":"service_account","project_id":"dummy-project","private_key_id":"dummy","private_key":"dummy","client_email":"dummy@example.com","client_id":"dummy","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/dummy%40example.com"}'
# ...
```

---

## 🔐 `.env.example`

```dotenv
# App
NODE_ENV=development
APP_BASE_URL=http://localhost:3000

# Feature Flags
FEATURE_PUBLIC_SITE=true
# ...

# Secrets
COOKIE_SECRET_CURRENT=change_me_to_long_random_32+_chars
COOKIE_SECRET_PREV=
JWT_SECRET=
CRON_SECRET=change_me_to_a_secure_random_string_for_cron

# Data Stores
DATABASE_URL=postgres://user:pass@localhost:5432/gts
REDIS_URL=redis://localhost:6379

# Google Cloud Storage
GCS_BUCKET=gts-mvp-media-euw4
# ...
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```
