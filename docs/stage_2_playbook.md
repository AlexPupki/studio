# Stage 2 — MVP Публичного сайта и Бронирования (Catalog → Hold → Invoice → Confirm)

> **Техническая реализация:** Детальный каркас кода, структура файлов, типы и эндпоинты для этого этапа описаны в документе [./stage_2_каркас_типов_эндпоинтов_и_env_example_next.md](./stage_2_каркас_типов_эндпоинтов_и_env_example_next.md).

## 0) Цели и рамки

**Цель:** запустить полный путь клиента от публичного каталога до подтверждённого бронирования с офлайн-оплатой (инвойс/PDF), плюс минимальная операторская консоль для отметки оплат и контроля слотов.

**В Scope (обязательно):**

*   Публичный сайт (каталог, маршрут, слот-пикер, бронирование, страница инвойса).
*   Модель слотов и базовое ценообразование (тариф + простые корректировки).
*   Бронирование: `draft → on_hold → confirmed | canceled`.
*   Инвойс (PDF) и офлайн-оплата (оператор вручную помечает «получено»).
*   Уведомления (WA/SMS/email) через адаптер (stub → реальный провайдер позже).
*   Мини-консоль оператора (список/борд бронирований, календарь слотов v0, кнопка «Оплата получена»).
*   i18n RU/EN (минимум) для UI/уведомлений/PDF/SEO.

**Вне Scope (перенос):**

*   Seat-sharing (по местам), сложные правила прайса (сезон/зоны) — частично заложим структуру.
*   Онлайн-платежи (Stripe/ЮKassa) — под фича-флагом, выключено.
*   Полный RBAC и партнёрский портал.
*   Глубокие отчёты/BI и маршрутизация трансферов.

**Фича-флаги:**

*   `FEATURE_PUBLIC_SITE=true`
*   `FEATURE_I18N=true`
*   `FEATURE_PAYMENTS_ONLINE=false`
*   `FEATURE_OPS_CONSOLE=true`
*   `FEATURE_SEAT_SHARING=false` (заложить схемы/поля, UI скрыть)

---

## 1) Доменные модели (дельта к Stage 1)

### 1.1 Каталог/Активы/Маршруты/Локации (i18n)

Мини-набор (JSONB для i18n полей):

*   `route` — `id`, `slug`, `title_i18n`, `intro_i18n`, `duration_min`, `capacity`, `min_age`, `meeting_instructions_i18n`, `gallery[]`, `status`.
*   `asset_type` / `asset_unit` — базовая связка для вместимости/фото/статуса.
*   `location` — `id`, `title_i18n`, `coords`, `meeting_i18n`.
*   `price_rule` (база + простые корректировки): `scope(route|asset|date_range|dow|time_range)`, `condition`, `value`, `priority`, `valid_from/to`, `label_i18n`.

### 1.2 Слоты/Календарь

*   `slot` — `id`, `route_id`, `asset_unit_id|null`, `start_at`, `end_at`, `capacity_total`, `capacity_held`, `capacity_confirmed`, `state: planned|held|confirmed|locked_maintenance|done`.
*   Генерация слотов по шаблонам (ежедневные/по дням недели); блокировки под обслуживание.

### 1.3 Бронирование и инвойс

*   `booking` — `id`, `code` (короткий), `state: draft|on_hold|confirmed|canceled`, `client_phone`, `client_name?`, `slot_id`, `pax_count`, `price_total`, `price_breakdown_json`, `hold_expires_at`, `cancel_reason?`, timestamps.
*   `booking_item` — позиции (единицы/допы) — **v0 опционально**.
*   `invoice` — `id`, `booking_id`, `number`, `amount_total`, `currency`, `status: pending|received|refunded`, `due_at`, `pdf_key`, `raw_payload_json`.
*   `document` — PDF-документы (инвойсы/ваверы) — ключ в GCS.

### 1.4 Уведомления и аудит

*   `notification` — `id`, `type`, `channel`, `to`, `template_key`, `locale`, `status`, `error?`, `payload_json`.
*   `audit_event` — уже есть из Stage 1 (расширить событиями бронирований).

---

## 2) Ключевые потоки (UX → API → Data)

### 2.1 Публичный: Каталог → Слот-пикер → Бронирование (Hold)

1.  Пользователь открывает `/routes/{slug}?lang=…` → получает описание и доступные слоты (фильтр по дате/времени).
2.  Жмёт «Забронировать» → форма (имя, телефон, кол-во пассажиров, согласия).
3.  `POST /api/booking/draft` → сервер рассчитывает цену (база + корректировки), возвращает оффер (preview).
4.  `POST /api/booking/hold` → создаёт `booking:on_hold`, резервирует вместимость в `slot`, выставляет `hold_expires_at`. Отправляет уведомление с ссылкой на инвойс.

### 2.2 Инвойс (OFF-site)

1.  Клиент попадает на `/invoice/{code}` (публично, но по коду). Видит итог и инструкции (оплата переводом/кассой).
2.  Генерируется/кешируется PDF инвойса (GCS, Signed URL).
3.  В операторской консоли — «Оплата получена» → `booking:confirmed`, `invoice:received`, `slot.capacity_confirmed += pax`.

### 2.3 Таймаут и отмена

*   По крону/воркеру: истёк `hold_expires_at` → `booking:canceled`, `slot.capacity_held -= pax`, уведомление об отмене.

---

## 3) API (минимальный слой, idempotency)

**Public (read/flows):**

*   `GET /api/public/catalog/routes?lang=…`
*   `GET /api/public/routes/{slug}?lang=…`
*   `GET /api/public/availability?routeId=&dateFrom=&dateTo=&pax=&lang=…`

**Booking/Billing:**

*   `POST /api/booking/draft` — body: `{routeId, slotId, pax, phone, name?, locale}` → `{priceBreakdown, total, bookingCodePreview}`
*   `POST /api/booking/hold` — `{bookingDraftId|data, consent}` → `{bookingCode, holdExpiresAt, invoiceUrl}`
*   `GET /api/billing/invoices/{code}` — метаданные инвойса
*   `GET /api/billing/invoices/{code}/pdf` — Signed URL (stream/redirect)
*   Idempotency: header `Idempotency-Key` на `draft/hold`.

**Ops (JWT + фича-флаг):**

*   `GET /api/ops/bookings?state=&date=&route=…`
*   `POST /api/ops/bookings/{id}/mark-payment-received`
*   `POST /api/ops/bookings/{id}/cancel`
*   `GET /api/ops/slots?date=&route=…`
*   (опционально) `POST /api/ops/slots/generate` по шаблону

**Webhooks (stub ON, real OFF):**

*   `/webhooks/notifications` — для будущих провайдеров, сейчас — эхо/лог.

> Все write-эндпоинты — только Server Actions / `.server.ts`. Клиент — без прямого импорта Node-SDK.

---

## 4) Ценообразование v0

*   База: `base_price` на `route`.
*   Корректировки: `+/- value` по DOW, time range, дата-диапазон (праздники), `pax` (на человека/фикс).
*   Алгоритм: сбор всех применимых правил по `priority`, агрегирование → `price_breakdown`.
*   Возврат клиенту: **детализация**, чтобы не терять прозрачность (и локализация лейблов правил).

---

## 5) Инвойсы и PDF

*   Рендер PDF на сервере (SSR шаблон → PDF, без утяжеления клиента).
*   Хранение в GCS (bucket из Architecture), приватно; выдача Signed URL v4, TTL 15–30 мин.
*   Нумерация: `INV-YYYYMM-####` (пер-локальная политика).
*   Локализация шаблона PDF и валютное форматирование (RU/EN, ₽/€/…).

---

## 6) Уведомления (адаптеры)

Интерфейс `NotificationProvider`:

```ts
send(templateKey: string, to: {phone?: string; email?: string; wa?: string}, locale: Locale, vars: Record<string,unknown>): Promise<{id:string}>
```

*   Провайдеры: `StubProvider` (лог/консоль), `EmailProvider` (SMTP или сервис), `WA/SMSProvider` (позже).
*   События: `booking_hold_placed`, `hold_expired`, `payment_received`, `booking_confirmed`.
*   Каталог шаблонов (i18n-ключи) + предпросмотр в консоли операторов (v0).

---

## 7) Мини-консоль оператора (ops.gts.ru / раздел в админке)

*   **Bookings Board:** фильтры по дате/статусу/маршруту, действия: «Оплата получена», «Отменить».
*   **Calendar (v0):** день/неделя по маршрутам/активам; badge для `held/confirmed`.
*   **Invoice Detail:** просмотр суммы, due date, скачивание PDF, история уведомлений.
*   **Slot Templates:** таблица шаблонов (часы/интервалы, capacity) + кнопка «Сгенерировать на неделю».

> Аутентификация в ops — либо ваш Stage 1 логин, помеченный ролью `Operator` (простая роль в таблице `users.role`), либо технический JWT (фича-флагом).

---

## 8) I18N/SEO/Доступность

*   **Locales:** `ru` (default), `en`. Строки форм, ошибки, уведомления, PDF.
*   Приём `Accept-Language` и `?lang=`.
*   SEO: `hreflang`, локализованные мета/OG, `canonical` для слуг.
*   RTL — пока **out**; закладываем стили через logical-props, но не включаем.

---

## 9) Безопасность/Политики

*   Idempotency на критических POST.
*   Rate-limits (per IP/phone) на `draft/hold`.
*   Валидация: E.164 для телефона, Unicode-имена, обязательные согласия.
*   Cookies из Stage 1: `HttpOnly/Secure/SameSite=Lax`; сессии проверяются на `/ops/*`.
*   Аудит: `BookingDrafted`, `HoldPlaced`, `HoldExpired`, `PaymentReceived`, `BookingConfirmed`, `BookingCanceled`, `InvoicePdfGenerated`, `NotificationSent/Failed`.

---

## 10) Наблюдаемость/логи/метрики

*   Логи структурно (request_id/trace_id).
*   Техметрики: p95 API, ошибки, time to first invoice PDF.
*   Бизнес-метрики: конверсия `route_view → slot_view → draft → hold → confirm`, доля истёкших hold, медиана времени до «Оплата получена».
*   Алёрты: всплеск `hold_expired`, рост 5xx, рост `NotificationFailed`.

---

## 11) Тест-план

*   **Unit:** прайс-правила, генератор слотов, расчёт capacity, idempotency store.
*   **Интеграция:** `draft/hold` с конкурентным доступом (две параллельные попытки на один слот).
*   **E2E (Playwright):** RU/EN: маршрут → слот → draft → hold → инвойс, таймаут hold, отмена, подтверждение оплатой.
*   **PDF snapshot-тесты:** рендер 2-3 сценария (пустой/много правил/EN).

---

## 12) Схемы/Контракты (TypeScript, кратко)

```ts
// catalog
export type Route = {
  id: string; slug: string;
  title_i18n: Record<'ru'|'en', string>;
  intro_i18n?: Record<'ru'|'en', string>;
  duration_min: number; capacity: number;
  meeting_instructions_i18n?: Record<'ru'|'en', string>;
  gallery?: string[]; status: 'active'|'inactive';
};

export type Slot = {
  id: string; route_id: string; asset_unit_id?: string|null;
  start_at: string; end_at: string;
  capacity_total: number; capacity_held: number; capacity_confirmed: number;
  state: 'planned'|'held'|'confirmed'|'locked_maintenance'|'done';
};

export type PriceRule = {
  id: string; scope: 'route'|'asset'|'date_range'|'dow'|'time_range'|'pax';
  condition: Record<string, unknown>;
  value: { kind: 'abs'|'percent'; amount: number; per: 'total'|'per_pax' };
  priority: number; valid_from?: string; valid_to?: string;
  label_i18n?: Record<'ru'|'en', string>;
};

// booking
export type BookingState = 'draft'|'on_hold'|'confirmed'|'canceled';
export type Booking = {
  id: string; code: string; state: BookingState;
  client_phone: string; client_name?: string; locale: 'ru'|'en';
  slot_id: string; pax_count: number;
  price_total: number; price_breakdown_json: unknown;
  hold_expires_at?: string; cancel_reason?: string;
  created_at: string; updated_at: string;
};

export type Invoice = {
  id: string; booking_id: string; number: string;
  amount_total: number; currency: 'RUB'|'EUR'|'USD';
  status: 'pending'|'received'|'refunded';
  due_at: string; pdf_key?: string; raw_payload_json?: unknown;
};
```

---

## 13) Страницы/Компоненты (Next.js)

**Public:**

*   `/` (промо/подборки) — **минимум**.
*   `/routes` (каталог) → `/routes/{slug}` (деталь, слот-пикер).
*   `/book/start?route=…&slot=…` (форма брони, RU/EN, согласия).
*   `/invoice/{code}` (деталь инвойса, статусы, кнопки «как оплатить», скачивание PDF).
*   `/legal/{doc}` (оферта/политика, RU/EN).

**Ops (за логином/ролью):**

*   `/ops/bookings` (борд/таблица).
*   `/ops/bookings/{id}` (деталь: инвойс, история, уведомления).
*   `/ops/slots` (календарь v0, генерация по шаблонy).

Все серверные операции — через `*.server.ts` actions; никакого Node-кода в клиенте.

---

## 14) Миграции/Сиды

*   Сиды маршрутов/слотов/простых прайс-правил для демо.
*   Создать тестовые данные RU/EN (названия/описания).
*   Сервисная утилита: «сгенерировать слоты на N недель вперёд».

---

## 15) Definition of Done (чек-лист)

*   [ ] Публичный маршрут → слот-пикер → draft/hold → инвойс (PDF), RU/EN.
*   [ ] Таймаут hold освобождает вместимость; уведомления уходят.
*   [ ] Консоль оператора: список/фильтры, «Оплата получена», календарь v0.
*   [ ] Цены считаются по правилам; клиент видит breakdown.
*   [ ] GCS: приватное хранение, выдача Signed URL; логи событий и ошибок.
*   [ ] Idempotency, rate-limits, валидация полей, аудиты на ключевых шагах.
*   [ ] E2E/Unit/Интеграционные тесты — зелёные в CI.
*   [ ] SEO `hreflang`, локализованные мета; `.env.example` + ADR обновлены.

---

## 16) Риски и смягчения

*   **Гонки в слоте:** транзакции/оптимистичные блокировки на `capacity_held/confirmed`, ретраи при конфликте.
*   **Истечение hold:** фоновые джобы (cron/worker) и идемпотентная отмена.
*   **Переезд на онлайн-платежи:** провайдерный интерфейс `PaymentProvider` подготовлен, но выключен флагом.
*   **Рост i18n:** хранение i18n в JSONB и ключи шаблонов сразу унифицированы.
```