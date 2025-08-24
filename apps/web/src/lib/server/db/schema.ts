'use server';

import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  integer,
  bigint,
  boolean,
  char,
  jsonb,
  primaryKey,
  serial,
  uniqueIndex,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// #region Enums

export const userStatusEnum = pgEnum('user_status', ['active', 'blocked']);
export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'staff',
  'editor',
  'ops.viewer',
  'ops.editor',
  'admin',
]);
export const routeStatusEnum = pgEnum('route_status', ['draft', 'active', 'archived']);
export const bookingStateEnum = pgEnum('booking_state', ['draft', 'hold', 'invoice', 'confirm', 'cancel']);
export const bookingCancelReasonEnum = pgEnum('booking_cancel_reason', ['user_request', 'expired', 'ops_request']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['issued', 'paid', 'void']);
export const pageStatusEnum = pgEnum('page_status', ['draft', 'published', 'archived']);
export const postStatusEnum = pgEnum('post_status', ['draft', 'scheduled', 'published', 'archived']);

export const actorTypeEnum = pgEnum('actor_type', ['system', 'user', 'ops']);
export const entityTypeEnum = pgEnum('entity_type', [
  'booking',
  'invoice',
  'slot',
  'user',
  'system',
  'page',
  'post',
  'category',
  'tag',
]);

// #endregion

// #region IAM (Identity & Access Management)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneE164: text('phone_e164').notNull().unique(),
  status: userStatusEnum('status').notNull().default('active'),
  roles: userRoleEnum('roles')
    .array()
    .notNull()
    .default(['customer']),
  preferredLanguage: char('preferred_language', { length: 2 }).notNull().default('ru'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).notNull().defaultNow(),
});

export const loginCodes = pgTable('login_codes', {
  id: serial('id').primaryKey(),
  phoneE164: text('phone_e164').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// #endregion

// #region Catalog & Booking

export const routes = pgTable(
  'routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    status: routeStatusEnum('status').notNull().default('draft'),
    title: jsonb('title').notNull(),
    description: jsonb('description'),
    meetingPoint: jsonb('meeting_point'),
    durationMinutes: integer('duration_minutes').notNull(),
    basePriceMinor: bigint('base_price_minor', { mode: 'number' }).notNull(),
    gallery: text('gallery').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugUk: unique('routes_slug_unique').on(table.slug),
  }),
);

export const slots = pgTable(
  'slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routeId: uuid('route_id')
      .notNull()
      .references(() => routes.id),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    capacityTotal: integer('capacity_total').notNull(),
    capacityHeld: integer('capacity_held').notNull().default(0),
    capacityConfirmed: integer('capacity_confirmed').notNull().default(0),
  },
  (table) => ({
    routeStartAtIndex: uniqueIndex('route_start_at_idx').on(table.routeId, table.startAt),
    // GIST-индекс для предотвращения пересечений слотов для одного и того же маршрута
    // exclude: `EXCLUDE USING GIST (route_id WITH =, tsrange(start_at, end_at) WITH &&)`,
  }),
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    state: bookingStateEnum('state').notNull(),
    cancelReason: bookingCancelReasonEnum('cancel_reason'),
    slotId: uuid('slot_id')
      .notNull()
      .references(() => slots.id),
    qty: integer('qty').notNull(),
    customerName: text('customer_name').notNull(),
    customerPhoneE164: text('customer_phone_e164').notNull(),
    paymentRef: text('payment_ref'),
    holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    holdExpireIdx: index('hold_expire_idx').on(table.holdExpiresAt),
  }),
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id),
    number: text('number').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('RUB'),
    status: invoiceStatusEnum('status').notNull(),
    pdfPath: text('pdf_path'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => ({
    invoiceNumberUk: uniqueIndex('invoice_number_uk').on(table.number),
  }),
);

// #endregion

// #region CMS (Content Management System)

export const pages = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    status: pageStatusEnum('status').notNull().default('draft'),
    title: text('title').notNull(),
    contentBlocks: jsonb('content_blocks'),
    seoMeta: jsonb('seo_meta'),
    authorId: text('author_id'), // Assuming author is external or just a name/ID string
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugUk: unique('pages_slug_unique').on(table.slug),
  }),
);

export const pageVersions = pgTable('page_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  contentBlocks: jsonb('content_blocks'),
  authorId: text('author_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
  },
  (table) => ({
    slugUk: unique('categories_slug_unique').on(table.slug),
  }),
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
  },
  (table) => ({
    slugUk: unique('tags_slug_unique').on(table.slug),
  }),
);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    content: text('content'),
    excerpt: text('excerpt'),
    coverImageUrl: text('cover_image_url'),
    status: postStatusEnum('status').notNull().default('draft'),
    authorId: text('author_id'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugUk: unique('posts_slug_unique').on(table.slug),
  }),
);

export const postsToTags = pgTable(
  'posts_to_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  }),
);

// #endregion

// #region System & Audit

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idempUniqueIdx: uniqueIndex('idemp_unique_idx').on(table.scope, table.key),
  }),
);

export const requestLogs = pgTable('request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  traceId: uuid('trace_id').notNull(),
  userId: text('user_id'),
  role: text('role'),
  method: text('method').notNull(),
  path: text('path').notNull(),
  ip: text('ip'),
  status: integer('status').notNull(),
  durationMs: integer('duration_ms').notNull(),
  errorCode: text('error_code'),
});

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  traceId: uuid('trace_id'),
  actorType: actorTypeEnum('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id'),
  data: jsonb('data'),
});

// #endregion

// #region Relations

export const slotsRelations = relations(slots, ({ one, many }) => ({
  route: one(routes, {
    fields: [slots.routeId],
    references: [routes.id],
  }),
  bookings: many(bookings),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  slots: many(slots),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  slot: one(slots, {
    fields: [bookings.slotId],
    references: [slots.id],
  }),
  invoice: one(invoices, {
    fields: [bookings.id],
    references: [invoices.bookingId],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  booking: one(bookings, {
    fields: [invoices.bookingId],
    references: [bookings.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  postsToTags: many(postsToTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postsToTags: many(postsToTags),
}));

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tagId],
    references: [tags.id],
  }),
}));

// #endregion
