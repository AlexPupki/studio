# Stage 2 — MVP Публичного сайта и Бронирования (Catalog → Hold → Invoice → Confirm)
**Версия: 1.1.0**

> **Статус**: В процессе реализации.
> **Техническая реализация:** Детальный каркас кода, структура файлов, типы и эндпоинты для этого этапа описаны в документе [./stage_2_каркас_типов_эндпоинтов_и_env_example_next.md](./stage_2_каркас_типов_эндпоинтов_и_env_example_next.md).
> **Соответствие Blueprint v1.2**: Этот этап напрямую реализует ключевые требования из разделов **7.1 (Individual Booking)**, **11 (Payments: OFF-Site)** и **14 (Operator Console)**.

## 0) Цели и рамки

**Цель:** запустить полный путь клиента от публичного каталога до подтверждённого бронирования с офлайн-оплатой (инвойс/PDF), плюс минимальная операторская консоль для отметки оплат и контроля слотов.

**В Scope (обязательно):**

*   Публичный сайт (каталог, маршрут, слот-пикер, бронирование, страница инвойса).
*   Модель слотов и базовое ценообразование (тариф + простые корректировки), **цены хранятся в копейках/центах (minor units)**.
*   Бронирование: `draft → on_hold → confirmed | canceled` с **транзакционной защитой от овербукинга**.
*   Инвойс (PDF) и офлайн-оплата (оператор вручную помечает «получено»).
*   Уведомления (WA/SMS/email) через адаптер (stub → реальный провайдер позже).
*   **Защищённая** мини-консоль оператора (список/борд бронирований, календарь слотов v0, кнопка «Оплата получена»).
*   i18n RU/EN (минимум) для UI/уведомлений/PDF/SEO.
*   **Production-grade** реализация `Idempotency` и `Rate-limiting` на базе **Redis**.
*   **Cron-задача** для обработки истекших holds.

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
> **Соответствие Blueprint v1.2**: Реализует сущности из **пункта 6 (Data Model)** и **15 (CMS Content Models)**.

### 1.1 Каталог/Активы/Маршруты/Локации (i18n)

*   `route` — `id`, `slug` (канонический, непереводимый), `title_i18n`, `intro_i18n`, `duration_min`, `capacity`, `min_age`, `meeting_instructions_i18n`, `gallery[]`, `status`.
*   `asset_type` / `asset_unit` — базовая связка для вместимости/фото/статуса.
*   `location` — `id`, `title_i18n`, `coords`, `meeting_i18n`.
*   `price_rule` (база + простые корректировки): `scope(route|asset|date_range|dow|time_range)`, `condition`, `value_minor_units` (int), `priority`, `valid_from/to`, `label_i18n`.

### 1.2 Слоты/Календарь

*   `slot` — `id`, `route_id`, `asset_unit_id|null`, `start_at` (UTC), `end_at` (UTC), `capacity_total`, `capacity_held`, `capacity_confirmed`, `state: planned|held|confirmed|locked_maintenance|done`.
*   Генерация слотов по шаблонам (ежедневные/по дням недели); блокировки под обслуживание.
*   **Constraint на уровне БД**: `CHECK (capacity_total >= capacity_held + capacity_confirmed)`.

### 1.3 Бронирование и инвойс

*   `booking` — `id`, `code` (уникальный, base32), `state: draft|on_hold|confirmed|canceled`, `client_phone` (E.164), `client_name?`, `slot_id`, `pax_count`, `price_total_minor_units`, `price_breakdown_json`, `hold_expires_at` (UTC), `cancel_reason?`, timestamps.
*   `booking_item` — позиции (единицы/допы) — v0 опционально.
*   `invoice` — `id`, `booking_id`, `number` (уникальный), `amount_total_minor_units`, `currency`, `status: pending|received|refunded`, `due_at` (UTC), `pdf_key`, `raw_payload_json`.
*   `document` — PDF-документы (инвойсы/ваучеры) — ключ в GCS.

### 1.4 Уведомления и аудит
> **Соответствие Blueprint v1.2**: Реализует **пункт 12 (Comms & Notifications)** и **22 (Event Catalog)**.

*   `notification` — `id`, `type`, `channel`, `to`, `template_key`, `locale`, `status`, `error?`, `payload_json`.
*   `audit_event` — расширить полями `trace_id`, `booking_id`, `user_id` для упрощения разбора инцидентов.

---

## 2) Ключевые потоки (UX → API → Data)
> **Соответствие Blueprint v1.2**: Реализует флоу из **пункта 7.1 (Individual Booking)**.

### 2.1 Публичный: Каталог → Слот-пикер → Бронирование (Hold)

1.  Пользователь открывает `/routes/{slug}?lang=…` → получает описание и доступные слоты (фильтр по дате/времени, кеширование с `revalidate`).
2.  Жмёт «Забронировать» → форма (имя, телефон, кол-во пассажиров, согласия).
3.  `POST /api/booking/draft` → сервер рассчитывает цену (база + корректировки), возвращает оффер (preview).
4.  `POST /api/booking/hold` → **транзакционно** создаёт `booking:on_hold` (с проверкой `capacity`), резервирует вместимость в `slot`, выставляет `hold_expires_at`. Отправляет уведомление с ссылкой на инвойс.

### 2.2 Инвойс (OFF-site)

1.  Клиент попадает на `/invoice/{code}` (публично, но по коду). Видит итог и инструкции (оплата переводом/кассой).
2.  Генерируется/кешируется PDF инвойса (GCS, Signed URL).
3.  В операторской консоли — «Оплата получена» → **транзакционно** `booking:confirmed`, `invoice:received`, `slot.capacity_confirmed += pax`, `slot.capacity_held -=pax`.

### 2.3 Таймаут и отмена

*   **Cron-задача (Cloud Scheduler)** вызывает `/api/jobs/holds/expire` → идемпотентно находит истекшие `hold` → `booking:canceled`, `slot.capacity_held -= pax`, уведомление об отмене.

---

## 3) API (минимальный слой, idempotency)
> **Соответствие Blueprint v1.2**: Реализует эндпоинты из **пункта 10 (API Layer)**.

**Public (read/flows):**

*   `GET /api/public/catalog/routes?lang=…` (с Cache-Control)
*   `GET /api/public/routes/{slug}?lang=…` (с Cache-Control)
*   `GET /api/public/availability?routeId=&dateFrom=&dateTo=&pax=&lang=…` (`no-store` или низкий TTL)

**Booking/Billing:**

*   `POST /api/booking/draft` — body: `{routeId, slotId, pax, phone, name?, locale}` → `{priceBreakdown, total, bookingCodePreview}`
*   `POST /api/booking/hold` — `{bookingDraftId|data, consent}` → `{bookingCode, holdExpiresAt, invoiceUrl}`. **Header `Idempotency-Key` обязателен**.
*   `GET /api/billing/invoices/{code}` — метаданные инвойса
*   `GET /api/billing/invoices/{code}/pdf` — Signed URL (stream/redirect)

**Ops (защищено middleware, JWT + роль `Operator`):**

*   `GET /api/ops/bookings?state=&date=&route=…`
*   `POST /api/ops/bookings/{id}/mark-payment-received`
*   `POST /api/ops/bookings/{id}/cancel`
*   `GET /api/ops/slots?date=&route=…`
*   `POST /api/ops/slots/generate` по шаблону

**Internal Jobs (защищено HMAC/IAP):**

*   `POST /api/jobs/holds/expire`

> Все write-эндпоинты — только Server Actions / `.server.ts`. Клиент — без прямого импорта Node-SDK.

---

## 4) Ценообразование v0
> **Соответствие Blueprint v1.2**: Реализует базовые правила из **пункта 5.4 (Pricing & Offers)**.

*   База: `base_price_minor_units` (int) на `route`.
*   Корректировки: `+/- value` по DOW, time range, дата-диапазон (праздники), `pax`. **Все расчёты в копейках/центах во избежание ошибок с плавающей точкой.**
*   Алгоритм: сбор всех применимых правил по `priority`, агрегирование → `price_breakdown`.
*   Возврат клиенту: **детализация**, чтобы не терять прозрачность (и локализация лейблов правил).

---

## 5) Инвойсы и PDF
> **Соответствие Blueprint v1.2**: Реализует **пункт 5.6 (Billing Off-site)**.

*   Рендер PDF на сервере (через `@react-pdf/renderer` или аналогичный легковесный инструмент), а не Puppeteer.
*   Хранение в GCS (bucket из Architecture), приватно; выдача Signed URL v4, TTL 15–30 мин.
*   Нумерация: `INV-YYYYMM-####` (глобально-уникальная или с префиксом филиала).
*   Локализация шаблона PDF и форматирование валют (с учётом minor units).

---

## 6) Уведомления (адаптеры)
> **Соответствие Blueprint v1.2**: Реализует **пункт 12 (Comms & Notifications)** и **18 (Notifications Catalog)**.

Интерфейс `NotificationProvider`:

```ts
send(templateKey: string, to: {phone?: string; email?: string; wa?: string}, locale: Locale, vars: Record<string,unknown>): Promise<{id:string}>
```

*   Провайдеры: `StubProvider` (лог/консоль), `EmailProvider` (SMTP или сервис), `WA/SMSProvider` (позже).
*   События: `booking_hold_placed`, `hold_expired`, `payment_received`, `booking_confirmed`.
*   Каталог шаблонов (i18n-ключи) + предпросмотр в консоли операторов (v0).

---

## 7) Мини-консоль оператора (ops.gts.ru / раздел в админке)
> **Соответствие Blueprint v1.2**: Реализует **пункт 14 (Operator Console)**.

*   **Доступ строго по роли `Operator`**.
*   **Bookings Board:** фильтры по дате/статусу/маршруту, действия: «Оплата получена», «Отменить».
*   **Calendar (v0):** день/неделя по маршрутам/активам; badge для `held/confirmed`.
*   **Invoice Detail:** просмотр суммы, due date, скачивание PDF, история уведомлений.
*   **Slot Templates:** таблица шаблонов (часы/интервалы, capacity) + кнопка «Сгенерировать на неделю».

> Аутентификация в ops — **обязательно** через сессию из Stage 1 + проверка роли `Operator`.

---

## 8) I18N/SEO/Доступность
> **Соответствие Blueprint v1.2**: Реализует **пункт 4 (Internationalization)** и **16 (SEO)**.

*   **Locales:** `ru` (default), `en`.
*   Приём `Accept-Language` и `?lang=`.
*   SEO: `hreflang` для локализованного контента, канонический slug (`/routes/sea-trip`), локализованные мета/OG-теги генерируются на сервере.
*   RTL — пока **out**; закладываем стили через logical-props, но не включаем.

---

## 9) Безопасность/Политики
> **Соответствие Blueprint v1.2**: Реализует **пункт 12 (Security & Compliance)**.

*   **Idempotency на базе Redis** на критических POST (`draft/hold`).
*   **Rate-limits (per IP/phone) на базе Redis** на `draft/hold`.
*   **Валидация E.164** для телефонов (например, через `libphonenumber-js`).
*   Cookies из Stage 1: `HttpOnly/Secure/SameSite=Lax`; сессии проверяются на `/ops/*` через middleware.
*   Аудит: `BookingDrafted`, `HoldPlaced`, `HoldExpired`, `PaymentReceived`, `BookingConfirmed` и др. с `traceId`.
*   **State Machine для бронирований**: Переходы между статусами должны валидироваться по заранее определенным правилам (`draft` -> `on_hold` | `canceled`, и т.д.).

---

## 10) Наблюдаемость/логи/метрики
> **Соответствие Blueprint v1.2**: Реализует **пункт 13 (Observability)** и **23 (Non-Functional)**.

*   Логи структурно (`trace_id` пробрасывается через все вызовы).
*   Техметрики: p95 API, ошибки, глубина очереди (если есть), time to first invoice PDF.
*   Бизнес-метрики: конверсия `route_view → slot_view → draft → hold → confirm`, доля истёкших hold, медиана времени до «Оплата получена».
*   Алёрты: всплеск `hold_expired`, рост 5xx, рост `NotificationFailed`, ошибки cron-джобы.

---

## 11) Тест-план
> **Соответствие Blueprint v1.2**: Реализует **пункт 26 (Testing & Go-Live)**.

*   **Unit:** прайс-правила (с minor units), генератор слотов, расчёт capacity, idempotency/rate-limit store.
*   **Интеграция:** `draft/hold` с **конкурентным доступом** (две параллельные попытки на один слот), проверка транзакционности.
*   **E2E (Playwright):** RU/EN: маршрут → слот → draft → hold → инвойс, таймаут hold, отмена, подтверждение оплатой. Конфигурация с `baseURL` и `webServer`.
*   **PDF snapshot-тесты:** рендер 2-3 сценария (пустой/много правил/EN).

---

## 12) Схемы/Контракты (TypeScript, кратко)

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
```

---

## 13) Страницы/Компоненты (Next.js)

**Public:**
*   `/` (промо/подборки) — **минимум**.
*   `/routes` (каталог) → `/routes/{slug}` (деталь, слот-пикер).
*   `/book/start?route=…&slot=…` (форма брони, RU/EN, согласия).
*   `/invoice/{code}` (деталь инвойса, статусы, кнопки «как оплатить», скачивание PDF).
*   `/legal/{doc}` (оферта/политика, RU/EN).

**Ops (за логином/ролью `Operator`):**
*   `/ops/bookings` (борд/таблица).
*   `/ops/bookings/{id}` (деталь: инвойс, история, уведомления).
*   `/ops/slots` (календарь v0, генерация по шаблону).

---

## 14) Миграции/Сиды

*   Сиды маршрутов/слотов/простых прайс-правил для демо.
*   Создать тестовые данные RU/EN (названия/описания).
*   Сервисная утилита: «сгенерировать слоты на N недель вперёд».

---

## 15) Definition of Done (чек-лист)

*   [ ] Публичный маршрут → слот-пикер → draft/hold → инвойс (PDF), RU/EN.
*   [ ] Таймаут hold освобождает вместимость **через идемпотентную cron-джобу**.
*   [ ] Консоль оператора **защищена**, действия атомарны.
*   [ ] Цены считаются по правилам (в копейках), клиент видит breakdown.
*   [ ] GCS: приватное хранение, выдача Signed URL; логи событий и ошибок.
*   [ ] **Idempotency и Rate-limits на Redis** работают, валидация полей (E.164) строгая.
*   [ ] E2E/Unit/Интеграционные тесты — зелёные в CI.
*   [ ] SEO `hreflang`, локализованные мета; `.env.example` + ADR обновлены.

---

## 16) Риски и смягчения

*   **Гонки в слоте:** **Обязательное** использование транзакций с `SELECT ... FOR UPDATE` или эквивалентным механизмом блокировки на уровне БД.
*   **Истечение hold:** фоновые джобы (cron/worker) и идемпотентная отмена.
*   **Переезд на онлайн-платежи:** провайдерный интерфейс `PaymentProvider` подготовлен, но выключен флагом.
*   **Рост i18n:** хранение i18n в JSONB и ключи шаблонов сразу унифицированы.

---

## 17) Вопросы для финализации (из аудита)

*   **Политики hold-TTL:** Единая для всех (например, 30 минут) или настраиваемая per-route/per-product? Сейчас в коде это константа. Стоит ли параметризовать и, возможно, сокращать TTL для "горящих" слотов (на сегодня/завтра)?
*   **Нумерация инвойсов:** Локально уникальная по месяцу (`INV-YYYYMM-######`) или глобально-последовательная? Текущая реализация (`INV-ГОД-СЛУЧАЙНЫЕ_ЦИФРЫ`) может не подойти для строгой отчетности.
*   **Storage схемы i18n:** Будут ли локализованные **slug’и** или только поля? Текущий подход — один канонический slug и `hreflang`, что является лучшей практикой для SEO. Нужно подтвердить, что это финальное решение.
*   **Уведомления:** Какие каналы реально запускаем на Stage 2 (email/SMS/WA)? От этого зависят контракты, провайдеры и необходимость в очередях (DLQ).
*   **Concurrency model:** Как планируется обрабатывать высокую нагрузку при бронировании очень популярных слотов (кроме `SELECT ... FOR UPDATE`)? Рассматриваем ли мы оптимистичные блокировки или очереди на уровне приложения (например, в Redis)?
*   **Data retention:** Какие политики хранения для `audit_event`, `request_logs` и `expired bookings`? Нужно определить сроки (например, 90 дней для логов, 1 год для аудита) и реализовать механизм очистки/архивации.
