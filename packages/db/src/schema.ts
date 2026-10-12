import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==========================================
// 1. TENANT & DOMAIN TABLES
// ==========================================

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").unique().references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    subdomain: varchar("subdomain", { length: 60 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }).notNull(),
    logoUrl: text("logo_url"),
    settings: jsonb("settings").notNull().default({}),
    themeArchetype: varchar("theme_archetype", { length: 50 }).notNull().default("viral-funnel"),
    themeConfig: jsonb("theme_config").notNull().default({}),
    plan: varchar("plan", { length: 30 }).notNull().default("pilot"),
    status: varchar("status", { length: 30 }).notNull().default("active"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_stores_subdomain").on(table.subdomain),
    uniqueIndex("idx_stores_organization").on(table.organizationId),
  ]
);

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    isPrimary: boolean("is_primary").notNull().default(false),
    sslStatus: varchar("ssl_status", { length: 30 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_domains_store").on(table.storeId),
    uniqueIndex("idx_domains_domain").on(table.domain),
  ]
);

// ==========================================
// 2. BETTER AUTH & IDENTITY TABLES
// ==========================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  role: text("role").default("user"), // 'user', 'super_admin'
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // 'owner', 'admin', 'manager', 'call_staff', 'packer'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

// ==========================================
// 2.1 AUDIT TRAILS & ENTITLEMENTS SKELETON
// ==========================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  actorType: varchar("actor_type", { length: 30 }).notNull().default("user"), // 'user', 'system', 'super_admin'
  action: varchar("action", { length: 80 }).notNull(), // 'order:update', 'store:settings', 'staff:invite', etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'order', 'product', 'store', etc.
  entityId: text("entity_id"),
  diff: jsonb("diff"), // before / after snapshot
  ipAddress: varchar("ip_address", { length: 60 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'pilot', 'package_1', 'package_2', 'package_3', 'package_4'
  name: varchar("name", { length: 100 }).notNull(),
  pricePoisha: bigint("price_poisha", { mode: "bigint" }).notNull().default(sql`0`),
  billingInterval: varchar("billing_interval", { length: 20 }).notNull().default("monthly"),
  entitlements: jsonb("entitlements").notNull().default({}), // limits & features
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  planId: varchar("plan_id", { length: 50 }).notNull().references(() => plans.id),
  status: varchar("status", { length: 30 }).notNull().default("active"), // 'trialing', 'active', 'past_due', 'suspended', 'cancelled'
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  gracePeriodEnd: timestamp("grace_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 3. CATALOG & PRODUCT TABLES
// ==========================================

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_categories_store_slug").on(table.storeId, table.slug),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    banglaTitle: varchar("bangla_title", { length: 255 }),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    banglaDescription: text("bangla_description"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    
    // Funnel / Landing page specific content
    videoUrl: text("video_url"),
    features: jsonb("features").notNull().default([]),
    guaranteeText: varchar("guarantee_text", { length: 200 }),
    
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_products_store_slug").on(table.storeId, table.slug),
    index("idx_products_store_active").on(table.storeId, table.isActive),
  ]
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    sku: varchar("sku", { length: 60 }),
    price: bigint("price", { mode: "number" }).notNull(), // poisha
    compareAtPrice: bigint("compare_at_price", { mode: "number" }),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    option1: varchar("option1", { length: 60 }), // e.g. Size
    option2: varchar("option2", { length: 60 }), // e.g. Color
    option3: varchar("option3", { length: 60 }), // e.g. Weight
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_variants_product").on(table.productId),
    index("idx_variants_store").on(table.storeId),
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: varchar("alt_text", { length: 200 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_images_product").on(table.productId),
    index("idx_images_store").on(table.storeId),
  ]
);

// ==========================================
// 4. ORDERS & TELE-SALES PIPELINE
// ==========================================

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderNumber: integer("order_number").notNull(),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    deliveryZone: varchar("delivery_zone", { length: 30 }).notNull().default("inside_dhaka"),
    deliveryDistrict: varchar("delivery_district", { length: 60 }).notNull(),
    deliveryThana: varchar("delivery_thana", { length: 60 }),
    deliveryAddress: text("delivery_address").notNull(),
    customerNote: text("customer_note"),

    // Financials in poisha (1 BDT = 100 poisha)
    subtotal: bigint("subtotal", { mode: "number" }).notNull(),
    deliveryFee: bigint("delivery_fee", { mode: "number" }).notNull(),
    discountAmount: bigint("discount_amount", { mode: "number" }).notNull().default(0),
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),

    // Tele-Sales Call Verification
    callStatus: varchar("call_status", { length: 30 }).notNull().default("pending"),
    callAttempts: integer("call_attempts").notNull().default(0),
    lastCalledAt: timestamp("last_called_at", { withTimezone: true }),
    callNotes: text("call_notes"),
    verifiedByUserId: text("verified_by_user_id").references(() => user.id, { onDelete: "set null" }),

    // Advance Delivery Charge (Anti-Fraud outside Dhaka)
    advanceRequired: boolean("advance_required").notNull().default(false),
    advanceAmount: bigint("advance_amount", { mode: "number" }).notNull().default(0),
    advancePaymentMethod: varchar("advance_payment_method", { length: 30 }),
    advanceSenderPhone: varchar("advance_sender_phone", { length: 20 }),
    advanceTrxId: varchar("advance_trx_id", { length: 60 }),
    advanceVerified: boolean("advance_verified").notNull().default(false),
    advanceVerifiedAt: timestamp("advance_verified_at", { withTimezone: true }),

    // Order Lifecycle Status
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    
    // Courier Shipping
    courierId: varchar("courier_id", { length: 30 }), // 'steadfast', 'pathao'
    courierConsignmentId: varchar("courier_consignment_id", { length: 100 }),
    courierTrackingCode: varchar("courier_tracking_code", { length: 100 }),
    courierStatus: varchar("courier_status", { length: 60 }),

    // Marketing Attribution
    fbc: text("fbc"),
    fbp: text("fbp"),
    eventId: text("event_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_orders_store_number").on(table.storeId, table.orderNumber),
    index("idx_orders_store_created").on(table.storeId, table.createdAt),
    index("idx_orders_store_call_status").on(table.storeId, table.callStatus),
    index("idx_orders_store_status").on(table.storeId, table.status),
    index("idx_orders_phone").on(table.phone),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id),
    productTitle: varchar("product_title", { length: 255 }).notNull(),
    variantTitle: varchar("variant_title", { length: 120 }).notNull(),
    price: bigint("price", { mode: "number" }).notNull(), // unit price in poisha
    quantity: integer("quantity").notNull(),
    totalPrice: bigint("total_price", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_items_order").on(table.orderId),
    index("idx_order_items_store").on(table.storeId),
  ]
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 30 }),
    toStatus: varchar("to_status", { length: 30 }).notNull(),
    note: text("note"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_order_events_order").on(table.orderId),
  ]
);

// ==========================================
// 5. INCOMPLETE ORDERS & REMITTANCE TABLES
// ==========================================

export const incompleteOrders = pgTable(
  "incomplete_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    customerName: varchar("customer_name", { length: 120 }),
    deliveryDistrict: varchar("delivery_district", { length: 60 }),
    deliveryAddress: text("delivery_address"),
    items: jsonb("items").notNull().default([]),
    estimatedAmount: bigint("estimated_amount", { mode: "number" }).notNull().default(0),
    lastStep: varchar("last_step", { length: 30 }).notNull().default("phone_entered"),
    status: varchar("status", { length: 30 }).notNull().default("abandoned"), // 'abandoned', 'called', 'recovered', 'dropped'
    notes: text("notes"),
    recoveredOrderId: uuid("recovered_order_id").references(() => orders.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_incomplete_store_created").on(table.storeId, table.createdAt),
    index("idx_incomplete_store_status").on(table.storeId, table.status),
  ]
);

export const courierRemittances = pgTable(
  "courier_remittances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    courierId: varchar("courier_id", { length: 30 }).notNull(),
    consignmentId: varchar("consignment_id", { length: 100 }).notNull(),
    codCollected: bigint("cod_collected", { mode: "number" }).notNull(),
    courierDeliveryCharge: bigint("courier_delivery_charge", { mode: "number" }).notNull(),
    codServiceFee: bigint("cod_service_fee", { mode: "number" }).notNull(),
    netPayoutExpected: bigint("net_payout_expected", { mode: "number" }).notNull(),
    payoutStatus: varchar("payout_status", { length: 30 }).notNull().default("pending"), // 'pending', 'received', 'disputed'
    payoutReceivedAt: timestamp("payout_received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_remittance_store").on(table.storeId),
    index("idx_remittance_order").on(table.orderId),
  ]
);

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(), // 'order.created', 'order.confirmed', 'courier.book', 'sms.send', 'push.fcm'
    payload: jsonb("payload").notNull().default({}),
    status: varchar("status", { length: 30 }).notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_outbox_status_created").on(table.status, table.createdAt),
    index("idx_outbox_store").on(table.storeId),
  ]
);

export const storeCounters = pgTable(
  "store_counters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    counterType: varchar("counter_type", { length: 50 }).notNull(), // 'order_number', 'invoice_number'
    currentValue: integer("current_value").notNull().default(1000),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_store_counter_unique").on(table.storeId, table.counterType),
    index("idx_store_counters_store").on(table.storeId),
  ]
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }),
    statusCode: integer("status_code"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_idempotency_store_key").on(table.storeId, table.key),
    index("idx_idempotency_expires").on(table.expiresAt),
  ]
);

export const storeCredentials = pgTable(
  "store_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    service: varchar("service", { length: 50 }).notNull(), // 'steadfast', 'pathao', 'redx', 'meta_capi', 'bkash_merchant'
    encryptedData: text("encrypted_data").notNull(), // Base64 ciphertext
    iv: varchar("iv", { length: 64 }).notNull(), // Base64 IV
    tag: varchar("tag", { length: 64 }).notNull(), // Base64 auth tag
    keyVersion: integer("key_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_store_credentials_service").on(table.storeId, table.service),
    index("idx_store_credentials_store").on(table.storeId),
  ]
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    platform: varchar("platform", { length: 20 }).notNull().default("android"), // 'android', 'ios', 'web'
    deviceName: varchar("device_name", { length: 120 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_device_tokens_store_token").on(table.storeId, table.token),
    index("idx_device_tokens_store").on(table.storeId),
    index("idx_device_tokens_user").on(table.userId),
  ]
);

// ==========================================
// 6. TEMPLATE SYSTEM (themes, pages, media)
// ==========================================

/**
 * Canonical media registry. Settings reference a `mediaId`, never a raw URL, so
 * a re-upload or CDN move updates every referencing section at once and the
 * nightly orphan scan can find unreferenced objects.
 *
 * Invariant #3: zero server image processing — widths are produced client-side
 * and recorded here after an HTTP HEAD verification.
 */
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    uploadId: uuid("upload_id").notNull(),
    folder: varchar("folder", { length: 30 }).notNull().default("products"),
    filename: varchar("filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 60 }).notNull(),
    /** Map of width -> { key, url, bytes }. */
    widths: jsonb("widths").notNull().default({}),
    bytes: integer("bytes").notNull().default(0),
    altText: varchar("alt_text", { length: 255 }),
    /** pending | ready | failed */
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_media_store_upload").on(table.storeId, table.uploadId),
    index("idx_media_store").on(table.storeId),
    index("idx_media_store_status").on(table.storeId, table.status),
  ]
);

/**
 * One row per store: which template it uses, its token overrides, its draft and
 * its published resolved snapshot. Supersedes `stores.theme_archetype` /
 * `stores.theme_config`, which remain for one release as a read fallback.
 */
export const storeThemes = pgTable(
  "store_themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .unique()
      .references(() => stores.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull(),
    templateVersion: integer("template_version").notNull().default(1),
    presetId: text("preset_id").notNull().default("rose-bold"),
    tokenOverrides: jsonb("token_overrides").notNull().default({}),
    /** header / footer / announcement settings shared across pages. */
    globalSections: jsonb("global_sections").notNull().default({}),
    draft: jsonb("draft").notNull().default({}),
    /** Resolved snapshot served by the storefront. NULL until first publish. */
    published: jsonb("published"),
    draftRevision: integer("draft_revision").notNull().default(0),
    publishedVersion: integer("published_version").notNull().default(0),
    templateSwitchCount: integer("template_switch_count").notNull().default(0),
    templateSwitchPeriod: varchar("template_switch_period", { length: 7 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_store_themes_store").on(table.storeId)]
);

/** Append-only publish history. Last 20 per store are retained. */
export const storeThemeRevisions = pgTable(
  "store_theme_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_store_theme_revisions_version").on(table.storeId, table.version),
    index("idx_store_theme_revisions_recent").on(table.storeId, table.version),
  ]
);

/**
 * Multi-page support (Package 2+). A Package 1 store has exactly one row with
 * `isPrimary = true` and `slug = ''`.
 */
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    /** '' = root */
    slug: varchar("slug", { length: 120 }).notNull().default(""),
    /** landing | home | product | collection | cart | custom */
    kind: varchar("kind", { length: 20 }).notNull().default("landing"),
    title: varchar("title", { length: 160 }).notNull(),
    templateId: text("template_id").notNull(),
    templateVersion: integer("template_version").notNull().default(1),
    variantKey: varchar("variant_key", { length: 60 }).notNull().default("default"),
    /** NULL = inherit the store theme preset. */
    presetId: text("preset_id"),
    draftSections: jsonb("draft_sections").notNull().default([]),
    publishedSections: jsonb("published_sections"),
    /** draft | published | archived */
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    seo: jsonb("seo").notNull().default({}),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_pages_store_slug").on(table.storeId, table.slug),
    index("idx_pages_store").on(table.storeId),
    index("idx_pages_store_status").on(table.storeId, table.status),
  ]
);

// ==========================================
// 7. DRIZZLE RELATIONS
// ==========================================

export const storesRelations = relations(stores, ({ one, many }) => ({
  organization: one(organization, {
    fields: [stores.organizationId],
    references: [organization.id],
  }),
  domains: many(domains),
  products: many(products),
  orders: many(orders),
  subscriptions: many(subscriptions),
  auditLogs: many(auditLogs),
  outbox: many(outbox),
  counters: many(storeCounters),
  idempotencyKeys: many(idempotencyKeys),
  credentials: many(storeCredentials),
  deviceTokens: many(deviceTokens),
  media: many(media),
  pages: many(pages),
  themeRevisions: many(storeThemeRevisions),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  store: one(stores, {
    fields: [media.storeId],
    references: [stores.id],
  }),
}));

export const storeThemesRelations = relations(storeThemes, ({ one }) => ({
  store: one(stores, {
    fields: [storeThemes.storeId],
    references: [stores.id],
  }),
}));

export const storeThemeRevisionsRelations = relations(storeThemeRevisions, ({ one }) => ({
  store: one(stores, {
    fields: [storeThemeRevisions.storeId],
    references: [stores.id],
  }),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  store: one(stores, {
    fields: [pages.storeId],
    references: [stores.id],
  }),
}));

export const outboxRelations = relations(outbox, ({ one }) => ({
  store: one(stores, {
    fields: [outbox.storeId],
    references: [stores.id],
  }),
}));

export const storeCountersRelations = relations(storeCounters, ({ one }) => ({
  store: one(stores, {
    fields: [storeCounters.storeId],
    references: [stores.id],
  }),
}));

export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  store: one(stores, {
    fields: [idempotencyKeys.storeId],
    references: [stores.id],
  }),
}));

export const storeCredentialsRelations = relations(storeCredentials, ({ one }) => ({
  store: one(stores, {
    fields: [storeCredentials.storeId],
    references: [stores.id],
  }),
}));

export const organizationRelations = relations(organization, ({ one, many }) => ({
  store: one(stores, {
    fields: [organization.id],
    references: [stores.organizationId],
  }),
  members: many(member),
  invitations: many(invitation),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
}));

// Without this, `db.query.session.findFirst({ with: { user: true } })` throws,
// which is how every bearer-token request to the merchant API ended up 401.
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const domainsRelations = relations(domains, ({ one }) => ({
  store: one(stores, {
    fields: [domains.storeId],
    references: [stores.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
  images: many(productImages),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

