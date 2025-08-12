
# GTS Backend & Platform Blueprint — v1.2 (i18n)
Grand Tour Sochi · Date: 2025-08-12

> **Scope:** End‑to‑end blueprint for building a production‑grade, multilingual booking & operations platform for Grand Tour Sochi.  
> **Languages:** RU, EN, ZH (简体), AR (العربية), ES, HI.  
> **Payments:** Online checkout **OFF** at launch (off‑site invoicing), with feature‑flagged stubs for future online providers.  
> **This is a structure document** (no business numbers/secret keys).

---

## 1) Executive Summary
- Build a modular monolith backend with clean domain boundaries and a BFF for web/ops.
- Sell **individual rentals** and **seat‑sharing** (per‑seat) with slot availability, holds, and off‑site billing (invoices/PDF, manual receipt).
- Operate with an **operator dashboard** (calendar, bookings, dispatch, maintenance, transfers, incidents, reports).
- Integrate **AmoCRM**, **Avito**, **WhatsApp/Telegram/Instagram** (inbox → leads → offers → bookings).
- Provide full **i18n/l10n** across site, CMS, notifications, and PDFs (RU/EN/zh/AR/es/hi).
- Lay stubs for future **online payments** via feature flags and abstract provider layer.

---

## 2) In/Out of Scope (v1)
**In scope (v1):** Catalog, pricing rules (base + adjustments), availability/slots, booking (draft/hold/confirm), seat‑sharing, off‑site invoicing, dispatch & checklists, transfers, maintenance windows, notifications, operator dashboard, analytics basics, i18n, SEO, document/PDF generation, integrations (AmoCRM/Avito/WA/TG/IG), backups/observability, RBAC, audit.
**Out of scope (v1):** Public partner marketplace, ML pricing, deep accounting/1C sync, client login/portal (optional v2 flag), advanced loyalty gamification.

---

## 3) Architecture Approach
- **Pattern:** Modular monolith to start; clear bounded contexts; async jobs and eventing for long‑running tasks. Progressive extraction (payments/notifications) when needed.
- **Runtime:** Node.js + TypeScript (NestJS) / Go option. 
- **DB:** PostgreSQL (primary), Redis (cache/queues/ratelimits), S3‑compatible storage (media & documents).
- **Queues/Orchestration:** BullMQ (or Temporal for long workflows).
- **APIs:** Internal REST per domain; **GraphQL BFF** for web and ops.
- **Infra:** Docker, Terraform (IaC), CI/CD (GitHub Actions), Observability (OpenTelemetry + Prometheus + Grafana), Logs (ELK or Vector + ClickHouse), Secrets (Vault/SSM).
- **SLOs:** API uptime 99.9%; RPO ≤ 15 min; RTO ≤ 1 h.

---

## 4) Internationalization (i18n/l10n)
- **Locales:** `ru` (default), `en`, `zh-CN`, `ar` (rtl), `es`, `hi`.
- **Selection order:** URL prefix → cookie `lang` → user profile → `Accept-Language` → geo fallback → `ru`.
- **Storage pattern:** JSONB `*_i18n` for fixed fields; translation tables for long‑form/versions.
- **RTL:** CSS logical props; mirrored icons; email/PDF templates with `dir="rtl"` for `ar`.
- **API:** `Accept-Language` or `?lang=`, GraphQL `locale` arg; search indices per locale; ICU collation for sorting.
- **SEO:** `hreflang`, per‑locale sitemaps; localized JSON‑LD.

---

## 5) Bounded Contexts (Domains)
1. **Identity & Access (IAM)** — users, roles, permissions, 2FA, sessions, audit.
2. **CRM & Leads** — omnichannel leads (site, Avito, WA, IG, calls), statuses, tasks.
3. **Catalog & Inventory** — product types, asset units, specs/capacity, routes, locations, media, slots.
4. **Pricing & Offers** — base tariffs, rules (season/weekend/prime/location/pax), promo, club pricing, vouchers.
5. **Booking** — individual & seat‑sharing; holds, deposits (policy), documents/waivers.
6. **Billing (Off‑site)** — invoices (PDF), received/refunded states, bank/cash/POS, CSV reconciliation.
7. **Operations & Dispatch** — crew/asset/transfer assignment, readiness checklists, weather, incidents.
8. **Transfers & Logistics** — vehicles, zones/tariffs, ETA, meeting instructions.
9. **Maintenance** — service intervals, repairs, asset downtime → unavailable slots.
10. **Club & Loyalty** — tiers, perks, referrals, gift cards.
11. **Content & Media (CMS)** — copy, media albums, blog, legal docs, FAQs.
12. **Comms & Notifications** — Email/SMS/WA/TG/Push with localized templates.
13. **Analytics & BI** — events pipeline, core metrics (revenue, load, conversion, cancellations).
14. **Partners** — agent agreements, commissions, partner slot access (TBD).
15. **Compliance & Docs** — offers, waivers, insurance, contracts, retention policies.

---

## 6) Data Model (ER Sketch — high level)
**Core Entities:**
- `User`, `Role`, `Contact`
- `AssetType`, `AssetUnit`, `Route`, `Location`, `Slot`
- `PriceRule`, `Offer`
- `Booking` (aggregate), `BookingItem` (seat/unit/addon/transfer)
- `Invoice`, `Payment`(off‑site), `Refund`
- `Assignment` (crew/asset), `TransferOrder`
- `Membership`, `Voucher`
- `Document` (generated PDFs), `Incident`
- Content: `ExperienceCategory`, `Post`, `FAQ`, `LegalDoc`, `Review`, `MediaAlbum/Item`
**i18n Fields (examples):** `title_i18n`, `description_i18n`, `faq_i18n[]`, `meeting_instructions_i18n`, `label_i18n`.

_State Machines (key):_
- **Booking:** `draft → on_hold → confirmed → in_progress → completed | canceled(by_client|no_show|by_weather)`
- **Payment (off‑site):** `pending → received → refunded`
- **Slot:** `planned → held → confirmed → locked_maintenance → done`
- **AssetUnit:** `active → maintenance → inactive`

---

## 7) Key Workflows
### 7.1 Individual Booking
1. Client selects product/route/slot → backend returns `Offer` with price breakdown.
2. Create `Booking(draft)` + **hold** slot (TTL by policy).
3. Generate **Invoice** (PDF) with deadline; send localized instructions.
4. Operator marks **Payment Received** (off‑site) → `Booking.confirmed`.
5. Dispatch: assign asset/crew/transfer; send T‑24/‑3/‑1h reminders.
6. After ride: close booking, docs/receipts, review request, club upsell.

### 7.2 Seat‑Sharing
1. Operator creates `GroupSlot` with capacity, min threshold, deadline.
2. Publish schedule on site; sell seats; collect off‑site payments.
3. At deadline: if threshold reached → confirm; else → postpone/refund by policy.
4. Dispatch, notifications, boarding vouchers.

### 7.3 Inbound Leads (Avito/WA/IG)
- Ingest → create `Lead(source)` → intent matcher → auto‑offer or operator task → hold + invoice link (off‑site) → confirm.

### 7.4 Weather/Cancel/Move
- Weather provider → `WeatherAlert` → mass notify → replan/move/refund per policy.

### 7.5 Maintenance/Downtime
- Meter/odometer → service reminders → block slots → reassign bookings.

---

## 8) Policies (placeholders)
- **Hold TTL:** same‑day: 2h; future: 24h (override per product).
- **Deposits:** individual: 30%; seat‑sharing: 100% (off‑site).
- **Cancellation:** >24h free move/refund; <24h deposit kept; no‑show: charge first hour/leg.
- **Weather:** free move/refund; define hard criteria (wind/sea/visibility).

> Exact values to be confirmed; stored in Policy tables with effective dates and i18n labels.

---

## 9) Integrations (v1)
- **AmoCRM:** bi‑directional sync (leads/deals/stages/tasks). Field mapping doc.
- **Messengers:** WhatsApp Business, Telegram Bot, Instagram Messaging (provider/webhooks).
- **Avito API:** listings & chats (lead attribution).
- **Telephony:** call tracking & recordings → lead linkage.
- **Geo/Maps:** meeting points, routing/ETA.
- **Email/SMS providers:** transactional sending domains.
- **Storage:** S3 compatible (media, PDFs).

---

## 10) API Layer (high level)
**Public (read/flows):**
- `GET /api/public/catalog/featured?lang=...`
- `GET /api/public/catalog/categories?lang=...`
- `GET /api/public/routes/{id}?lang=...`
- `GET /api/public/availability?…&lang=...`
- `GET /api/public/seatsharing/schedule?lang=...`
- `POST /api/public/forms/{contact|corporate}?lang=...`

**Booking/Billing Flows:**
- `POST /api/booking/draft`
- `POST /api/booking/hold`
- `GET  /api/booking/{code}`
- `POST /api/booking/{code}/modify`
- `POST /api/booking/{code}/cancel-request`
- `GET  /api/billing/invoices/{code}`
- `GET  /api/billing/invoices/{code}/pdf`

**Ops (JWT + RBAC):**
- `/api/ops/{catalog|pricing|slots|bookings|invoices|assignments|checklists|leads|inbox|transfers|maintenance|incidents|reports|settings}/*`

**Webhooks:**
- `/webhooks/{avito|whatsapp|instagram|telegram|weather}`
- `/webhooks/payments` (feature‑flag OFF)

**GraphQL BFF:** Queries/Mutations for web & ops; every field accepts `locale` where applicable.

**Idempotency:** `Idempotency-Key` header on critical POST/PUT.

---

## 11) Payments: OFF‑Site + Future Online Stubs
- **Feature flag:** `FEATURE_PAYMENTS_ONLINE=false`.
- **Provider abstraction:** `PaymentProvider` with adapters: `NullProvider` (default), `YooKassa/Stripe/CloudPayments` (later).
- **DB ready:** `payments(provider, external_id, status, amount, currency, raw_payload JSONB, idempotency_key, method(cash|bank_transfer|pos), received_by/at)` and `refunds`.
- **Booking state not hard‑tied** to payment state (event‑driven).
- **Sandbox:** fake webhooks for end‑to‑end tests (when enabled).

---

## 12) Security & Compliance
- PII minimization; TLS everywhere; encryption at rest; secrets in Vault/SSM.
- RBAC + audit log for all critical actions.
- Fraud/abuse: velocity rules, duplicate suppression.
- Backups: PostgreSQL PITR; daily S3 snapshots; restore drills.
- Data retention: calls/chats/docs with defined lifetimes.
- Legal: Russian docs are the authoritative version; other languages are informational.

---

## 13) Observability
- **Tracing:** end‑to‑end `trace-id` propagation.
- **Tech metrics:** CPU, mem, p95 latency, queue depth, error rates.
- **Business metrics:** bookings/hours/revenue/channel conversion/cancellations/asset load.
- **i18n metrics:** translation coverage by entity & locale; missing keys dashboard.
- **Alerts:** SLO breaches, payment marking delays, hold expirations spike, no‑show spike.

---

## 14) Operator Console (ops.gts.ru)
- **Dashboard:** slots/bookings/payments/incidents.
- **Calendar:** day/week by assets/locations; filters; slot templates generation.
- **Bookings board:** kanban by status; actions (hold/confirm/move/cancel).
- **Booking detail:** client, items, invoices, docs, timeline.
- **Assignments:** asset/crew/transfer; readiness checklists.
- **Leads & Inbox:** unified messaging; convert to booking.
- **Catalog & Pricing:** assets, routes, price rules, media.
- **Transfers:** tariffs/orders, driver contacts.
- **Maintenance/Incidents:** plans, tickets, blocks, investigations.
- **Reports:** revenue, asset load, lead channels, cancellations, SLA responses.
- **Settings:** roles/permissions, templates (docs/notifications), integrations.

---

## 15) CMS Content Models (i18n fields implied)
- `ExperienceCategory(title_i18n, slug, cover, intro_i18n, order)`
- `Route(title_i18n, slug, category, duration, capacity, min_age/weight, includes_i18n[], not_included_i18n[], map/waypoints, safety_i18n, faq_i18n[], meeting_instructions_i18n, gallery[])`
- `AssetType/AssetUnit(title_i18n, specs, capacity, photos, status)`
- `Location(title_i18n, coords, meeting_instructions_i18n)`
- `PriceRule(scope, condition, value, priority, valid_from/to, label_i18n)`
- `SeatSharingGroup(route/ref asset, datetime, capacity, min_threshold, deadline, price_per_seat, notes_i18n)`
- `TransferTariff(zone_from/to, class, base, per_km/min, wait, night_coef, label_i18n)`
- `Post/FAQ/LegalDoc/Review/Partner/MediaAlbum/Item`

---

## 16) SEO
- `hreflang` & `x-default`; per‑locale sitemaps.
- JSON‑LD (`Organization`, `Product/Service`, `Event`) per locale.
- Canonical to `canonical_slug`; OpenGraph localized.

---

## 17) Forms & Validation
- **Public forms:** contact, corporate brief, booking start; i18n placeholders/errors.
- **Validation:** Unicode names; E.164 phones; email IDN safe; consent checkboxes.
- **Accessibility:** RTL inputs for `ar`; screen‑reader labels; color‑contrast AA.

---

## 18) Notifications Catalog (samples)
| Event | Channels | Template Keys |
|---|---|---|
| booking_hold_placed | WA/SMS/Email | `{{booking.code}}`, `{{slot.start_at}}`, `{{pay.deadline}}` |
| payment_received | WA/Email | `{{booking.code}}`, `{{amount}}`, `{{balance}}` |
| assignment_set | WA | `{{meet.place}}`, `{{crew.name}}`, `{{phone}}` |
| t_minus_24h | WA/Email | `{{start_at}}`, `{{weather.link}}` |
| weather_alert | WA | `{{alert}}`, `{{options}}` |

*All templates localized; RTL variants for `ar`.*

---

## 19) RBAC (draft)
| Role | Permissions |
|---|---|
| Admin | All domains |
| Operator | Leads/Offers/Bookings (create/update), Invoices (mark received), Docs |
| Dispatcher | Assignments, Slots, Transfers |
| Captain/Pilot/Instructor | My trips & checklists |
| Mechanic | Maintenance, Incidents |
| Accountant | Invoices/Payments/Refunds, Reports |
| Partner | Limited slots/prices (TBD) |
| Client | Booking manage (code-based), later JWT |

---

## 20) Roadmap
**A. Discovery (1–2 w)** — process inventory, policies, integration map.  
**B. MVP Booking (6–8 w)** — catalog, base pricing, holds + invoices, slots calendar, ops v1, notifications, basic reports.  
**C. Seat‑Sharing & Club (4–6 w)** — group slots, thresholds, basic loyalty, vouchers.  
**D. Ops & Maintenance (4–6 w)** — dispatch, checklists, maintenance, incidents.  
**E. Scale‑out** — extract payments/notifications, caching, async flows.

---

## 21) Pre‑Development Checklist
- Process maps per product; RACI & SLA; weather/incidents rules.
- Policies matrices: deposits, holds, cancellations/no‑show, seat‑sharing thresholds & deadlines, transfer tariffs.
- Reference data: assets, routes, locations, slot templates; pricing rules; options.
- Docs: offers/contracts/waivers/vouchers (per locale); message templates.
- Integrations mapping (AmoCRM/Avito/WA/TG/IG), import of historical leads; dedupe rules.
- Environments: dev/stage/prod; domains/TLS; secrets; backups/restore plan.
- RBAC roles; 2FA; audit.
- Test plan; load targets; UAT; Go‑Live plan (freeze/rollback/on‑duty).

---

## 22) Event Catalog (examples)
- `LeadCreated/Updated`, `OfferCreated`, `BookingDrafted`, `HoldPlaced`, `HoldExpired`, `PaymentReceived`, `BookingConfirmed`, `BookingMoved`, `BookingCanceled`, `AssignmentSet`, `TransferOrdered`, `MaintenanceScheduled`, `IncidentReported`, `WeatherAlertReceived`, `NotificationSent/Failed`.

---

## 23) Non‑Functional
- API p95 ≤ 300 ms (reads), 99.9% uptime; retry policies & idempotency.
- Data retention & privacy; audit trails.
- CDN for media; caching strategies; rate limits.

---

## 24) DevOps & Environments
- Envs: dev/stage/prod; CI/CD; IaC; backups & PITR; secrets rotation.
- Logging policies; audit retention; metrics/alerts dashboards.
- Import scripts (AmoCRM/Avito), idempotent & resumable.

---

## 25) Migrations & Imports
- Add `preferred_language` to users/contacts.
- Add `*_i18n` to content tables.
- Historic data import; phone normalization; dedupe; mapping tables.

---

## 26) Testing & Go‑Live
- **E2E:** happy paths (individual/seat‑sharing), errors (hold timeout, <24h cancel, weather), ops flows.
- **i18n:** pseudo‑locale, RTL visual tests, fallback coverage, missing‑keys alarms.
- **Load:** p95 under target at peak (T‑1h spikes).
- **Go‑Live:** soft launch, freeze window, rollback plan, on‑duty war‑room, post‑launch monitoring.

---

## 27) Placeholders Dictionary (Docs/Comms)
`{{booking.code}}`, `{{slot.start_at}}`, `{{slot.end_at}}`, `{{route.title}}`, `{{asset.name}}`, `{{meet.place}}`, `{{meet.instructions}}`, `{{crew.name}}`, `{{crew.phone}}`, `{{pax.count}}`, `{{invoice.number}}`, `{{amount.total}}`, `{{amount.deposit}}`, `{{pay.deadline}}`, `{{policy.cancel_url}}`

---

## 28) Appendices
- **Feature Flags:** `FEATURE_PAYMENTS_ONLINE`, `FEATURE_SEAT_SHARING`, `FEATURE_ACCOUNT`, `FEATURE_PARTNER_PORTAL`, `FEATURE_I18N`.
- **Error Codes (draft):** `BOOKING_HOLD_EXPIRED`, `BOOKING_CANNOT_MOVE`, `INVOICE_NOT_FOUND`, `ASSET_UNAVAILABLE`, `WEATHER_BLOCKED`, `RBAC_DENIED`.

— End of Blueprint v1.2 (i18n) —
