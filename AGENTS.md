# Rules for AI Coding Assistants (Go Commerce BD)

## Invariants — Never Break

1. **Money is integer poisha (`bigint`)**:
   - Never use floating point numbers in the database or financial calculations.
   - 1 BDT = 100 poisha (e.g. ৳1,050.00 = `105000n`).
   - Use `@gocom/contracts` conversion utilities (`bdtToPoisha`, `poishaToBdt`, `formatPoishaToBdt`).

2. **Phone Numbers**:
   - Bangladesh phone numbers must be normalized before storage or validation.
   - Always convert Bangla digits (`০-৯`) to ASCII digits (`0-9`).
   - Strip whitespace, dashes, and country code prefixes.
   - Validate and store as canonical E.164: `+8801XXXXXXXXX` (11 local digits starting with `013-019`).

3. **Media Pipeline & Zero Server Image Processing**:
   - Never import `sharp` or decode images in `apps/api` or BullMQ worker.
   - Images are resized client-side in the browser Web Worker or mobile app into 3 widths (360px, 720px, 1080px) and uploaded directly to Cloudflare R2 via presigned URLs.
   - Fall back to JPEG if Safari fails to encode WebP from canvas.
   - Server only verifies uploaded object metadata via `HEAD` requests.

4. **Tenancy Resolution Context**:
   - Storefront & public endpoints resolve store ID **strictly from the `Host` header** via domain lookup (cached in LRU/Valkey).
   - Merchant API (`/v1/...`) resolves store ID **strictly from the authenticated session** (`activeOrganizationId`).
   - **NEVER** trust `x-tenant-id`, query parameters, or request body for tenant identification.
   - Localhost fallback is permitted only when `NODE_ENV === 'development' && process.env.DEV_TENANT_FALLBACK === '1'`.

5. **Row-Level Security (RLS) & Query Scoping**:
   - Every tenant database operation must execute inside `withTenant(storeId, tx => ...)` to set `app.store_id`.
   - Every query must also explicitly filter `where(eq(table.storeId, storeId))` to utilize composite indexes.
   - Direct queries without `app.store_id` fail closed with 0 rows returned.

6. **Entitlement & Plan Checks**:
   - Plans are checked only via domain helpers `can(store, feature)` or `limit(store, resource)`.
   - Never compare plan name strings (e.g. `store.plan === 'package_1'`) in application logic.
   - Plan tiers are configured in data via JSONB entitlements.

7. **Transactional Outbox & Audit Trails**:
   - Every order mutation must insert an `order_events` record in the same database transaction.
   - Any event that triggers asynchronous side-effects (FCM push, Meta CAPI, SMS, Courier sync) must write an `outbox` row in the same transaction.
   - Never call external queues or network APIs directly inside request handlers without outbox persistence.

8. **Storefront Performance & Hygiene**:
   - Storefront HTML must never set cookies (`Set-Cookie` header is strictly forbidden on cacheable pages).
   - Storefront islands must use **Preact** (or vanilla JS), never React or heavy validation bundles like full Zod.
   - Adhere strictly to the performance budgets:
     - Landing page JS ≤ 30 KB gzipped
     - HTML ≤ 30 KB gzipped
     - Critical CSS ≤ 15 KB (inlined)
     - Above-the-fold images ≤ 80 KB
     - LCP ≤ 2.0s on throttled mobile 3G/4G

9. **Database Schema Evolution**:
   - All schema changes must be applied via committed SQL migrations in `packages/db/drizzle/`.
   - `drizzle-kit push` is banned in all environments except disposable local scratch databases.
   - Adopt the expand → migrate → contract pattern for zero-downtime deployments.

10. **Credentials & Integrations Isolation**:
    - All courier (Steadfast, Pathao, RedX), marketing (Meta CAPI, TikTok), and payment credentials must be per-store and encrypted at rest with AES-256-GCM.
    - Global platform fallback keys are strictly prohibited in production.

11. **Android Direct App Distribution**:
    - The Android app is distributed directly via the web platform (APK download from `app.yourbrand.com`).
    - The app must include:
      - `onShowFileChooser` for product photo capture/upload
      - `DownloadListener` / `DownloadManager` for CSV reports & invoices
      - In-app update check against `/api/app/version`
      - Notification channel `new_orders_v1` (`IMPORTANCE_HIGH` with `chaching.mp3`)
      - OEM battery autostart optimization onboarding guide (Xiaomi, Vivo, Oppo)
      - JS bridge restricted strictly to `app.yourbrand.com`

---

## AI Assistant Workflow & Quality Standards

- **Read Before Modifying**: Always read `docs/MASTER_PLAN.md` and `docs/HANDOFF.md` before starting work.
- **Truth Over Claims**: An AI report stating "✅ Implemented" is treated as unverified unless proven by an automated test or reproducible command output.
- **Atomic Commits**: One task at a time with automated tests and clear evidence.
- **External APIs**: Always check current official documentation before implementing third-party integrations (Couriers, Meta, Cloudflare).
