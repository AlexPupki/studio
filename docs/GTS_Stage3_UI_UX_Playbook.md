# GTS Platform — Stage 3 Playbook (UI‑UX Foundation)

_Версия: 1.1 • Дата: 21.08.2025_

## 0. Контекст

Stage 3 посвящён видимой и редактируемой оболочке платформы: админка, каталоги услуг/техники, блоковые страницы, блог, базовый SEO, UI бронирования (без онлайн-оплаты) и понятный `/ops`. Всё, что нужно, чтобы **сегодня** собрать карточку услуги и **завтра** не переделывать архитектуру.

## 1. Цели (Scope)

- **Публичная витрина**: каталоги и карточки услуг/техники, маршруты, блог, статические страницы.
- **Админка**: создание/редактирование/публикация карточек и страниц **без участия разработчика**.
- **Блоковый редактор**: страницы из блоков (hero, gallery, text, features, price_table, route_map, cta, faq).
- **Медиа-библиотека**: загрузка в GCS, пресеты, alt/теги, замена файла без ломки ссылок.
- **UI бронирования**: форма проверки доступности, создание hold, показ PDF-инвойса; интеграция с **YCLIENTS** для доступности/создания записи (без эквайринга).
- **/ops UX**: быстрый поиск/фильтры, статусы hold/booking, отметка оплаты, `external_id (YCLIENTS)`, журнал.
- **Базовый SEO и доступность**: sitemap/robots/canonical/OG, JSON‑LD (Organization, Service, Article); WCAG AA, Lighthouse KPI.
- **Наблюдаемость и события**: телеметрия пользовательских действий и структурированные логи UI‑ошибок.

## 2. Вне скоупа (Out of Scope)

- Онлайн‑платежи, возвраты, чеки (эти задачи уйдут в отдельный финансовый трек).
- Сложная лояльность/реферальные программы.
- Нативные мобильные приложения.

## 3. Информационная архитектура (IA)

**Публичные маршруты**
- `/` — главная.
- `/services` → `/services/:slug` — каталог и карточка услуги.
- `/equipment` → `/equipment/:slug` — каталог и карточка техники.
- `/routes` → `/routes/:slug` — маршруты.
- `/blog` → `/blog/:slug` — новости/статьи.
- `/about`, `/contacts`, `/faq` — статические страницы.
- `/book/:service?` — форма проверки доступности → hold → показ PDF‑инвойса (без оплаты).

**Внутренние маршруты**
- `/admin/content` — страницы (блоки), посты, медиа.
- `/admin/catalog` — услуги, техника, прайсы, маршруты.
- `/admin/settings` — теги, категории, SEO‑шаблоны.
- `/ops` — слоты, брони, отметка оплаты, журнал действий.

## 4. Роли и доступ

- Auth: **Firebase Authentication** (единственный источник истины).
- Роли (custom claims): `customer`, `editor`, `publisher`, `ops.viewer`, `ops.editor`, `admin`.
- Доступ: `/admin/*` — `editor|publisher|admin`; публикация — `publisher|admin`; `/ops/*` — `ops.viewer|ops.editor|admin`.

## 5. Дизайн‑система

### 5.1 Токены (Tailwind CSS)
- Цвета: `primary`, `accent`, `success`, `warning`, `danger`, `neutral-50..900`, `bg-surface`.
- Типографика: `--font-sans`, размеры `xs..3xl`, межстрочные `normal/relaxed`.
- Радиусы: `md`, `xl`, `2xl`. Тени: `sm`, `md`, `xl`.
- Сетка: базовый шаг отступов 4/8/12/16 px.

### 5.2 Компоненты (lib/ui)
- Базовые: Button (primary/ghost/link), Input (text/phone/email), Select/Combobox, Textarea, Checkbox, Date/Time.
- Формы: Field, Label, Hint, Error, FormActions.
- Навигация: Header, MegaMenu, Breadcrumbs, Footer.
- Карточки: `ServiceCard`, `EquipmentCard`, `PostCard`.
- Медиа: `Image` (Next Image), `Gallery`, `Video`.
- Макеты: `Container`, `Section`, `Grid`, `SidebarLayout`.
- Feedback: `Alert`, `Toast`, `EmptyState`, `Skeleton`.
- UI‑паттерны: Tabs, Accordion, Modal, Drawer, Table (+pagination).

**Требования**
- Компоненты документированы на `/admin/ui-kit`.
- Контраст WCAG 2.2 AA на ключевых парах.
- Кнопки/инпуты имеют фокус‑стили и aria‑лейблы.

## 6. Контент‑модель (БД/админка)

### 6.1 Каталог
**Service**
```json
{
  "id": "svc_...",
  "slug": "helicopters-sochi",
  "title_i18n": {"ru": "Вертолётный тур над Сочи", "en": "Helicopter Tour over Sochi"},
  "summary_i18n": {"ru": "45–60 минут, до 5 гостей", "en": "45-60 min, up to 5 guests"},
  "priceFrom": 120000,
  "duration": 45,
  "mediaIds": ["asset_1","asset_2"],
  "tags": ["вертолёт","панорамы"],
  "routeRef": "route_1",
  "equipmentRefs": ["eq_heli_1"],
  "seo": {"title":"...", "description":"...", "ogImage":"asset_1"}
}
```

**Equipment**
```json
{
  "id": "eq_...",
  "slug": "honda-talon-1000r",
  "title_i18n": {"ru": "Honda Talon 1000R", "en": "Honda Talon 1000R"},
  "brand": "Honda",
  "model": "Talon 1000R",
  "specs_i18n": {"ru": {"мест":2,"привод":"4x4","тип":"багги"}, "en": {"seats":2,"drive":"4x4","type":"buggy"}},
  "mediaIds": ["asset_10","asset_11"],
  "serviceRefs": ["svc_buggy_tour"],
  "seo": {"title":"...", "description":"..."}
}
```

**Route**
```json
{
  "id": "route_...",
  "slug": "teberda-arhyz",
  "title_i18n": {"ru": "Теберда → Архыз", "en": "Teberda → Arkhyz"},
  "points": [{"lat":43.4,"lng":41.7,"label":"Старт"}],
  "duration": 240,
  "difficulty": "medium",
  "mediaIds": ["asset_20"]
}
```

**PriceOption** (для вариативных прайсов)
```json
{ "id":"pr_...", "serviceId":"svc_...", "label_i18n": {"ru": "45 минут", "en": "45 minutes"}, "amount":120000, "note_i18n": {"ru":"до 5 гостей", "en":"up to 5 guests"} }
```

### 6.2 Страницы (блоки, JSONB)
Блоки v1: `hero`, `gallery`, `text(md)`, `features`, `price_table`, `route_map`, `cta`, `faq`.

**Пример `Page`**
```json
{
  "id":"page_helicopters",
  "slug":"helicopters",
  "title":"Полёты над Сочи",
  "status":"published",
  "seo":{"title":"Полёты над Сочи","description":"...","ogImage":"asset_1"},
  "contentBlocks":[
    {
      "id": "block_1",
      "type":"hero",
      "data": {
        "headline":"Полёты над Сочи",
        "sub":"45 минут — и вы над морем",
        "bg_asset_id":"asset_1",
        "cta":{"action":"book","serviceId":"svc_heli"}
      }
    },
    {
      "id": "block_2",
      "type":"gallery",
      "data": {
        "assetIds":["asset_2","asset_3"],
        "layout":"masonry"
      }
    },
    {
      "id": "block_3",
      "type": "features",
      "data": {
        "items":[{"icon":"clock","text":"45–60 минут"},{"icon":"group","text":"до 5 гостей"}]
      }
    }
  ]
}
```

### 6.3 Блог (посты)
- Поля: `title`, `slug`, `status (draft|scheduled|published|archived)`, `category`, `tags[]`, `cover`, `excerpt`, `body(md)`, `publishedAt`.
- Требования: черновик/превью/расписание публикации, OG/JSON‑LD, теги/рубрики.

### 6.4 Медиа‑библиотека
- Хранилище: GCS, пресеты: `hero`, `card`, `thumb`.
- Метаданные: `alt` (обязателен), `rights`, `location`, `tags`.
- Массовая загрузка, поиск по тегам, замена файла (с сохранением публичной ссылки).

## 7. Публичный UX

### 7.1 Каталоги
- Фильтры: категория/теги, длительность, цена «от».
- Сортировки: популярное, цена, длительность.
- Карточка: обложка, заголовок, 3 факта, цена «от», CTA «Подробнее/Забронировать».

### 7.2 Деталка услуги
- Hero с CTA, галерея, факты, маршрут (если есть), таблица цен, FAQ, CTA «Проверить доступность» (модальное окно).

### 7.3 Блог
- Список c пагинацией; пост — обложка, контент, теги, «похожие статьи».

**KPI производительности**
- LCP ≤ 2.5 s (4G), CLS ~ 0, TBT ≤ 200 ms.
- Критический бандл ≤ 200 KB gz (главная/деталка).

## 8. UI бронирования (без онлайн‑оплаты)

**Форма**
- Контакт: имя, телефон, e‑mail (валидация).
- Параметры: дата/время, кол‑во людей, опции.

**Поток**
1) Проверка доступности (наш API + **YCLIENTS**).
2) Успех → создаём **hold**, показываем «удержано до HH:MM».
3) Показ ссылки на **PDF‑инвойс** и кнопок связи/мессенджеров.
4) В `/ops` виден созданный hold/booking; оператор подтверждает/отменяет.

**API требования**
- Все write‑запросы с заголовком `Idempotency-Key` (обязателен).
- Ошибки: `409 SLOT_OVERLAP` (или `SLOT_OVERLAP_EXTERNAL` при конфликте в YCLIENTS), `400 VALIDATION_ERROR`.
- При повторе с тем же `Idempotency-Key` возвращать байт‑в‑байт тот же ответ.
- Ссылка на спецификацию: [openapi.yaml](../openapi.yaml)

**YCLIENTS**
- Пред‑чек доступности перед `hold` и `confirm`.
- На `confirm` создаём appointment в YCLIENTS, сохраняем `external_id`.
- При недоступности слота предлагаем альтернативы и даём быстрый контакт с оператором.

## 9. `/ops` — UX задачи

- Таблица броней: фильтры по статусу (`draft|hold|confirmed|cancelled|expired`), поиски по телефону/e‑mail/ФИО.
- Быстрые действия: подтвердить/отменить, отметить оплату инвойса.
- Поля: `external_id (YCLIENTS)`, `sync-status (in-sync|desync|pending_external_cancel)`.
- Журнал действий: кто/что/когда (операции над бронями/инвойсами).
- Вид слотов по ресурсу на день/неделю.

## 10. SEO и доступность

- `sitemap.xml`, `robots.txt`, canonical, Open Graph; JSON‑LD: Organization, Service, Article.
- Автогенерация sitemap при публикации/архивировании контента.
- A11y: фокус‑ловушки в модалках, aria‑лейблы на CTA, alt на всех медиа.

## 11. Наблюдаемость и телеметрия

**События (frontend)**
- `view_service`, `cta_book_click`, `availability_checked`, `hold_created`, `hold_expired`, `invoice_viewed`.
- Отправка traceId в бэкенд; UI‑ошибки логируются с контекстом route/user agent.

**Логи (backend)**
- Структурированные записи с `traceId` для `/api/booking/*` и `/api/cron/holds-expire`.
- Алёрты: 2+ подряд фейла cron; 5xx > 2% на `/api/booking/*` за 5 минут.

## 12. Производительность

- SSG/ISR для статических страниц; кеш API‑листингов 60–300 с.
- Изображения через Next Image: `loading="lazy"`, корректные `sizes`.
- Критические стили без blocking CSS (Tailwind JIT).

## 13. Тестирование и QA

**Смоки (авто)**
- `draft → hold → invoice → confirm` (успех).
- Повторный `confirm` с тем же `Idempotency-Key` → тот же ответ, без дубля.
- Пересечение слотов → `409 SLOT_OVERLAP`.
- Истечение hold после вызова cron → `state='expired'`, UI обновился.

**Юнит‑тесты**
- Идемпотентность write‑ручек.
- Ограничения БД: EXCLUDE, capacity check.
- Преобразование данных для блоков и SEO‑мета.

**Визуальные регрессии**
- Ключевые страницы (главная, деталка услуги, блог) — скрин‑тесты на мобильном/десктопе.

## 14. Acceptance критерии Stage 3 (UI‑UX)

1. Каталоги и деталки собираются из данных/блоков; фильтры/сортировки работают.
2. Любой блок v1 можно добавить, переставить, скрыть; превью и расписание публикации работают.
3. Блог публикуется по расписанию; sitemap обновляется автоматически.
4. Форма бронирования валидируется, доступность проверяется (YCLIENTS), hold создаётся, инвойс доступен в PDF.
5. `/ops` — быстрый поиск/фильтры, внешние ID и статусы синхронизации видны, журнал пишет действия.
6. Lighthouse: LCP ≤ 2.5 s, CLS ≈ 0, TBT ≤ 200 ms; доступность ≥ 90/100.
7. A11y: клавиатурная навигация, aria/alt, фокус‑обводки корректны.
8. Документация для редактора и оператора: 2 страницы онбординга по каждому разделу.
9. Смоки и юниты зелёные в CI.

## 15. План работ (3 короткие итерации)

**Итерация A — UI‑кит и каталоги (1–1.5 недели)**
- Токены/компоненты, списки/деталки услуг/техники, навигация, медиа‑библиотека v1.
- DoD: 5 услуг и 5 единиц техники заведены и опубликованы.

**Итерация B — Блок‑редактор и блог (1 неделя)**
- Блоки v1, версии/превью, страницы «О нас/FAQ/Маршруты», блог с планированием.
- DoD: страницы «Вертолёты», «Багги», «О нас» собраны; 3 поста опубликованы.

**Итерация C — Booking UI и /ops (1 неделя)**
- Форма брони, модалки доступности, статусы hold, PDF‑инвойс, улучшения `/ops`.
- DoD: создать hold через форму, увидеть его в `/ops`, истечение видно на фронте.

## 16. Чек‑лист релиза Stage 3

- [ ] Секреты GSM актуальны; фичефлаг `YCLIENTS_ENABLED` в нужной среде.
- [ ] Каталоги/деталки/страницы/блог опубликованы (минимум контента: 6–8 страниц, 5–7 статей).
- [ ] Sitemap/robots сгенерированы, OG и JSON‑LD валидны.
- [ ] Смоки и юниты зелёные; Lighthouse метрики в норме.
- [ ] Создана `ops.editor` учётка; runbooks доступны в `docs/ops`.
- [ ] Включён Cloud Scheduler для истечения hold; алёрты настроены.

---

### Приложение A. События аналитики (названия и полезные поля)

- `view_service` — `{ serviceId, from: "list|direct|search" }`
- `cta_book_click` — `{ serviceId, position: "hero|price_table|cta" }`
- `availability_checked` — `{ serviceId, date, time, partySize }`
- `hold_created` — `{ holdId, serviceId, expiresAt }`
- `hold_expired` — `{ holdId, serviceId }`
- `invoice_viewed` — `{ invoiceId }`

### Приложение B. Блоки v1 — валидаторы

- `hero`: `headline (1..80)`, `sub (0..140)`, `bg (assetId)`, `cta{action:"book|contact", serviceId?}`
- `gallery`: `assetIds (1..12)`, `layout:"grid|masonry"`
- `text`: markdown, max ~5000 символов
- `features`: массив `{icon, text (1..60)}` 3–8 шт.
- `price_table`: строки `{label (1..40), value (1..20), note? (0..60)}`
- `route_map`: `polyline?`, `poi[]?`
- `faq`: список `{q (1..80), a (1..300)}`
- `cta`: `{action:"book|contact", serviceId?}`

---

> Этот документ — единственный источник истины для Stage 3 (UI‑UX). Все изменения фиксируются в CHANGELOG и помечаются версиями (1.1 → 1.2 и т.д.).