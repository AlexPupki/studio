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
      ops/
        bookings/route.ts            # GET/POST (mark-payment-received)
        bookings/[id]/route.ts       # GET/POST/DELETE (деталь/отмена)
        slots/route.ts               # GET (календарь v0)
        slots/generate/route.ts      # POST (генерация по шаблону)
  domain/
    types.ts                         # Доменные типы (RU/EN i18n implied)
  services/
    price.server.ts                  # Сервис цен v0
    booking.server.ts                # Draft/Hold/Confirm
    invoice.server.ts                # Инвойсы + PDF метаданные
    pdf.server.ts                    # Рендер PDF → GCS
    notifications.server.ts          # Шина уведомлений (stub)
  lib/
    env.server.ts                    # Zod-валидация ENV
    idempotency.server.ts            # Поддержка Idempotency-Key (Redis)
    rateLimit.server.ts              # Rate limit (in-memory/Redis)
    i18n.ts                          # Локализация (минимум RU/EN)
    gcs.server.ts                    # Signed URL v4 (чтение/запись)
  schemas/
    booking.ts                       # Zod DTO (request/response)
    catalog.ts                       # Zod DTO (route/slot/availability)
  tests/
    unit/price.test.ts               # vitest: прайсер
    e2e/booking.spec.ts              # Playwright: маршрут→слот→draft→hold→invoice

.github/
  workflows/ci.yml                   # GitHub Actions (lint,typecheck,test,build)

.env.example                         # Переменные окружения (см. ниже)
```

---

## 🧩 Доменные типы (`src/domain/types.ts`)

```ts
// src/domain/types.ts
export type Locale = 'ru' | 'en';

export type Route = {
  id: string;
  slug: string;
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
  start_at: string; // ISO
  end_at: string;   // ISO
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
  valid_from?: string; // ISO
  valid_to?: string;   // ISO
  label_i18n?: Record<Locale, string>;
};

export type BookingState = 'draft' | 'on_hold' | 'confirmed' | 'canceled';
export type Booking = {
  id: string;
  code: string; // короткий публичный код
  state: BookingState;
  client_phone: string; // E.164
  client_name?: string;
  locale: Locale;
  slot_id: string;
  pax_count: number;
  price_total: number;
  price_breakdown_json: unknown;
  hold_expires_at?: string; // ISO
  cancel_reason?: string;
  created_at: string; // ISO
  updated_at: string; // ISO
};

export type InvoiceStatus = 'pending' | 'received' | 'refunded';
export type Invoice = {
  id: string;
  booking_id: string;
  number: string; // INV-YYYYMM-####
  amount_total: number;
  currency: 'RUB' | 'EUR' | 'USD';
  status: InvoiceStatus;
  due_at: string;   // ISO
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
  user_id?: string | null;
  event:
    | 'BookingDrafted'
    | 'HoldPlaced'
    | 'HoldExpired'
    | 'PaymentReceived'
    | 'BookingConfirmed'
    | 'BookingCanceled'
    | 'InvoicePdfGenerated'
    | 'NotificationSent'
    | 'NotificationFailed';
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
  FEATURE_PUBLIC_SITE: z.string().transform(v => v === 'true').default('true' as any),
  FEATURE_I18N: z.string().transform(v => v === 'true').default('true' as any),
  FEATURE_PAYMENTS_ONLINE: z.string().transform(v => v === 'true').default('false' as any),
  FEATURE_OPS_CONSOLE: z.string().transform(v => v === 'true').default('true' as any),
  FEATURE_SEAT_SHARING: z.string().transform(v => v === 'true').default('false' as any),

  // Secrets & storage
  COOKIE_SECRET_CURRENT: z.string().min(32),
  COOKIE_SECRET_PREV: z.string().min(32).optional(),
  JWT_SECRET: z.string().min(32).optional(),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),

  // GCS
  GCS_BUCKET: z.string(),
  GCS_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  GOOGLE_CLOUD_PROJECT: z.string(),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().min(10), // строка JSON (для CI)

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

## ♻️ Idempotency & Rate Limit (Redis/in-memory)

```ts
// src/lib/idempotency.server.ts
import crypto from 'crypto';
import { env } from './env.server';

// Псевдо-Redis адаптер. Подмените на ioredis при наличии REDIS_URL.
const mem = new Map<string, { body: string; status: number; ts: number }>();
const ttl = env.IDEMPOTENCY_TTL_SEC * 1000;

export async function withIdempotency<T>(
  key: string | undefined,
  fn: () => Promise<{ status: number; body: unknown }>,
): Promise<Response> {
  const normalized = key?.trim() || '';
  const safeKey = normalized || crypto.randomUUID();

  const hit = mem.get(safeKey);
  const now = Date.now();
  if (hit && now - hit.ts < ttl) {
    return new Response(hit.body, { status: hit.status, headers: { 'x-idempotent': 'hit' } });
  }

  const { status, body } = await fn();
  const bodyStr = JSON.stringify(body);
  mem.set(safeKey, { body: bodyStr, status, ts: now });
  return new Response(bodyStr, { status, headers: { 'x-idempotent': 'stored' } });
}
```

```ts
// src/lib/rateLimit.server.ts
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: bucket.resetAt - now };
  }
  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}
```

---

## 🧪 Zod-схемы DTO (`src/schemas/*.ts`)

```ts
// src/schemas/catalog.ts
import { z } from 'zod';

export const AvailabilityQuerySchema = z.object({
  routeId: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  pax: z.coerce.number().int().positive().default(1),
  lang: z.enum(['ru', 'en']).default('ru'),
});
```

```ts
// src/schemas/booking.ts
import { z } from 'zod';

export const DraftRequestSchema = z.object({
  routeId: z.string(),
  slotId: z.string(),
  pax: z.coerce.number().int().positive(),
  phone: z.string().min(6),
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

## 💶 Сервис цен v0 (`src/services/price.server.ts`)

```ts
// src/services/price.server.ts
import type { PriceRule } from '@/domain/types';

export type PriceQuote = {
  total: number;
  breakdown: Array<{ key: string; label?: string; amount: number }>;
};

export async function getQuote(params: {
  routeId: string;
  slotId: string;
  pax: number;
  locale: 'ru' | 'en';
}): Promise<PriceQuote> {
  // TODO: подтянуть base_price для routeId, применить правила (DOW/time_range/etc)
  const base = 5000; // stub
  const perPax = base * params.pax;
  const rules: PriceRule[] = []; // TODO: из БД

  const breakdown = [
    { key: 'base', label: 'Base', amount: perPax },
    // ...добавить корректировки
  ];

  const total = breakdown.reduce((s, i) => s + i.amount, 0);
  return { total, breakdown };
}
```

---

## 📦 Сервис бронирования (`src/services/booking.server.ts`)

```ts
// src/services/booking.server.ts
import type { Booking } from '@/domain/types';
import { getQuote } from './price.server';

export async function draftBooking(input: {
  routeId: string; slotId: string; pax: number; phone: string; name?: string; locale: 'ru'|'en';
}): Promise<{ booking: Booking; quote: { total: number; breakdown: any[] } }> {
  const quote = await getQuote({ routeId: input.routeId, slotId: input.slotId, pax: input.pax, locale: input.locale });

  // TODO: запись в БД как draft (или ephemeral, если решите)
  const booking: Booking = {
    id: crypto.randomUUID(),
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    state: 'draft',
    client_phone: input.phone,
    client_name: input.name,
    locale: input.locale,
    slot_id: input.slotId,
    pax_count: input.pax,
    price_total: quote.total,
    price_breakdown_json: quote.breakdown,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return { booking, quote };
}

export async function placeHold(bookingIdOrData: { bookingId?: string; data?: {
  routeId: string; slotId: string; pax: number; phone: string; name?: string; locale: 'ru'|'en';
} }): Promise<{ booking: Booking; invoiceUrl: string }> {
  // TODO: транзакция: capacity_held++, booking → on_hold, hold_expires_at
  const booking: Booking = {
    id: bookingIdOrData.bookingId || crypto.randomUUID(),
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    state: 'on_hold',
    client_phone: bookingIdOrData.data?.phone || '+70000000000',
    client_name: bookingIdOrData.data?.name,
    locale: bookingIdOrData.data?.locale || 'ru',
    slot_id: bookingIdOrData.data?.slotId || 'slot-1',
    pax_count: bookingIdOrData.data?.pax || 1,
    price_total: 5000,
    price_breakdown_json: [],
    hold_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const invoiceUrl = `/invoice/${booking.code}`; // фронтовый роут
  return { booking, invoiceUrl };
}
```

---

## ✉️ Уведомления (stub) (`src/services/notifications.server.ts`)

```ts
// src/services/notifications.server.ts
export async function sendNotification(params: {
  templateKey: string;
  to: { phone?: string; email?: string; wa?: string };
  locale: 'ru'|'en';
  vars: Record<string, unknown>;
}): Promise<{ id: string }> {
  // TODO: провайдеры (sms/email/wa). Пока — лог.
  console.log('[notify]', params);
  return { id: crypto.randomUUID() };
}
```

---

## 🧾 PDF-инвойсы и GCS (`src/services/pdf.server.ts`, `src/lib/gcs.server.ts`)

```ts
// src/lib/gcs.server.ts
import { env } from './env.server';

export async function getSignedReadUrl(objectKey: string): Promise<string> {
  // TODO: использовать @google-cloud/storage, Signed URL v4, TTL из env
  return `${env.APP_BASE_URL}/stub-gcs/${encodeURIComponent(objectKey)}`;
}
```

```ts
// src/services/pdf.server.ts
export async function ensureInvoicePdf(bookingCode: string): Promise<{ key: string }> {
  // TODO: реальный рендер PDF и upload → GCS
  return { key: `invoices/${bookingCode}.pdf` };
}
```

---

## 🌐 Эндпоинты (Next.js App Router)

### `GET /api/public/catalog/routes` — список маршрутов

```ts
// src/app/api/public/catalog/routes/route.ts
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const data = [{ id: 'r1', slug: 'sea-trip', title_i18n: { ru: 'Морская прогулка', en: 'Sea Trip' }, duration_min: 120, capacity: 8, status: 'active' }];
  return Response.json({ routes: data });
}
```

### `GET /api/public/routes/{slug}` — деталь маршрута

```ts
// src/app/api/public/routes/[slug]/route.ts
import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  // TODO: fetch из БД
  return Response.json({ route: { id: 'r1', slug, title_i18n: { ru: 'Маршрут', en: 'Route' }, duration_min: 90, capacity: 6, status: 'active' } });
}
```

### `GET /api/public/availability` — доступные слоты

```ts
// src/app/api/public/availability/route.ts
import { NextRequest } from 'next/server';
import { AvailabilityQuerySchema } from '@/schemas/catalog';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = AvailabilityQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ error: parsed.error.format() }, { status: 400 });

  // TODO: выборка слотов по routeId/date range
  return Response.json({ slots: [] });
}
```

### `POST /api/booking/draft` — расчёт цены + draft

```ts
// src/app/api/booking/draft/route.ts
import { NextRequest } from 'next/server';
import { DraftRequestSchema } from '@/schemas/booking';
import { withIdempotency } from '@/lib/idempotency.server';
import { rateLimit } from '@/lib/rateLimit.server';
import { draftBooking } from '@/services/booking.server';

export async function POST(req: NextRequest) {
  const idemKey = req.headers.get('idempotency-key') || undefined;
  const ip = req.headers.get('x-forwarded-for') || 'ip';
  const rl = await rateLimit(`draft:${ip}`, 30, 60_000);
  if (!rl.allowed) return Response.json({ error: 'rate_limited' }, { status: 429 });

  return withIdempotency(idemKey, async () => {
    const body = await req.json();
    const parsed = DraftRequestSchema.safeParse(body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.format() } };

    const { booking, quote } = await draftBooking(parsed.data);
    return { status: 200, body: { bookingId: booking.id, codePreview: booking.code, price: quote } };
  });
}
```

### `POST /api/booking/hold` — резервирование (on\_hold)

```ts
// src/app/api/booking/hold/route.ts
import { NextRequest } from 'next/server';
import { HoldRequestSchema } from '@/schemas/booking';
import { withIdempotency } from '@/lib/idempotency.server';
import { rateLimit } from '@/lib/rateLimit.server';
import { placeHold } from '@/services/booking.server';

export async function POST(req: NextRequest) {
  const idemKey = req.headers.get('idempotency-key') || undefined;
  const ip = req.headers.get('x-forwarded-for') || 'ip';
  const rl = await rateLimit(`hold:${ip}`, 20, 60_000);
  if (!rl.allowed) return Response.json({ error: 'rate_limited' }, { status: 429 });

  return withIdempotency(idemKey, async () => {
    const body = await req.json();
    const parsed = HoldRequestSchema.safeParse(body);
    if (!parsed.success) return { status: 400, body: { error: parsed.error.format() } };

    const { booking, invoiceUrl } = await placeHold({
      bookingId: parsed.data.bookingDraftId,
      data: parsed.data.data,
    });
    return { status: 200, body: { bookingCode: booking.code, holdExpiresAt: booking.hold_expires_at, invoiceUrl } };
  });
}
```

### `GET /api/billing/invoices/{code}` — мета инвойса

```ts
// src/app/api/billing/invoices/[code]/route.ts
import { NextRequest } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  // TODO: fetch invoice by booking code
  return Response.json({ invoice: { code, amount_total: 5000, currency: 'RUB', status: 'pending', due_at: new Date().toISOString() } });
}
```

### `GET /api/billing/invoices/{code}/pdf` — Signed URL

```ts
// src/app/api/billing/invoices/[code]/pdf/route.ts
import { NextRequest } from 'next/server';
import { ensureInvoicePdf } from '@/services/pdf.server';
import { getSignedReadUrl } from '@/lib/gcs.server';

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const { key } = await ensureInvoicePdf(params.code);
  const url = await getSignedReadUrl(key);
  return Response.redirect(url, 302);
}
```

### Ops: `POST /api/ops/bookings/{id}` — отметить «Оплата получена»

```ts
// src/app/api/ops/bookings/[id]/route.ts
import { NextRequest } from 'next/server';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  // TODO: auth (role=Operator), транзакция: invoice.status=received; booking=confirmed; capacity_confirmed+=pax; capacity_held-=pax
  return Response.json({ ok: true, id, newStatus: 'confirmed' });
}
```

---

## 🌍 I18N (минималистичный каркас) — `src/lib/i18n.ts`

```ts
export const t = (locale: 'ru'|'en', key: string, vars?: Record<string, unknown>) => {
  const dict: Record<string, Record<'ru'|'en', string>> = {
    'price.base': { ru: 'Базовая цена', en: 'Base price' },
    'error.rate_limited': { ru: 'Слишком много запросов', en: 'Too many requests' },
  };
  const template = (dict[key] && dict[key][locale]) || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
};
```

---

## 🧪 Тесты (скелеты)

**Vitest:** `tests/unit/price.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { getQuote } from '@/services/price.server';

describe('price v0', () => {
  it('calculates base * pax', async () => {
    const q = await getQuote({ routeId: 'r1', slotId: 's1', pax: 2, locale: 'ru' });
    expect(q.total).toBeGreaterThan(0);
  });
});
```

**Playwright:** `tests/e2e/booking.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('public booking flow draft→hold→invoice', async ({ request }) => {
  const draft = await request.post('/api/booking/draft', { data: { routeId: 'r1', slotId: 's1', pax: 2, phone: '+79990000000', locale: 'ru' } });
  expect(draft.ok()).toBeTruthy();
  const draftJson = await draft.json();

  const hold = await request.post('/api/booking/hold', { data: { bookingDraftId: draftJson.bookingId, consent: true } });
  expect(hold.ok()).toBeTruthy();
  const holdJson = await hold.json();
  expect(holdJson.invoiceUrl).toContain('/invoice/');
});
```

---

## ⚙️ CI (GitHub Actions) — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint --if-present
      - run: pnpm run typecheck --if-present
      - run: pnpm run test --if-present
      - run: pnpm run build --if-present
    env:
      NODE_ENV: test
      APP_BASE_URL: https://example.test
      FEATURE_PUBLIC_SITE: 'true'
      FEATURE_I18N: 'true'
      FEATURE_PAYMENTS_ONLINE: 'false'
      FEATURE_OPS_CONSOLE: 'true'
      FEATURE_SEAT_SHARING: 'false'
      COOKIE_SECRET_CURRENT: test_cookie_secret_32_bytes_min________
      DATABASE_URL: https://db.example.test
      REDIS_URL: https://redis.example.test
      GCS_BUCKET: gts-mvp-media-euw4
      GCS_SIGNED_URL_TTL_SECONDS: '1800'
      GOOGLE_CLOUD_PROJECT: gts-project
      GOOGLE_APPLICATION_CREDENTIALS_JSON: '{}'
      RL_PUBLIC_DRAFT_PER_MIN: '30'
      RL_PUBLIC_HOLD_PER_MIN: '20'
      IDEMPOTENCY_TTL_SEC: '600'
```

> Примечание: для `DATABASE_URL`/`REDIS_URL` в CI можно подставлять заглушки, если тесты не требуют реальной БД. Для интеграционных тестов — подключить Testcontainers или in-memory адаптеры.

---

## 🔐 `.env.example`

```dotenv
# App
NODE_ENV=development
APP_BASE_URL=http://localhost:3000

# Feature Flags
FEATURE_PUBLIC_SITE=true
FEATURE_I18N=true
FEATURE_PAYMENTS_ONLINE=false
FEATURE_OPS_CONSOLE=true
FEATURE_SEAT_SHARING=false

# Secrets
COOKIE_SECRET_CURRENT=change_me_to_long_random_32+_chars
COOKIE_SECRET_PREV=
JWT_SECRET=

# Data Stores
DATABASE_URL=postgres://user:pass@localhost:5432/gts
REDIS_URL=redis://localhost:6379

# Google Cloud Storage
GCS_BUCKET=gts-mvp-media-euw4
GCS_SIGNED_URL_TTL_SECONDS=1800
GOOGLE_CLOUD_PROJECT=gts-project
# В CI удобно хранить как строку JSON (без файла ключа):
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"gts-project",...}

# Notifications (optional)
SMTP_URL=smtp://user:pass@mail.example.com:587

# Rate Limits / Idempotency
RL_PUBLIC_DRAFT_PER_MIN=30
RL_PUBLIC_HOLD_PER_MIN=20
IDEMPOTENCY_TTL_SEC=600
```

---

## ✅ Что дальше (минимальные TODO для прод-готовности)

- Подключить реальный адаптер Redis (ioredis) для rate-limit и идемпотентности.
- Транзакции при `placeHold` (конкурентный доступ к слоту, инкременты вместимости).
- Рендер PDF (например, через `@react-pdf/renderer` или Puppeteer) и upload в GCS.
- Реестр шаблонов уведомлений с предпросмотром (ops).
- Авторизация в `/api/ops/*` (роль `Operator` из вашей Stage 1) или короткий JWT.
- Логи/метрики (trace-id), алёрты на всплеск `hold_expired` и 5xx.
```