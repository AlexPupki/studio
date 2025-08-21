import {
  boolean,
  char,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
  bigint,
} from 'drizzle-orm/pg-core';

// --- ENUMS ---
export const userStatusEnum = pgEnum('user_status', ['active', 'blocked']);
export const userRoleEnum = pgEnum('user_role', ['customer', 'staff', 'editor', 'ops.viewer', 'ops.editor', 'admin']);

export const bookingStateEnum = pgEnum('booking_state', [
  'draft',
  'hold',
  'invoice',
  'confirm',
  'cancel',
]);
export const bookingCancelReasonEnum = pgEnum('booking_cancel_reason', [
  'user_request',
  'expired',
  'ops_request',
]);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'issued',
  'paid',
  'void',
]);
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
export const routeStatusEnum = pgEnum('route_status', [
  'draft',
  'active',
  'archived',
]);
export const pageStatusEnum = pgEnum('page_status', [
  'draft',
  'published',
  'archived',
]);
export const postStatusEnum = pgEnum('post_status', [
    'draft',
    'scheduled',
    'published',
    'archived',
]);


// --- TABLES ---

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    phoneE164: text('phone_e164').notNull().unique(),
    status: userStatusEnum('status').default('active').notNull(),
    roles: userRoleEnum('roles').array().default(['customer']).notNull(),
    preferredLanguage: char('preferred_language', { length: 2 }).default('ru').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }).defaultNow().notNull(),
});

export const loginCodes = pgTable('login_codes', {
    id: serial('id').primaryKey(),
    phoneE164: text('phone_e164').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  status: pageStatusEnum('status').default('draft').notNull(),
  title: text('title').notNull(),
  contentBlocks: jsonb('content_blocks').$type<any[]>(),
  seoMeta: jsonb('seo_meta').$type<Record<string, string>>(),
  authorId: text('author_id'), // Assuming author is a user ID (string)
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const pageVersions = pgTable('page_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  contentBlocks: jsonb('content_blocks').$type<any[]>(),
  authorId: text('author_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
});

export const tags = pgTable('tags', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
});

export const posts = pgTable('posts', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    content: text('content'),
    excerpt: text('excerpt'),
    coverImageUrl: text('cover_image_url'),
    status: postStatusEnum('status').default('draft').notNull(),
    authorId: text('author_id'), // Assuming a simple string ID for now
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const postsToTags = pgTable('posts_to_tags', {
    postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  }, (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  })
);

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  status: routeStatusEnum('status').default('draft').notNull(),
  title: jsonb('title').$type<Record<string, string>>().notNull(),
  description: jsonb('description').$type<Record<string, string>>(),
  meetingPoint: jsonb('meeting_point').$type<Record<string, string>>(),
  durationMinutes: integer('duration_minutes').notNull(),
  basePriceMinor: bigint('base_price_minor', { mode: 'number' }).notNull(),
  gallery: text('gallery').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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
    capacityHeld: integer('capacity_held').default(0).notNull(),
    capacityConfirmed: integer('capacity_confirmed').default(0).notNull(),
  },
  (table) => {
    return {
      routeStartAtIndex: uniqueIndex('route_start_at_idx').on(
        table.routeId,
        table.startAt
      ),
      capacityCheck: check(
        'capacity_check',
        `"capacity_total" >= "capacity_held" + "capacity_confirmed" AND "capacity_total" >= 0 AND "capacity_held" >= 0 AND "capacity_confirmed" >= 0`
      ),
    };
  }
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
  (table) => {
    return {
      holdExpireIdx: index('hold_expire_idx').on(table.holdExpiresAt),
    };
  }
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id)
      .unique(),
    number: text('number').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull().default('RUB'),
    status: invoiceStatusEnum('status').notNull(),
    pdfPath: text('pdf_path'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (table) => {
    return {
      invoiceNumberUk: uniqueIndex('invoice_number_uk').on(table.number),
    };
  }
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => {
    return {
      idempUniqueIdx: uniqueIndex('idemp_unique_idx').on(
        table.scope,
        table.key
      ),
    };
  }
);

export const requestLogs = pgTable('request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
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
  ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
  traceId: uuid('trace_id'),
  actorType: actorTypeEnum('actor_type').notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: text('entity_id'),
  data: jsonb('data'),
});
