import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  pgTableCreator,
  uniqueIndex,
  check,
  bigint,
  char,
  unique,
  jsonb,
  smallint,
} from "drizzle-orm/pg-core";

export const bookingStateEnum = pgEnum("booking_state", ['draft', 'hold', 'invoice', 'confirm', 'cancel']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['issued', 'paid', 'void']);
export const actorTypeEnum = pgEnum('actor_type', ['system', 'user', 'ops']);
export const entityTypeEnum = pgEnum('entity_type', ['booking', 'invoice', 'slot', 'user']);


export const routes = pgTable("routes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const slots = pgTable("slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  routeId: uuid("route_id").notNull().references(() => routes.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  capacityTotal: integer("capacity_total").notNull(),
  capacityHeld: integer("capacity_held").default(0).notNull(),
  capacityConfirmed: integer("capacity_confirmed").default(0).notNull(),
}, (table) => {
  return {
    routeStartAtIndex: uniqueIndex("route_start_at_idx").on(table.routeId, table.startAt),
    capacityCheck: check(
      "capacity_check",
      `"capacity_total" >= "capacity_held" + "capacity_confirmed"`
    ),
  };
});

export const bookings = pgTable("bookings", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    state: bookingStateEnum('state').notNull(),
    slotId: uuid('slot_id').notNull().references(() => slots.id),
    qty: integer('qty').notNull(),
    customerName: text('customer_name').notNull(),
    customerPhoneE164: text('customer_phone_e164').notNull(),
    paymentRef: text('payment_ref'),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const invoices = pgTable("invoices", {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().references(() => bookings.id).unique(),
    number: text('number').notNull().unique(),
    amountMinor: bigint('amount_minor', {mode: 'number'}).notNull(),
    currency: char('currency', {length: 3}).notNull().default('RUB'),
    status: invoiceStatusEnum('status').notNull(),
    pdfPath: text('pdf_path'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
});

export const requestLogs = pgTable("request_logs", {
    id: uuid('id').primaryKey().defaultRandom(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
    traceId: uuid('trace_id').notNull(),
    userId: text('user_id'),
    role: text('role'),
    method: text('method').notNull(),
    path: text('path').notNull(),
    ip: text('ip'),
    status: smallint('status').notNull(),
    durationMs: integer('duration_ms').notNull(),
    errorCode: text('error_code'),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid('id').primaryKey().defaultRandom(),
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
  traceId: uuid('trace_id'),
  actorType: actorTypeEnum('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id'),
  data: jsonb('data'),
});
