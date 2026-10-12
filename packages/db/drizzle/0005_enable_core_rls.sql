-- Migration 0005: Enable Row-Level Security on all tenant-scoped tables.
-- Invariant #5: Every tenant query must execute inside withTenant(storeId, tx => ...)
-- which SETs app.store_id. RLS policies enforce that rows are only visible/writable
-- when current_setting('app.store_id') matches the row's store_id.
--
-- Expand phase: policies are permissive so that the migration_user / superuser can
-- still run migrations. The app connects as 'app_rw' which is subject to RLS.

-- ============================================================
-- 1. Create application roles (idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_ro') THEN
    CREATE ROLE app_ro NOLOGIN;
  END IF;
END
$$;

-- Grant basic schema usage to the app roles
GRANT USAGE ON SCHEMA public TO app_rw, app_ro;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_ro;

-- Future tables inherit the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_ro;

-- ============================================================
-- 2. Helper: safe current_setting that returns empty string
--    if app.store_id is not set (prevents ERROR on unscoped queries)
-- ============================================================
CREATE OR REPLACE FUNCTION tenant_store_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.store_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. Enable RLS + policies on every tenant-scoped table
-- ============================================================

-- Helper macro: enable RLS, force it (even for table owner in app context),
-- and create a simple store_id = tenant_store_id() policy.

-- 3.1 orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_orders ON orders;
CREATE POLICY tenant_isolation_orders ON orders
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.2 order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_order_items ON order_items;
CREATE POLICY tenant_isolation_order_items ON order_items
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.3 order_events
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_order_events ON order_events;
CREATE POLICY tenant_isolation_order_events ON order_events
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.4 incomplete_orders
ALTER TABLE incomplete_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomplete_orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_incomplete_orders ON incomplete_orders;
CREATE POLICY tenant_isolation_incomplete_orders ON incomplete_orders
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.5 products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_products ON products;
CREATE POLICY tenant_isolation_products ON products
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.6 product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_product_variants ON product_variants;
CREATE POLICY tenant_isolation_product_variants ON product_variants
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.7 product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_product_images ON product_images;
CREATE POLICY tenant_isolation_product_images ON product_images
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.8 store_credentials
ALTER TABLE store_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_credentials ON store_credentials;
CREATE POLICY tenant_isolation_store_credentials ON store_credentials
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.9 courier_remittances
ALTER TABLE courier_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_remittances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_courier_remittances ON courier_remittances;
CREATE POLICY tenant_isolation_courier_remittances ON courier_remittances
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.10 device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_device_tokens ON device_tokens;
CREATE POLICY tenant_isolation_device_tokens ON device_tokens
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.11 store_counters
ALTER TABLE store_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_counters FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_counters ON store_counters;
CREATE POLICY tenant_isolation_store_counters ON store_counters
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.12 idempotency_keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_idempotency_keys ON idempotency_keys;
CREATE POLICY tenant_isolation_idempotency_keys ON idempotency_keys
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.13 outbox
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_outbox ON outbox;
CREATE POLICY tenant_isolation_outbox ON outbox
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.14 audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.15 categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_categories ON categories;
CREATE POLICY tenant_isolation_categories ON categories
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.16 domains
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_domains ON domains;
CREATE POLICY tenant_isolation_domains ON domains
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.17 subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_subscriptions ON subscriptions;
CREATE POLICY tenant_isolation_subscriptions ON subscriptions
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.18 media
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_media ON media;
CREATE POLICY tenant_isolation_media ON media
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.19 store_themes
ALTER TABLE store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_themes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_themes ON store_themes;
CREATE POLICY tenant_isolation_store_themes ON store_themes
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- 3.20 store_theme_revisions
ALTER TABLE store_theme_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_theme_revisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_store_theme_revisions ON store_theme_revisions;
CREATE POLICY tenant_isolation_store_theme_revisions ON store_theme_revisions
  USING (store_id = tenant_store_id())
  WITH CHECK (store_id = tenant_store_id());

-- ============================================================
-- 4. Bypass policy for the migration / superuser role so that
--    migrations and admin CLI tools still work.
-- ============================================================
-- The database superuser and the migration user are exempt from
-- RLS by default (they own the tables). FORCE ROW LEVEL SECURITY
-- applies to the table owner too, but superusers are always exempt.
-- If the app connects as the table owner, we need an explicit
-- bypass policy or the owner needs to SET app.store_id.
--
-- For safety, we create a BYPASSRLS-capable role for admin tasks:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gocom_admin') THEN
    CREATE ROLE gocom_admin NOLOGIN BYPASSRLS;
  END IF;
END
$$;

-- ============================================================
-- 5. Verification query (can be run manually to confirm RLS)
-- ============================================================
-- SELECT relname, relrowsecurity, relforcerowsecurity
-- FROM pg_class
-- WHERE relname IN (
--   'orders', 'order_items', 'order_events', 'incomplete_orders',
--   'products', 'product_variants', 'product_images', 'store_credentials',
--   'courier_remittances', 'device_tokens', 'store_counters',
--   'idempotency_keys', 'outbox', 'audit_logs', 'categories', 'domains',
--   'subscriptions', 'media', 'store_themes', 'store_theme_revisions'
-- );
