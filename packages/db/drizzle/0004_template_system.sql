-- Template System — Phase A foundation
-- Adds: media, store_themes, store_theme_revisions, pages
-- Plus: RLS policies on all four tables from day one (audit C4 / report §9.5)
--
-- This migration is written to be idempotent so it is safe to run against a
-- database that was previously brought up with `drizzle-kit push`.

-- ==========================================================================
-- 1. media — canonical media registry (report §6, blocker T-2)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"folder" varchar(30) DEFAULT 'products' NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content_type" varchar(60) NOT NULL,
	"widths" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"alt_text" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "media" ADD CONSTRAINT "media_store_id_stores_id_fk"
		FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_media_store_upload" ON "media" USING btree ("store_id","upload_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_store" ON "media" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_store_status" ON "media" USING btree ("store_id","status");--> statement-breakpoint

-- ==========================================================================
-- 2. store_themes — one row per store (report §9.1)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "store_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"template_version" integer DEFAULT 1 NOT NULL,
	"preset_id" text DEFAULT 'rose-bold' NOT NULL,
	"token_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"global_sections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published" jsonb,
	"draft_revision" integer DEFAULT 0 NOT NULL,
	"published_version" integer DEFAULT 0 NOT NULL,
	"template_switch_count" integer DEFAULT 0 NOT NULL,
	"template_switch_period" varchar(7),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_themes_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "store_themes" ADD CONSTRAINT "store_themes_store_id_stores_id_fk"
		FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_store_themes_store" ON "store_themes" USING btree ("store_id");--> statement-breakpoint

-- ==========================================================================
-- 3. store_theme_revisions — publish history (report §9.1)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "store_theme_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "store_theme_revisions" ADD CONSTRAINT "store_theme_revisions_store_id_stores_id_fk"
		FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_store_theme_revisions_version" ON "store_theme_revisions" USING btree ("store_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_store_theme_revisions_recent" ON "store_theme_revisions" USING btree ("store_id","version" DESC);--> statement-breakpoint

-- ==========================================================================
-- 4. pages — multi-page support, Package 2+ (report §7)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"slug" varchar(120) DEFAULT '' NOT NULL,
	"kind" varchar(20) DEFAULT 'landing' NOT NULL,
	"title" varchar(160) NOT NULL,
	"template_id" text NOT NULL,
	"template_version" integer DEFAULT 1 NOT NULL,
	"variant_key" varchar(60) DEFAULT 'default' NOT NULL,
	"preset_id" text,
	"draft_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_sections" jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "pages" ADD CONSTRAINT "pages_store_id_stores_id_fk"
		FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_pages_store_slug" ON "pages" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pages_store" ON "pages" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pages_store_status" ON "pages" USING btree ("store_id","status");--> statement-breakpoint

-- At most one primary page per store.
CREATE UNIQUE INDEX IF NOT EXISTS "pages_one_primary" ON "pages" USING btree ("store_id") WHERE "is_primary";--> statement-breakpoint

-- ==========================================================================
-- 5. Data migration off stores.theme_archetype / stores.theme_config
--    (report §9.2). Runs BEFORE RLS is forced so the migration role can write.
--    `published` stays NULL to force an explicit first publish — a visible,
--    auditable state rather than a silent half-migration.
-- ==========================================================================
INSERT INTO "store_themes" (
	"store_id", "template_id", "template_version", "preset_id", "draft", "published"
)
SELECT
	s."id",
	COALESCE(NULLIF(s."theme_archetype", ''), 'viral-funnel'),
	1,
	COALESCE(NULLIF(s."theme_config"->>'presetId', ''), 'rose-bold'),
	jsonb_build_object(
		'pages', jsonb_build_object(
			'main', jsonb_build_object(
				'sections', COALESCE(s."theme_config"->'sections', '[]'::jsonb)
			)
		),
		-- Legacy flat keys (announcementBarText, warrantyPeriod, ...) are carried
		-- across so the pre-manifest customiser's values are not lost.
		'legacyConfig', COALESCE(s."theme_config", '{}'::jsonb)
	),
	NULL
FROM "stores" s
WHERE NOT EXISTS (SELECT 1 FROM "store_themes" st WHERE st."store_id" = s."id");
--> statement-breakpoint

-- Every store gets its single primary landing page.
INSERT INTO "pages" (
	"store_id", "slug", "kind", "title", "template_id", "template_version",
	"variant_key", "draft_sections", "status", "is_primary"
)
SELECT
	s."id",
	'',
	'landing',
	s."name",
	COALESCE(NULLIF(s."theme_archetype", ''), 'viral-funnel'),
	1,
	'default',
	COALESCE(s."theme_config"->'sections', '[]'::jsonb),
	'draft',
	true
FROM "stores" s
WHERE NOT EXISTS (SELECT 1 FROM "pages" p WHERE p."store_id" = s."id");
--> statement-breakpoint

-- ==========================================================================
-- 6. Row Level Security (audit C4, report §9.5)
--    `withTenant()` already issues
--      SELECT set_config('app.store_id', $1, true)
--    at the top of every tenant transaction, so the policies below are the
--    missing half. current_setting(..., true) yields NULL when unset, so an
--    un-scoped connection sees ZERO rows — the policy fails closed.
--
--    FORCE ROW LEVEL SECURITY is required because the application connects as
--    the table owner, and owners bypass RLS by default.
--
--    NOTE: maintenance jobs that sweep across stores (orphan media GC,
--    revision pruning) must either set app.store_id per store or run as a
--    role with BYPASSRLS.
-- ==========================================================================
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "media_tenant_isolation" ON "media";--> statement-breakpoint
CREATE POLICY "media_tenant_isolation" ON "media"
	USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
	WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "store_themes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_themes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "store_themes_tenant_isolation" ON "store_themes";--> statement-breakpoint
CREATE POLICY "store_themes_tenant_isolation" ON "store_themes"
	USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
	WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "store_theme_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "store_theme_revisions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "store_theme_revisions_tenant_isolation" ON "store_theme_revisions";--> statement-breakpoint
CREATE POLICY "store_theme_revisions_tenant_isolation" ON "store_theme_revisions"
	USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
	WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "pages_tenant_isolation" ON "pages";--> statement-breakpoint
CREATE POLICY "pages_tenant_isolation" ON "pages"
	USING ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid)
	WITH CHECK ("store_id" = NULLIF(current_setting('app.store_id', true), '')::uuid);
