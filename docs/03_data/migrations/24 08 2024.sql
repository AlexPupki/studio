-- PostgreSQL 17 — GTS core schema v1.1 (Audited)
-- idempotency для dev миграций: создаём расширения и домены, если их нет

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist; -- [IMPROVEMENT] Needed for EXCLUDE constraint

-- Домены/типы
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('draft','pending','confirmed','in_service','completed','canceled','no_show','refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending','authorized','captured','failed','refunded','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cash','card','bank_transfer','online_gateway','internal');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_kind') THEN
    CREATE TYPE party_kind AS ENUM ('customer','staff','partner','vendor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_kind') THEN
    CREATE TYPE equipment_kind AS ENUM ('boat','jetski','buggy','slingshot','helicopter','other');
  END IF;
END$$;

-- Универсальная таблица "актеров" (клиенты/персонал/партнёры) — меньше дублей
CREATE TABLE party (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind              party_kind NOT NULL,
  full_name         text NOT NULL,
  phone             text,
  email             text,
  doc_id            text,                 -- паспорт/удостоверение, если надо
  company_name      text,                 -- для партнёров/юр.лиц
  tax_number        text,                 -- ИНН/аналоги
  notes             text,
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  -- [IMPROVEMENT] Ensure at least one contact method is present
  CONSTRAINT check_contact_info CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX party_kind_idx ON party(kind);
CREATE UNIQUE INDEX party_email_uniq ON party(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX party_phone_trgm ON party USING gin (phone gin_trgm_ops);

-- Роли и привязка к party для staff/админки
CREATE TABLE role (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        text UNIQUE NOT NULL, -- admin, manager, captain, guide, agent
  label       text NOT NULL
);

CREATE TABLE party_role (
  party_id    uuid REFERENCES party(id) ON DELETE CASCADE,
  role_id     uuid REFERENCES role(id)  ON DELETE CASCADE,
  PRIMARY KEY (party_id, role_id)
);

-- Локации/порты/базы вылета
CREATE TABLE location (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  address       text,
  geo_point     point,                 -- простая гео-точка
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Категории техники
CREATE TABLE equipment_category (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          text UNIQUE NOT NULL,  -- 'boat','jetski','buggy','slingshot','helicopter'
  title         text NOT NULL,
  kind          equipment_kind NOT NULL,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Единицы техники
CREATE TABLE equipment (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     uuid NOT NULL REFERENCES equipment_category(id) ON DELETE RESTRICT,
  code            text NOT NULL,  -- инвентарный код/бортовой
  title           text NOT NULL,         -- Yamaha 252S "Redline", Polaris Slingshot R и т.д.
  brand           text,
  model           text,
  year            int,
  seats           int,
  power_hp        int,
  vin_or_reg      text,
  location_id     uuid REFERENCES location(id) ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  purchase_price  numeric(14,2),
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb, -- сюда DRiVE, аудиосистема, лимиты и прочее
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
-- [IMPROVEMENT] Case-insensitive unique index for equipment code
CREATE UNIQUE INDEX equipment_code_uniq_idx ON equipment (UPPER(code));
CREATE INDEX equipment_category_idx ON equipment(category_id);
CREATE INDEX equipment_active_idx ON equipment(is_active);

-- Медиа по технике
CREATE TABLE equipment_media (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id  uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  kind          text NOT NULL,       -- image, video, doc
  url           text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX equipment_media_eq_idx ON equipment_media(equipment_id, kind);

-- Обслуживание техники
CREATE TABLE maintenance_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id  uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  performed_at  timestamptz NOT NULL DEFAULT now(),
  mileage_or_hours int,
  title         text NOT NULL,
  details       text,
  cost          numeric(14,2),
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid REFERENCES party(id) ON DELETE SET NULL
);
CREATE INDEX maintenance_eq_idx ON maintenance_log(equipment_id, performed_at DESC);

-- Справочник услуг/продуктов (единообразно для аренды, маршрутов, пакетов)
CREATE TABLE product (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             text UNIQUE,                   -- опционально
  title           text NOT NULL,                 -- "Аренда катера 1 час", "Heli sharing 15 мин (место сзади)"
  kind            text NOT NULL,                 -- rental, route, corporate, addon, giftcard
  category_id     uuid REFERENCES equipment_category(id) ON DELETE SET NULL,
  default_duration_min int,                      -- 10, 60, 120, 240 ...
  capacity        int,                           -- кол-во мест (для sharing/групп)
  description     text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_kind_idx ON product(kind);
CREATE INDEX product_active_idx ON product(is_active);

-- Прайс-лист с периодом действия и вариативностью (локация, будни/выходные, сезон)
CREATE TABLE price_list (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  location_id     uuid REFERENCES location(id) ON DELETE SET NULL,
  valid_from      date NOT NULL,
  valid_to        date,
  amount          numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  conditions      jsonb NOT NULL DEFAULT '{}'::jsonb, -- сезон, "до 6 чел", "до 11 чел", "место спереди"
  UNIQUE(product_id, location_id, valid_from, COALESCE(valid_to, '9999-12-31'::date))
);
CREATE INDEX price_product_date_idx ON price_list(product_id, valid_from DESC);

-- Маршруты как услуга: гео-точки и описания
CREATE TABLE route (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         text NOT NULL,
  summary       text,
  duration_min  int,
  difficulty    text,
  is_private    boolean NOT NULL DEFAULT false,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb   -- например, "Ахун 15 мин", "Олимпийский парк 30-45"
);

CREATE TABLE route_point (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id      uuid NOT NULL REFERENCES route(id) ON DELETE CASCADE,
  name          text,
  order_no      int NOT NULL DEFAULT 0,
  geo_point     point,
  note          text
);
CREATE INDEX route_point_route_idx ON route_point(route_id, order_no);

-- Слоты доступности техники/продукта (для календаря)
CREATE TABLE availability (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id    uuid REFERENCES equipment(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES product(id) ON DELETE CASCADE,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  stock           int NOT NULL DEFAULT 1,              -- места для sharing
  lock_reason     text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (ends_at > starts_at),
  -- [CRITICAL IMPROVEMENT] Prevents creating overlapping slots for the same piece of equipment.
  CONSTRAINT no_overlapping_slots EXCLUDE USING gist (
      equipment_id WITH =,
      tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (equipment_id IS NOT NULL)
);
CREATE INDEX availability_time_idx ON availability(starts_at, ends_at);
CREATE INDEX availability_eq_idx ON availability(equipment_id);

-- Бронирования (шапка)
CREATE TABLE booking (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            text UNIQUE NOT NULL,                 -- удобный короткий код брони
  customer_id     uuid NOT NULL REFERENCES party(id) ON DELETE RESTRICT,
  status          booking_status NOT NULL DEFAULT 'pending',
  booked_at       timestamptz NOT NULL DEFAULT now(),
  starts_at       timestamptz,
  ends_at         timestamptz,
  location_id     uuid REFERENCES location(id) ON DELETE SET NULL,
  agent_id        uuid REFERENCES party(id) ON DELETE SET NULL, -- партнёр/агент, если привёл
  notes           text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX booking_status_time_idx ON booking(status, starts_at);
CREATE INDEX booking_customer_idx ON booking(customer_id);

-- Позиции бронирования: продукт + конкретная техника/слот
CREATE TABLE booking_item (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  equipment_id    uuid REFERENCES equipment(id) ON DELETE SET NULL, -- фиксируем борта по возможности
  route_id        uuid REFERENCES route(id) ON DELETE SET NULL,
  qty             int NOT NULL DEFAULT 1,
  unit_price      numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  starts_at       timestamptz,
  ends_at         timestamptz,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX booking_item_booking_idx ON booking_item(booking_id);

-- Скидки/промо на уровне брони
CREATE TABLE booking_discount (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  code            text,
  title           text,
  amount          numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Чеки/счета (invoice)
CREATE TABLE invoice (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      uuid UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
  number          text UNIQUE NOT NULL,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  due_at          timestamptz,
  subtotal        numeric(14,2) NOT NULL,
  discount_total  numeric(14,2) NOT NULL DEFAULT 0,
  total           numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Платежи: партиционирование по месяцам (чтобы потом не плакать на отчётах)
CREATE TABLE payment (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      uuid REFERENCES booking(id) ON DELETE SET NULL,
  invoice_id      uuid REFERENCES invoice(id) ON DELETE SET NULL,
  method          payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount          numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  paid_at         timestamptz,
  provider_ref    text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- текущий месяц (создавай по cron следующий месяц)
CREATE TABLE payment_2025_08 PARTITION OF payment
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

-- [IMPROVEMENT] Removed "ON ONLY" to allow indexes to be inherited by partitions.
CREATE INDEX payment_status_idx ON payment(status);
CREATE INDEX payment_created_idx ON payment(created_at);

-- Возвраты
CREATE TABLE refund (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id      uuid NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  amount          numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  reason          text,
  status          payment_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz
);

-- Комиссии агентам/партнёрам
CREATE TABLE agent_commission (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES party(id) ON DELETE RESTRICT,
  base_amount     numeric(14,2) NOT NULL,
  percent         numeric(5,2) NOT NULL,     -- 10.00, 15.00 ...
  commission      numeric(14,2) NOT NULL,
  currency        char(3) NOT NULL DEFAULT 'RUB',
  is_paid         boolean NOT NULL DEFAULT false,
  paid_at         timestamptz,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (booking_id, agent_id)
);

-- Клубные уровни и участники
CREATE TABLE membership_tier (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          text UNIQUE NOT NULL,  -- bronze/silver/gold/platinum (или твои)
  title         text NOT NULL,
  perks         jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE membership (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id      uuid NOT NULL REFERENCES party(id) ON DELETE CASCADE,
  tier_id       uuid NOT NULL REFERENCES membership_tier(id) ON DELETE RESTRICT,
  started_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  status        text NOT NULL DEFAULT 'active',
  points        int NOT NULL DEFAULT 0,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (party_id, tier_id, status) 
);

-- Подарочные сертификаты и промокоды
CREATE TABLE gift_card (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          text UNIQUE NOT NULL,
  initial_amount numeric(14,2) NOT NULL,
  balance       numeric(14,2) NOT NULL,
  currency      char(3) NOT NULL DEFAULT 'RUB',
  expires_at    timestamptz,
  issued_to     uuid REFERENCES party(id) ON DELETE SET NULL,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE coupon (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          text UNIQUE NOT NULL,
  title         text,
  percent_off   numeric(5,2),
  amount_off    numeric(14,2),
  currency      char(3) DEFAULT 'RUB',
  valid_from    timestamptz,
  valid_to      timestamptz,
  conditions    jsonb NOT NULL DEFAULT '{}'::jsonb  -- "только будни", "только boat" и т.п.
);

-- Применение сертификатов/купон к брони
CREATE TABLE booking_payment_applied (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  gift_card_id  uuid REFERENCES gift_card(id) ON DELETE SET NULL,
  coupon_id     uuid REFERENCES coupon(id) ON DELETE SET NULL,
  amount        numeric(14,2) NOT NULL DEFAULT 0,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Логи аудита (минимально, без фанатизма)
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      uuid REFERENCES party(id) ON DELETE SET NULL,
  event         text NOT NULL,             -- 'booking.create','booking.cancel','price.update' ...
  entity        text NOT NULL,             -- 'booking','payment','equipment'
  entity_id     uuid,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_log(entity, created_at DESC);

-- Умные представления (для отчётов и API)
CREATE OR REPLACE VIEW v_booking_totals AS
SELECT
  b.id,
  b.code,
  b.status,
  COALESCE(i.total, 0) AS total,
  COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.booking_id = b.id AND p.status IN ('authorized','captured')), 0) AS paid,
  COALESCE((SELECT SUM(r.amount) FROM refund r JOIN payment p ON p.id = r.payment_id WHERE p.booking_id = b.id AND r.status IN ('captured','refunded')), 0) AS refunded
FROM booking b
LEFT JOIN invoice i ON i.booking_id = b.id;

-- Триггеры updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER t_party_touch BEFORE UPDATE ON party FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_equipment_touch BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_product_touch BEFORE UPDATE ON product FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER t_booking_touch BEFORE UPDATE ON booking FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Базовые записи (минимум)
INSERT INTO role (slug,label) VALUES
  ('admin','Administrator'),
  ('manager','Manager'),
  ('captain','Captain'),
  ('guide','Guide'),
  ('agent','Agent')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO equipment_category (slug,title,kind) VALUES
  ('boat','Катера','boat'),
  ('jetski','Гидроциклы','jetski'),
  ('buggy','Багги','buggy'),
  ('slingshot','Slingshot','slingshot'),
  ('helicopter','Вертолёты','helicopter')
ON CONFLICT (slug) DO NOTHING;

-- Пример локаций (Сочи / Красная Поляна)
INSERT INTO location (slug,title,address) VALUES
  ('sochi_port','Порт Сочи',NULL),
  ('krasnaya_polyana','Красная Поляна',NULL)
ON CONFLICT (slug) DO NOTHING;

-- RLS заготовки (включишь, когда дойдёшь до multi-tenant/агентских кабинетов)
-- ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY booking_by_agent ON booking
--   FOR SELECT USING (agent_id = current_setting('app.current_party_id', true)::uuid);
