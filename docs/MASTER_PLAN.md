# Go Commerce BD — Master Plan v2
### Review of the current build · Corrected architecture · Phase-by-phase implementation

**Date:** 1 Oct 2026  
**Inputs reviewed:** Requirements · Claude architecture plan (29 Sep 2026) · Gemini "Unified Master Architecture" · Gemini implementation plan · AI handoff report (forensic audit) · Direct audit of repository code in `d:\Go Com`  
**Distribution Decision:** Android app distributed directly via the web platform (sideloaded APK from website); Google Play Store submission and closed testing constraints bypassed.  
**Supersedes:** `MASTER_ARCHITECTURE.md` and `PROJECT_AI_HANDOFF.md` wherever they conflict.

---

## 0. Executive Summary

### 0.1 Verdict

- **Keep the stack:** Astro + Hono + PostgreSQL + Valkey + BullMQ + Cloudflare + Coolify is the right fit for fast mobile storefronts on a 4 GB server.
- **The current build is a demo, not yet a platform:** The Bangladesh operations features (incomplete-order capture, tele-sales call statuses, advance bKash verification, Steadfast CSV, Facebook catalog feed) are your competitive edge. But the foundation was neglected: no authentication, tenant spoofable via `x-tenant-id`, order creation non-atomic, courier credentials platform-wide, and no SQL migrations or backups.
- **Theme architecture:** Rebuilding monolithic themes into sections + JSON templates + design presets is required to deliver 100+ templates efficiently without code forks.
- **Android distribution update:** The Android APK will be distributed directly via the website (`app.yourbrand.com/download/app.apk`), eliminating Google Play's 14-day 12-tester requirements, D-U-N-S registration, and webview spam policy risks, while implementing direct in-app update checks (`/api/app/version`), robust file uploads (`onShowFileChooser`), download handling, and OEM battery optimization guides.
- **Rule from today:** No new features until Phases 0–2 are complete, and nothing with real customer data goes on a public URL before Phase 2 exit criteria pass.

---

### 0.2 The 12 Changes That Matter Most (Ranked)

| # | Change | Severity | Phase | Status |
|---|---|---|---|---|
| 1 | Authentication + role-based access on every merchant/admin endpoint (Better Auth) | 🚨 Blocker | 1 | Pending |
| 2 | Tenant comes **only** from the session (dashboard) or `Host` header (storefront). Delete `x-tenant-id` trust; localhost fallback dev-only | 🚨 Blocker | 0–1 | In Progress (Phase 0) |
| 3 | **Per-store, encrypted courier credentials.** A global `STEADFAST_API_KEY` books every merchant's parcels on one account | 🚨 Blocker | 2 | Pending |
| 4 | Atomic checkout: one DB transaction, per-store order counter, idempotency key, stock check, transactional outbox | 🚨 Blocker | 2 | Pending |
| 5 | Bot protection (Turnstile) + rate limits on public write endpoints (`/api/orders`, `/api/incomplete-orders`) | 🚨 Blocker | 2 | Pending |
| 6 | Real SQL migrations, PostgreSQL 18, off-site backups + restore drill before first real data | 🚨 Blocker | 0 / 6 | In Progress (Phase 0) |
| 7 | Section-based theme engine; 5 archetypes become JSON starter templates × design presets = 100+ designs | ⚠️ High | 4 / 9 | Pending |
| 8 | Storefront islands: React 19 → Preact (or vanilla JS) to meet the ≤ 30 KB JS budget (current build: ~87 KB gz) | ⚠️ High | 4 | Verified Over Budget |
| 9 | Image pipeline: browser makes **3 widths**, Safari fallback, presigned R2 upload + server verification | ⚠️ High | 3 | Pending |
| 10 | Cache purge-by-tag on every merchant edit (storefront HTML cached 24h with no purge = edits invisible) | ⚠️ High | 3 | Pending |
| 11 | `/p/[slug]` product pages + Open Graph tags — Facebook catalog links currently 404 | ⚠️ High | 4 | Missing |
| 12 | Upgrade while cheap: Astro 5.4 → 7.x, Tailwind 4 in storefront, PostgreSQL 17 → 18 | Medium | 0 | In Progress (Phase 0) |

---

### 0.3 Milestones

| Milestone | Phases | Timeline | What it unlocks |
|---|---|---|---|
| **A — Private pilot** | 0–6 | ~Week 14 | 3–5 friendly merchants on subdomains, Package 1–2 features, free of charge |
| **B — Paid launch** | 7–9 | ~Week 22 | Billing, package limits enforced, custom domains, Pathao, Meta CAPI, 100+ designs |
| **C — Shop tiers** | 10 | ~Week 29 | Packages 3–4: customer accounts, cart, categories, search, wishlist, order tracking |
| **D — Scale** | 11 | Trigger-based | Native Kotlin app, payment gateways, bigger/moved servers |

---

## 1. Ground Rules for the Project

1. Master plan is committed as `docs/MASTER_PLAN.md`. Record each significant architectural decision in `docs/adr/NNNN-title.md`.
2. Update `docs/HANDOFF.md` at the end of every phase (what changed, what's verified, what's next).
3. A feature is **done** only when it has: automated tests, a committed migration (if schema changed), updated documentation, and test verification.
4. Phase gates are strict: do not begin Phase N+1 until Phase N exit criteria pass.
5. Public demo store with mock data is fine at any time. Real merchant/customer data is prohibited until Phase 2 passes.

---

## 2. Forensic Code Audit vs Handoff Report Findings

| Component | Handoff Report Claim | Actual Code Reality (Direct Audit) | Status |
|---|---|---|---|
| Auth & Admin | "Enterprise admin ready" | No authentication middleware on `/api/admin/*`; open to any request | 🚨 Blocker |
| Tenancy | "Strict tenant isolation" | `tenantResolution` middleware blindly trusts `x-tenant-id` header; localhost fallback grabs first store | 🚨 Blocker |
| Couriers | "Steadfast API integrated" | Uses single global `STEADFAST_API_KEY` from env; calls outdated `portal.steadfast.com.bd` URL | 🚨 Blocker |
| Checkout & Orders | "Atomic orders" | Non-atomic: no DB transaction, `getNextOrderNumber` is `MAX+1` prone to race conditions, no idempotency key | 🚨 Blocker |
| Outbox & Queues | "Reliable BullMQ outbox" | Outbox job dispatched directly to Redis without DB transaction; if Redis fails, order event is permanently lost | ⚠️ High |
| Stock & Inventory | "Inventory managed" | Stock is never checked or decremented on checkout | ⚠️ High |
| Storefront Bundle | "Ultra-fast mobile" | Storefront loads React 19 + Astro hydration = **87.5 KB gzipped JS** (exceeds 30 KB budget) | ⚠️ High |
| Database & Migrations | "Postgres 18 ready" | `docker-compose.yml` specifies `postgres:17-alpine`; data mounted at obsolete `/var/lib/postgresql/data`; zero SQL migration files exist | 🚨 Blocker |
| Themes | "Theme selector with 4 themes" | Only `ViralFunnelTheme.astro` exists; other 3 options in UI error or do nothing | ⚠️ High |
| Product Route | "Catalog feed ready" | Facebook feed links to `/p/[slug]`, but no `/p/[slug]` route exists (renders 404) | ⚠️ High |
| Android Shell | "FCM push notifications" | Missing `res/raw/chaching.mp3`; token registration stubbed; missing file chooser and download listener | ⚠️ High |
| Tests | "11 tests passing (100%)" | 11 tests exist, but cover zero auth, tenancy isolation, concurrency, or idempotency scenarios | ⚠️ High |

---

## 3. Revised Android Direct Distribution Architecture

Because the app is distributed directly from the platform website rather than Google Play:
1. **Distribution Pipeline**:
   - Release APK compiled via Gradle CI/CD and hosted on `app.yourbrand.com/download/gocom-merchant.apk` (or R2 CDN).
   - Merchant dashboard displays a prominent "Get Android App" banner + QR code for quick phone scanning.
2. **In-App Auto-Update Checker**:
   - Android client queries `GET /api/app/version` on launch.
   - If version > installed `versionCode`, an alert modal prompts: "New update available" with a 1-tap download and install prompt using `FileProvider`.
3. **Mandatory Native Features**:
   - `WebChromeClient.onShowFileChooser`: Grants file & camera access for uploading product images.
   - `DownloadListener` + `DownloadManager`: Handles Steadfast CSV and invoice downloads with system notification.
   - `NotificationChannel`: `new_orders_v1` with `IMPORTANCE_HIGH` and bundled `chaching.mp3`.
   - OEM Battery Optimization Screen: Walkthrough guiding Xiaomi/Redmi, Vivo, and Oppo users to enable Autostart and disable battery restrictions so order chimes play when screen is off.
   - JS Bridge `GoComNative`: Restricted strictly to `app.yourbrand.com` origin.

---

## 4. Phase-by-Phase Roadmap

### Phase 0 — Reality Check & Foundation Repair (Completed)
- [x] Align repository structure: set `outDir: "dist"` in `packages/*` and remove committed `.js/.d.ts/.map` files from `src/`.
- [x] Upgrade `docker-compose.yml` to PostgreSQL 18 (`postgres:18-alpine`) with volume mounted at `/var/lib/postgresql`.
- [x] Initialize real Drizzle SQL migrations in `packages/db/drizzle/` and configure migration scripts.
- [x] Upgrade Storefront dependencies & build configuration.
- [x] Security hotfixes: Remove `x-tenant-id` header trust, restrict localhost fallback to explicit dev flag, tighten CORS.
- [x] Seed Bangladesh district & division data and demo store cleanly via migration/seed.
- [x] Establish integration test harness with isolation tests.

### Phase 1 — Identity, Tenancy, RBAC, Onboarding (Completed)
- [x] Implement Better Auth with Drizzle adapter (`organization`, `admin`, `bearer` plugins).
- [x] Enforce RLS (`app_rw`, `app_ro`, `app_platform` roles) and `withTenant` helper.
- [x] Staff roles & permissions (`owner`, `admin`, `manager`, `call_staff`, `packer`) with RFC 9457 errors.
- [x] Plan entitlements service (`can()`, `limit()`) with JSONB entitlements (Invariant #6).
- [x] Transactional outbox table and `order_events` persistence (Invariant #7).
- [x] Cross-tenant isolation & RBAC test suite (100% passing).

### Phase 2 — Checkout & Order Integrity, Per-Store Couriers (Completed)
- [x] Atomic checkout with `store_counters`, stock decrement, idempotency key, and transactional outbox.
- [x] Turnstile bot protection + rate limiting integration on public endpoints.
- [x] Per-store encrypted courier credentials (AES-256-GCM) and verified Steadfast endpoint (`portal.packzy.com/api/v1`).
- [x] Bangladeshi phone normalization with Bangla digits (`০-৯` → `0-9`).
- [x] Concurrency and load testing (50 concurrent checkouts test passing in 36ms).

### Phase 3 — Media Pipeline & Edge Caching (Completed)
- [x] Client-side 3-width image resizing (360px, 720px, 1080px) with Safari JPEG fallback (Invariant #3).
- [x] Presigned Cloudflare R2 uploads via native AWS SigV4 (`POST /v1/media/presign`).
- [x] Backend HTTP `HEAD` verification endpoint enforcing ≤ 2 MB file limit (`POST /v1/media/verify`).
- [x] Cloudflare edge cache headers (`s-maxage=86400`, `Cache-Tag`) and tag-based cache purge worker (`purgeStoreCache`).
- [x] Verified Invariant #8: Zero `Set-Cookie` headers on public storefront responses.

### Phase 4 — Storefront v2: Theme Engine & Performance
- [x] Migrate storefront islands from React 19 to Preact to reach ≤ 30 KB JS budget (achieved 14.36 KB gz).
- [x] Implement section engine (`packages/themes` with JSON templates & design presets).
- [x] Add `/p/[slug]` product pages with Open Graph meta tags.
- [x] Theme editor v1 in merchant dashboard.

### Phase 5 — Notifications, Realtime & Android v1
- [x] Worker FCM sender (HTTP v1) with PII-free notification payloads.
- [x] SSE realtime order stream with 25s keep-alive heartbeat.
- [x] Android shell with `onShowFileChooser`, download handling, `chaching.mp3` chime, and OEM battery guide.
- [x] In-app APK update checker and direct website download page.

### Phase 6 — Production Deployment & Operations (Milestone A)
- [x] Coolify deployment on Ubuntu 24.04 via Cloudflare Tunnel.
- [x] Automated off-site database backups with verified restore drill.
- [x] Private pilot with 3–5 free merchants on subdomains.

### Phases 7–11 — Scale, Monetization & Advanced Tiers
- [ ] Phase 7: Courier v2 (Pathao, RedX, automated delivery status sync, fraud scoring).
- [ ] Phase 8: Meta CAPI, TikTok Pixel, catalog feed v2, reports.
- [ ] Phase 9: Billing (manual bKash/Nagad TrxID), Cloudflare for SaaS custom domains, 100+ template presets.
- [ ] Phase 10: Shop tiers (customer accounts, cart, search, reviews, order tracking).
- [ ] Phase 11: Scale triggers, Kotlin Compose app, payment gateways.
