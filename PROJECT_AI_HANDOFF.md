# PROJECT AI HANDOFF REPORT — GO COMMERCE BD
**Multi-Tenant eCommerce & F-Commerce SaaS Platform (Bangladesh)**

> **Document Type:** Master AI Context & Codebase Forensic Audit  
> **Target Audience:** Incoming AI Coding Assistants & Technical Architects  
> **Audit Date:** October 1, 2026  
> **Repository Root:** `d:\Go Com`  
> **Maturity Stage:** Functional MVP (Core F-Commerce, Tele-Sales & Logistics Working; Auth & Cloud Integrations Pending)

---

## TABLE OF CONTENTS
1. [AI Handoff — Read This First](#1-ai-handoff--read-this-first)
2. [Project Identity & Core Business Model](#2-project-identity--core-business-model)
3. [Technology Stack Inventory](#3-technology-stack-inventory)
4. [End-to-End System Architecture](#4-end-to-end-system-architecture)
5. [Multi-Tenancy Deep Dive](#5-multi-tenancy-deep-dive)
6. [Authentication & Authorization Audit](#6-authentication--authorization-audit)
7. [Database Schema Deep Dive](#7-database-schema-deep-dive)
8. [Feature Inventory & Status Classification](#8-feature-inventory--status-classification)
9. [Feature-by-Feature Forensic Audit](#9-feature-by-feature-forensic-audit)
10. [Storefront & Theme System Analysis](#10-storefront--theme-system-analysis)
11. [Complete Route Map](#11-complete-route-map)
12. [Complete API Inventory](#12-complete-api-inventory)
13. [File & Directory Architecture](#13-file--directory-architecture)
14. [Important File Map](#14-important-file-map)
15. [Business Logic & State Machines](#15-business-logic--state-machines)
16. [Payment & Anti-Fraud System](#16-payment--anti-fraud-system)
17. [Courier & Logistics Integrations](#17-courier--logistics-integrations)
18. [Domain, DNS & Cloudflare Edge Topology](#18-domain-dns--cloudflare-edge-topology)
19. [Caching & Performance Architecture](#19-caching--performance-architecture)
20. [Comprehensive Security Audit](#20-comprehensive-security-audit)
21. [Error Handling & Observability](#21-error-handling--observability)
22. [Automated Testing Audit](#22-automated-testing-audit)
23. [Deployment & Container Architecture](#23-deployment--container-architecture)
24. [Environment Variables Inventory](#24-environment-variables-inventory)
25. [Package Dependency Audit](#25-package-dependency-audit)
26. [Dead, Legacy & Incomplete Code Audit](#26-dead-legacy--incomplete-code-audit)
27. [Current State — What Works Right Now](#27-current-state--what-works-right-now)
28. [Prioritized Implementation Backlog](#28-prioritized-implementation-backlog)
29. [Known Problems & Technical Debt](#29-known-problems--technical-debt)
30. [Current Development Phase](#30-current-development-phase)
31. [Project Roadmap Analysis](#31-project-roadmap-analysis)
32. [Architectural Decisions Log](#32-architectural-decisions-log)
33. [AI Development Rules & Invariants](#33-ai-development-rules--invariants)
34. [Git & Revision History Analysis](#34-git--revision-history-analysis)
35. [Documentation Consistency Check (Doc vs Code)](#35-documentation-consistency-check-doc-vs-code)
36. [Confidence & Verification Matrix](#36-confidence--verification-matrix)
37. [Master Systems Status Table](#37-master-systems-status-table)

---

# 1. AI HANDOFF — READ THIS FIRST

### Project Overview
**Go Commerce BD** is a high-performance, multi-tenant eCommerce and F-Commerce (Facebook Commerce) SaaS platform engineered specifically for the operational realities of Bangladesh online merchants: 100% Cash on Delivery (COD) friction-free checkouts, tele-sales call center verification pipelines, debounced abandoned lead recovery via WhatsApp, Steadfast courier API booking with bulk CSV export fallback, and client-side browser image compression to protect resource-constrained VPS hosts (2 vCPU / 4 GB RAM).

### Compact Technology Stack
- **Monorepo:** pnpm workspaces (v12.8.1) + Turborepo (`turbo ^2.4.4`), Node.js `>=22.0.0`
- **Storefront (`apps/storefront`):** Astro SSR v5.4.0 (Node standalone adapter `@astrojs/node ^9.0.0`), React 19 Islands (`@astrojs/react ^4.2.0`), Tailwind CSS v3.4.17
- **Merchant Dashboard (`apps/dashboard`):** React 19 (`react ^19.0.0`), Vite v6.2.0, Tailwind CSS v4.0.0 (`@tailwindcss/vite`), Lucide React Icons
- **Backend API (`apps/api`):** Node.js 24 LTS, Hono v4.7.4, `@hono/node-server ^1.13.8`, `@hono/zod-openapi ^0.19.1`, `@scalar/hono-api-reference ^0.5.176`, BullMQ v5.41.6 with Valkey/Redis
- **Database & ORM (`packages/db`):** PostgreSQL 17 (Docker Alpine), Drizzle ORM v0.40.0, `postgres ^3.4.5` driver, `drizzle-kit ^0.30.5`
- **Contracts (`packages/contracts`):** Zod v3.24.2 shared contracts, poisha/BDT converters, Bangladesh phone validation, Steadfast CSV formatters
- **Android App (`android/`):** Kotlin 2.1.0 WebView wrapper targeting Android 15 (SDK 35), Firebase Cloud Messaging (FCM) v33.9.0 receiver

### What Is Working Right Now
1. **End-to-End COD Checkout:** Viral 1-page funnel with quantity selectors, district-based delivery fee calculations (Dhaka ৳60, Sub-Dhaka ৳100, Outside Dhaka ৳120), and real-time database order generation.
2. **Abandoned Checkout Lead Capture:** Debounced capture (1500ms) on entering an 11-digit phone number, stored as `incomplete_orders`.
3. **Tele-Sales Call Center Dashboard:** Dial-out links (`tel:+8801...`), call attempts counter, call statuses (`pending`, `confirmed`, `no_answer_1..3`, `wrong_number`), and status transition handling.
4. **WhatsApp 1-Click Recovery:** Generates URL-encoded Bengali recovery messages directly to customer WhatsApp.
5. **Steadfast Logistics:** Direct Steadfast API parcel creation (`/create_order`) and 1-click bulk CSV export adhering to Steadfast portal import specifications.
6. **Advance Delivery Anti-Fraud:** Manual bKash/Nagad advance payment verification (`advanceVerified: true`, TrxID tracking, automatic deduction from COD balance).
7. **Facebook Product Catalog Feed:** Dynamic XML feed (`/feeds/facebook.xml`) formatted to Meta Commerce Manager standards.
8. **Client-Side Image Compression:** HTML5 Canvas Web Worker converting raw 5–15 MB camera images into ~80–120 KB WebP in the merchant's browser.

### Critical Invariants & Constraints ("Do Not Break")
1. **Money Stored in Poisha:** All monetary values in the database, API payloads, and internal calculations MUST be integers representing poisha (1 BDT = 100 poisha). Never store floating-point currency in the database.
2. **Bangladesh Phone Normalization:** All customer and merchant phone numbers MUST be validated with `bdPhoneSchema` (`/^(?:\+?88)?(01[3-9]\d{8})$/`) and normalized to `+8801XXXXXXXXX` (E.164). Steadfast CSV export strips `+88` automatically.
3. **Zero Server Image Computation:** Never introduce `sharp` or image decoding inside the API container or BullMQ worker. The 4 GB VPS will experience Out-Of-Memory (OOM) kernel crashes under concurrent uploads. Compression MUST happen client-side.
4. **Tenant Isolation:** All tenant queries MUST include explicit `where(eq(table.storeId, storeId))` scoping.

### Top Urgent Problems Another AI Must Fix
1. **NO Authentication on `/api/admin/*`:** Better Auth is not installed. All admin routes are completely unauthenticated and rely solely on `c.get("store")` or header spoofing (`x-tenant-id`).
2. **Order Number Race Condition:** `getNextOrderNumber()` uses `MAX(order_number) + 1` without database locking, causing HTTP 500 unique constraint crashes on concurrent checkouts.
3. **Missing Storefront Product Slug Page:** Facebook XML feed links to `/p/[slug]`, but `apps/storefront` has no `p/[slug].astro` page (returns 404).
4. **Missing Cloudflare R2 Upload Endpoint:** `ProductsView.tsx` creates `URL.createObjectURL(blob)` instead of uploading to Cloudflare R2 via presigned URLs.
5. **Inventory Not Decremented:** Orders create records, but `stockQuantity` on `productVariants` is never checked or decremented.

---

# 2. PROJECT IDENTITY & CORE BUSINESS MODEL

- **Project Name:** Go Commerce BD (`gocom-platform`)
- **Product Type:** Multi-Tenant eCommerce & F-Commerce SaaS (Software-as-a-Service)
- **Target Market:** Bangladesh Mobile Shoppers (4G/3G data connections, 95%+ Cash on Delivery, Facebook Ad/TikTok traffic) & Local F-Commerce Merchants.
- **Core Business Model:** Subscription-based SaaS for merchants (Starter, Pro, Enterprise packages) offering high-converting storefronts, tele-sales CRM, and automated courier fulfillment.
- **Main Problem Being Solved:** Traditional WooCommerce/Shopify stores are too slow on mobile data in Bangladesh, lack built-in tele-sales call tracking, lack automatic courier COD CSV generators, suffer from high return rates outside Dhaka due to fake orders, and crash inexpensive VPS hosts due to heavy WordPress/PHP or unoptimized Node image processing.
- **Current Maturity:** Functional MVP with working monorepo, active database schema, running test suite, functional dashboard, and running storefront.
- **Intended Production Environment:** Coolify orchestrator on 2 vCPU / 4 GB RAM / 40 GB NVMe VPS (Hetzner Germany) + Cloudflare Free Tier Edge (Dhaka / Chattogram PoPs) + Cloudflare R2 + Cloudflare for SaaS.

---

# 3. TECHNOLOGY STACK INVENTORY

### Monorepo & Build Tooling
| Technology | Version | Location | Purpose | Active Status |
|---|---|---|---|---|
| **pnpm** | 12.8.1 | Root `package.json` | Monorepo package manager | ✅ Active |
| **Turborepo** | 2.4.4 (runs 2.11.5) | Root `package.json`, `turbo.json` | Monorepo task orchestration | ✅ Active |
| **TypeScript** | 5.8.2 | Monorepo-wide | Type safety across all packages | ✅ Active |
| **Node.js** | >=22.0.0 (Node 24 LTS in Docker) | Monorepo-wide | JavaScript runtime | ✅ Active |

### Frontend: Storefront (`apps/storefront`)
| Technology | Version | Location | Purpose | Active Status |
|---|---|---|---|---|
| **Astro** | 5.4.0 | `apps/storefront/package.json` | High-performance edge-cached SSR | ✅ Active |
| **@astrojs/node** | 9.0.0 | `apps/storefront/astro.config.mjs` | Node standalone server adapter | ✅ Active |
| **React** | 19.0.0 | `apps/storefront/src/components` | Interactive checkout island (`InlineCheckoutForm`) | ✅ Active |
| **Tailwind CSS** | 3.4.17 | `apps/storefront/tailwind.config.mjs` | Utility-first styling for storefront | ✅ Active |
| **Lucide React** | 1.16.0 | `apps/storefront/src/components` | Storefront icons | ✅ Active |

### Frontend: Merchant Dashboard (`apps/dashboard`)
| Technology | Version | Location | Purpose | Active Status |
|---|---|---|---|---|
| **React** | 19.0.0 | `apps/dashboard/package.json` | Merchant administrative SPA | ✅ Active |
| **Vite** | 6.2.0 | `apps/dashboard/vite.config.ts` | Fast bundler & dev server (port 5173) | ✅ Active |
| **Tailwind CSS** | 4.0.0 | `apps/dashboard/src/index.css` | Styling via `@tailwindcss/vite` | ✅ Active |
| **Lucide React** | 1.16.0 | `apps/dashboard/src/components` | Dashboard icons | ✅ Active |
| **Canvas API** | Browser Native | `apps/dashboard/src/lib/image-compress.ts` | Client-side WebP image compressor | ✅ Active |

### Backend API & Workers (`apps/api`)
| Technology | Version | Location | Purpose | Active Status |
|---|---|---|---|---|
| **Hono** | 4.7.4 | `apps/api/src/index.ts` | Fast, lightweight Node.js web framework | ✅ Active |
| **@hono/node-server** | 1.13.8 | `apps/api/src/index.ts` | Node.js HTTP server adapter | ✅ Active |
| **@hono/zod-openapi** | 0.19.1 | `apps/api/package.json` | OpenAPI contract schemas | ✅ Active |
| **@scalar/hono-api-reference** | 0.5.176 | `apps/api/src/index.ts` | Interactive `/docs` UI | ✅ Active |
| **BullMQ** | 5.41.6 | `apps/api/src/services/queue.ts` | Background job queues (`gocom-outbox`, `gocom-courier`) | ✅ Active |
| **ioredis** | 5.6.0 | `apps/api/package.json` | Redis/Valkey client for BullMQ | ✅ Active |

### Database & Shared Packages (`packages/`)
| Technology | Version | Location | Purpose | Active Status |
|---|---|---|---|---|
| **PostgreSQL** | 17 (Docker) | `docker-compose.yml` | Relational database (schema supports multi-tenancy) | ✅ Active |
| **Valkey** | 8 (Docker) | `docker-compose.yml` | Open-source Redis drop-in for cache & BullMQ | ✅ Active |
| **Drizzle ORM** | 0.40.0 | `packages/db/src/schema.ts` | Type-safe SQL ORM | ✅ Active |
| **postgres.js** | 3.4.5 | `packages/db/src/client.ts` | PostgreSQL client with pool limit control | ✅ Active |
| **drizzle-kit** | 0.30.5 | `packages/db/drizzle.config.ts` | Database schema push and migrations | ✅ Active |
| **Zod** | 3.24.2 | `packages/contracts/src` | Validation schemas and types | ✅ Active |

### Mobile Application (`android/`)
| Technology | Version | Location | Purpose | Active Status |
|---|---|---|---|---|
| **Kotlin** | 2.1.0 | `android/build.gradle.kts` | Android language | ✅ Active |
| **Android SDK** | 35 (Android 15) | `android/app/build.gradle.kts` | Target Android SDK | ✅ Active |
| **Android WebView** | Android Native | `android/.../MainActivity.kt` | Modern SPA wrapper | ✅ Active |
| **Firebase Messaging**| 33.9.0 (BOM) | `android/.../GoComFirebaseMessagingService.kt` | Push notification service with high-priority wake | ✅ Active |

---

# 4. END-TO-END SYSTEM ARCHITECTURE

```text
                             Shopper / Merchant Browser / Android App
                                                │
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │      Cloudflare Edge (Dhaka / Ctg PoPs)       │
                        │  - SSL Termination / DNS                     │
                        │  - Cache Rule: HTML s-maxage=86400 (PurgeTag) │
                        │  - Query Param Stripping (fbclid, utm_*)      │
                        │  - Cloudflare for SaaS (Custom Domains CNAME) │
                        └───────────────────────┬───────────────────────┘
                                                │ Cloudflare Tunnel / Reverse Proxy
                                                ▼
                         ┌─────────────────────────────────────────────┐
                         │   Ingress Routing                           │
                         │   /api/*, /feeds/*  ──► Hono API (3000)     │
                         │   (all other web)   ──► Astro SSR (4321)    │
                         └──────────────────────┬──────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
    ┌─────────────────────────┐                                   ┌─────────────────────────┐
    │ Astro Storefront (4321) │                                   │    Hono API (3000)      │
    │ - Node SSR Server       │                                   │ - Security Middleware   │
    │ - Host Tenant Resolver  │                                   │ - Tenant Resolution     │
    │ - Viral Funnel Theme    │                                   │ - OpenAPI /docs         │
    │ - React Island Form     │                                   │ - Checkout / Orders     │
    └────────────┬────────────┘                                   │ - Incomplete Leads      │
                 │ Direct Internal DB Read                        │ - Facebook XML Feed     │
                 │                                                │ - Admin CRM & Courier   │
                 │                                                └────────────┬────────────┘
                 │                                                             │
                 ▼                                                             ▼
    ┌─────────────────────────┐                                   ┌─────────────────────────┐
    │      PostgreSQL 17      │◄──────────────────────────────────┤  Valkey 8 (Redis API)   │
    │  - Stores, Users        │                                   │  - BullMQ Outbox Queue  │
    │  - Products, Variants   │                                   │  - BullMQ Courier Queue │
    │  - Orders, Order Items  │                                   │  - 60s Host Tenant Cache│
    │  - Incomplete Orders    │                                   └────────────┬────────────┘
    │  - Courier Remittances  │                                                │
    └─────────────────────────┘                                                ▼
                                                                  ┌─────────────────────────┐
                                                                  │   BullMQ Worker Proc    │
                                                                  │   (worker.ts isolated)  │
                                                                  │   - FCM Alerts (Stub)   │
                                                                  │   - Meta CAPI (Stub)    │
                                                                  └─────────────────────────┘
```

### Complete Request & Data Flow
1. **Public Storefront Page Request:**
   - Shopper visits `https://grihogadget.yourbrandshop.com` or custom domain `https://www.grihogadget.com`.
   - Astro SSR receives the request. `index.astro` inspects the HTTP `Host` header.
   - For subdomains, it queries `db.query.stores.findFirst({ where: eq(stores.subdomain, subdomain) })`.
   - The active product and store configuration are fetched via `createTenantRepository(store.id).getProducts()`.
   - Astro sets `Cache-Control: public, max-age=0, s-maxage=86400` and `Cache-Tag: s:{store_id},s:{store_id}:home` for edge caching.
   - HTML is streamed to shopper with zero client JS overhead except for the interactive `InlineCheckoutForm.tsx` island.

2. **Abandoned Lead Debounce Capture Flow:**
   - As the shopper types their 11-digit mobile number (`017XXXXXXXX`), `InlineCheckoutForm.tsx` triggers a 1500ms debounce timer.
   - If no further input occurs, it fires a background `POST /api/incomplete-orders`.
   - `incomplete.ts` validates the phone with `captureIncompleteOrderSchema`.
   - If an existing abandoned record exists for that phone in that store, it updates the record (`customerName`, `deliveryAddress`, `items`, `estimatedAmount`, `lastStep`). Otherwise, it inserts a new row.
   - Lead immediately appears in merchant's **ইনকমপ্লিট অর্ডার (লিড)** dashboard tab with a 1-click WhatsApp recovery link.

3. **Order Placement Flow:**
   - Shopper clicks **অর্ডার কনফার্ম করুন**.
   - Form sends `POST /api/orders` to Hono API.
   - `checkout.ts` runs `checkoutOrderSchema` Zod validation.
   - API re-fetches prices directly from `productVariants` table (client-submitted prices are completely ignored).
   - Delivery fee is calculated based on zone (`inside_dhaka`: ৳60, `sub_dhaka`: ৳100, `outside_dhaka`: ৳120).
   - If outside Dhaka and store setting `advanceDeliveryRequiredOutsideDhaka: true`, sets `advanceRequired: true`.
   - `getNextOrderNumber()` generates the next sequential order number (e.g. #1001, #1002).
   - `orders` and `orderItems` are inserted into PostgreSQL.
   - An event is enqueued into BullMQ `outboxQueue` (`order-created`).
   - Storefront renders a confirmation card with the order number and instructions.

4. **Tele-Sales & Fulfillment Flow:**
   - Merchant views order in `OrdersView.tsx`.
   - Clicks `tel:+8801...` to call the customer directly from their phone/browser.
   - Selects call outcome (`confirmed`, `no_answer_1`, `wrong_number`, etc.).
   - If confirmed, clicks **Steadfast পাঠান** to book parcel directly via Steadfast API or clicks **Steadfast CSV ডাউনলোড** to export a ready-to-upload spreadsheet.
   - Booking records consignment ID, tracking code, and adds an entry into `courier_remittances` tracking COD payout expectations.

---

# 5. MULTI-TENANCY

### Tenant Identification Mechanism
- **Tenant Definition:** A tenant is represented by a row in the `stores` table identified by a `UUID` primary key.
- **Store Subdomain:** Each store has a unique slug stored in `stores.subdomain` (e.g. `grihogadget`, `organicfood`).
- **Store Custom Domain:** Stores can link custom domains stored in the `domains` table referencing `storeId` with unique index on `domain`.
- **User-to-Store Relation:** Many-to-many via `storeMembers` table (`storeId`, `userId`, `role: 'owner' | 'admin' | 'call_staff' | 'packer'`). A single user can own or staff multiple stores.

### Hostname Resolution Architecture (`apps/api/src/middleware/tenant.ts`)
The API uses a 3-tier resolution priority:
1. **Explicit Header:** `x-tenant-id` header (UUID) if present.
2. **Platform Subdomain:** Checks if host ends with `.${config.STOREFRONT_ROOT_DOMAIN}` (e.g. `grihogadget.yourbrandshop.com`). Extracts subdomain and queries `stores` table.
3. **Custom Domain:** If not a platform subdomain, queries `domains.domain = cleanHost` joined to `stores`.
4. **Localhost Fallback:** If running on localhost or 127.0.0.1 and no tenant matched, falls back to the first active store: `db.query.stores.findFirst({ where: eq(stores.isActive, true) })`.
5. **In-Memory Caching:** Host-to-store resolutions are cached in a local JavaScript `Map<string, CachedTenant>` for 60 seconds.

### Data Isolation Implementation
- **Repository Pattern:** `packages/db/src/tenant.ts` exposes `createTenantRepository(storeId)` which scopes all catalog, order, and remittance queries by `where(eq(schema.table.storeId, storeId))`.
- **Database Tables with `store_id`:**
  - `domains.storeId`
  - `storeMembers.storeId`
  - `categories.storeId`
  - `products.storeId`
  - `productVariants.storeId`
  - `productImages.storeId`
  - `orders.storeId`
  - `orderItems.storeId`
  - `orderEvents.storeId`
  - `incompleteOrders.storeId`
  - `courierRemittances.storeId`

### Cross-Tenant Data Leakage Risks (Vulnerabilities)
⚠️ **CRITICAL IDOR RISK:** The middleware checks `c.req.header("x-tenant-id")` before hostname lookup and trusts it unconditionally without validating session tokens or user permissions. Anyone can pass `x-tenant-id: <uuid>` to `/api/admin/*` and access or modify another merchant's orders, products, and customer phone numbers.  
⚠️ **NO POSTGRESQL RLS:** While `MASTER_ARCHITECTURE.md` claims PostgreSQL Row Level Security (RLS) is used as a secondary defense, **no RLS policies exist in the database**. Isolation is 100% reliant on application-level filtering.

---

# 6. AUTHENTICATION & AUTHORIZATION

### Status: 🔴 PLANNED BUT NOT IMPLEMENTED (Critical Gap)

| Feature | Documented Specification | Codebase Reality | Status |
|---|---|---|---|
| **Auth Engine** | Better Auth multi-tenant | Not installed (`better-auth` not in any `package.json`) | 🔴 Not Implemented |
| **Merchant Login** | Email/Password or OTP | No login route (`/api/auth/*` does not exist) | 🔴 Not Implemented |
| **Merchant Signup** | Registration flow | No signup route | 🔴 Not Implemented |
| **Session Mechanism** | Session cookies (`sessions` table) | Tables exist in `schema.ts`, but no code creates or checks sessions | 🔴 Not Implemented |
| **Password Hashing** | Argon2 / Bcrypt in `accounts` table | Table exists, but no hashing or verification code exists | 🔴 Not Implemented |
| **Admin Route Protection** | RBAC (`/api/admin/*`) | **ZERO protection.** All admin endpoints can be invoked by anyone. | ⚠️ Critical Vulnerability |
| **Dashboard Auth Gate** | Redirect to login if unauthenticated | Dashboard loads immediately with hardcoded store state | 🔴 Not Implemented |

### Database Auth Models in `packages/db/src/schema.ts`
The schema has tables prepared for Better Auth:
- `users`: `id`, `name`, `email`, `phone`, `role` ('merchant', 'super_admin'), `emailVerified`, `image`.
- `sessions`: `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `activeStoreId`.
- `accounts`: `id`, `userId`, `accountId`, `providerId`, `password`.
- `storeMembers`: `id`, `storeId`, `userId`, `role` ('owner', 'admin', 'call_staff', 'packer').

---

# 7. DATABASE SCHEMA DEEP DIVE

All tables are defined in [packages/db/src/schema.ts](file:///d:/Go%20Com/packages/db/src/schema.ts) using Drizzle ORM.

### Entity Relationship Diagram
```text
stores (id, name, subdomain, theme_archetype, settings, theme_config)
 ├── domains (id, store_id, domain, is_primary, ssl_status)
 ├── store_members (id, store_id, user_id, role)
 │    └── users (id, name, email, phone, role)
 │         ├── sessions (id, user_id, token, active_store_id)
 │         └── accounts (id, user_id, provider_id, password)
 ├── categories (id, store_id, name, slug)
 ├── products (id, store_id, title, bangla_title, slug, video_url, features, guarantee_text)
 │    ├── product_variants (id, store_id, product_id, title, sku, price, compare_at_price, stock_quantity)
 │    └── product_images (id, store_id, product_id, url, sort_order, is_primary)
 ├── orders (id, store_id, order_number, customer_name, phone, delivery_zone, total_amount, call_status, advance_verified)
 │    ├── order_items (id, store_id, order_id, product_id, variant_id, price, quantity, total_price)
 │    ├── order_events (id, store_id, order_id, from_status, to_status, note)
 │    └── courier_remittances (id, store_id, order_id, courier_id, cod_collected, net_payout_expected, payout_status)
 └── incomplete_orders (id, store_id, phone, customer_name, delivery_district, items, estimated_amount, last_step, status)
```

### Table-by-Table Technical Audit

#### 1. `stores`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Unique Constraint:** `subdomain VARCHAR(60) UNIQUE` (Index: `idx_stores_subdomain`)
- **Key Columns:** `name` (120), `phone` (20), `logoUrl` (text), `settings` (JSONB), `themeArchetype` (50, default `'viral-funnel'`), `themeConfig` (JSONB), `plan` (30, default `'package_1'`), `isActive` (boolean, default true).
- **Audit Findings:** No soft deletion column.

#### 2. `domains`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Foreign Key:** `storeId -> stores.id ON DELETE CASCADE`
- **Unique Constraint:** `domain VARCHAR(255) UNIQUE` (Index: `idx_domains_domain`)
- **Key Columns:** `isPrimary` (boolean), `sslStatus` (30, default `'pending'`).

#### 3. `products`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Foreign Key:** `storeId -> stores.id ON DELETE CASCADE`, `categoryId -> categories.id ON DELETE SET NULL`
- **Unique Constraint:** `(store_id, slug)` composite unique index (`idx_products_store_slug`).
- **Key Columns:** `title`, `banglaTitle`, `slug`, `videoUrl`, `features` (JSONB default `[]`), `guaranteeText`, `isFeatured`, `isActive`.

#### 4. `product_variants`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Foreign Key:** `storeId -> stores.id ON DELETE CASCADE`, `productId -> products.id ON DELETE CASCADE`
- **Key Columns:** `title`, `sku`, `price` (BIGINT in poisha, mode: number), `compareAtPrice` (BIGINT poisha), `stockQuantity` (integer default 0), `option1..3` (Size, Color, Weight).
- **Indexes:** `idx_variants_product`, `idx_variants_store`.

#### 5. `orders`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Foreign Key:** `storeId -> stores.id ON DELETE CASCADE`, `verifiedByUserId -> users.id ON DELETE SET NULL`
- **Unique Constraint:** `(store_id, order_number)` composite unique index (`idx_orders_store_number`).
- **Financials:** `subtotal`, `deliveryFee`, `discountAmount`, `totalAmount` (all BIGINT poisha).
- **Tele-Sales Columns:** `callStatus` ('pending', 'confirmed', 'no_answer_1..3', 'wrong_number', 'cancelled_by_customer'), `callAttempts` (integer default 0), `lastCalledAt`, `callNotes`.
- **Advance Payment Columns:** `advanceRequired`, `advanceAmount`, `advancePaymentMethod` ('bkash_personal', 'nagad_personal', 'bkash_merchant'), `advanceSenderPhone`, `advanceTrxId`, `advanceVerified`, `advanceVerifiedAt`.
- **Logistics Columns:** `courierId` ('steadfast', 'pathao'), `courierConsignmentId`, `courierTrackingCode`, `courierStatus`.
- **Marketing Attribution:** `fbc`, `fbp`, `eventId` for Meta CAPI deduplication.
- **Indexes:** `idx_orders_store_number`, `idx_orders_store_created`, `idx_orders_store_call_status`, `idx_orders_store_status`, `idx_orders_phone`.

#### 6. `incomplete_orders`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Foreign Key:** `storeId -> stores.id ON DELETE CASCADE`, `recoveredOrderId -> orders.id ON DELETE SET NULL`
- **Key Columns:** `phone` (20), `customerName`, `deliveryDistrict`, `deliveryAddress`, `items` (JSONB), `estimatedAmount` (BIGINT poisha), `lastStep` ('phone_entered', 'address_entered'), `status` ('abandoned', 'called', 'recovered', 'dropped'), `notes`.
- **Indexes:** `idx_incomplete_store_created`, `idx_incomplete_store_status`.

#### 7. `courier_remittances`
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`
- **Foreign Key:** `storeId -> stores.id ON DELETE CASCADE`, `orderId -> orders.id ON DELETE CASCADE`
- **Key Columns:** `courierId` ('steadfast'), `consignmentId`, `codCollected` (poisha), `courierDeliveryCharge` (poisha), `codServiceFee` (poisha), `netPayoutExpected` (poisha), `payoutStatus` ('pending', 'received', 'disputed'), `payoutReceivedAt`.
- **Indexes:** `idx_remittance_store`, `idx_remittance_order`.

### Database Integrity & Concurrency Findings
1. **Order Number Race Condition:** `getNextOrderNumber()` reads `MAX(order_number)` without a PostgreSQL sequence (`CREATE SEQUENCE`) or `FOR UPDATE` lock. High-concurrency checkouts will produce colliding order numbers and trigger unique constraint violations.
2. **No Soft Deletion:** `stores`, `products`, `orders` do not have `deleted_at`. Hard deletions cause cascade deletions of all order items and remittance records.
3. **No Database Migrations Directory:** `drizzle.config.ts` points to `./drizzle`, but the folder does not exist. The project currently relies on `drizzle-kit push` which is unsafe for production zero-downtime deployments.

---

# 8. FEATURE INVENTORY & STATUS CLASSIFICATION

Status Legend:
- ✅ **IMPLEMENTED AND WORKING**
- 🟡 **PARTIALLY IMPLEMENTED**
- 🔴 **PLANNED BUT NOT IMPLEMENTED**
- ⚠️ **IMPLEMENTED BUT HAS ISSUES**
- ❓ **UNCLEAR / NEEDS VERIFICATION**
- 🗑️ **LEGACY / UNUSED**

### Merchant & Dashboard Features
1. **Merchant Registration / Login:** 🔴 PLANNED BUT NOT IMPLEMENTED (No auth controllers/views)
2. **Order Management & Listing:** ✅ IMPLEMENTED AND WORKING (`OrdersView.tsx`, `/api/admin/orders`)
3. **Tele-Sales Call Verification:** ✅ IMPLEMENTED AND WORKING (`tel:` links, retry counters, status selector)
4. **Advance bKash Verification:** ✅ IMPLEMENTED AND WORKING (TrxID capture, manual verification)
5. **Incomplete Order Lead Recovery:** ✅ IMPLEMENTED AND WORKING (`IncompleteView.tsx`, 1-click WhatsApp link)
6. **Steadfast Parcel Direct Booking:** ✅ IMPLEMENTED AND WORKING (`SteadfastCourierService.createParcel`)
7. **Steadfast Bulk CSV Export:** ✅ IMPLEMENTED AND WORKING (`/api/admin/courier/export-csv`)
8. **Courier COD Remittance Tracking:** 🟡 PARTIALLY IMPLEMENTED (Displays expected payouts, but no webhook reconciliation)
9. **Product Creation & Management:** ⚠️ IMPLEMENTED BUT HAS ISSUES (Creates products, but image upload uses blob URL instead of Cloudflare R2)
10. **Client-Side Image Compression:** ✅ IMPLEMENTED AND WORKING (Canvas Web Worker WebP compression)
11. **Theme Archetype Selector:** 🟡 PARTIALLY IMPLEMENTED (Can select & save 5 archetypes in DB, but storefront only has 1 Astro template)
12. **Store Branding Customization:** ✅ IMPLEMENTED AND WORKING (Announcement bar, WhatsApp support number)
13. **Super-Admin Multi-Store Panel:** 🔴 PLANNED BUT NOT IMPLEMENTED

### Storefront Features
1. **Edge-Cached SSR Homepage:** ✅ IMPLEMENTED AND WORKING (`apps/storefront/src/pages/index.astro`)
2. **Viral Funnel Single-Product Theme:** ✅ IMPLEMENTED AND WORKING (`ViralFunnelTheme.astro`)
3. **Multi-Item Campaign Theme:** 🔴 PLANNED BUT NOT IMPLEMENTED (No Astro template)
4. **Fashion & Apparel Theme:** 🔴 PLANNED BUT NOT IMPLEMENTED (No Astro template)
5. **Tech & Gadget Theme:** 🔴 PLANNED BUT NOT IMPLEMENTED (No Astro template)
6. **Organic Food Theme:** 🔴 PLANNED BUT NOT IMPLEMENTED (No Astro template)
7. **1-Step Inline COD Checkout Form:** ✅ IMPLEMENTED AND WORKING (`InlineCheckoutForm.tsx`)
8. **Debounced Phone Number Lead Capture:** ✅ IMPLEMENTED AND WORKING (1500ms debounce to `/api/incomplete-orders`)
9. **Facebook Product Catalog XML Feed:** ✅ IMPLEMENTED AND WORKING (`/feeds/facebook.xml`)
10. **Dedicated Product Page (`/p/[slug]`):** 🔴 PLANNED BUT NOT IMPLEMENTED (Missing Astro route)
11. **Meta CAPI Deduplication Events:** 🟡 PARTIALLY IMPLEMENTED (Frontend passes `eventId`, `fbc`, `fbp`, but worker only logs to console)

### Android Mobile App
1. **WebView Dashboard Container:** ✅ IMPLEMENTED AND WORKING (`MainActivity.kt` with cookie & cache handling)
2. **External Link Intent Routing:** ✅ IMPLEMENTED AND WORKING (`tel:`, `wa.me`, `whatsapp://` intercepted to launch native apps)
3. **Firebase Cloud Messaging Service:** ⚠️ IMPLEMENTED BUT HAS ISSUES (`GoComFirebaseMessagingService.kt` implemented, but custom cash-register MP3 is missing and backend token endpoint is a stub)

---

# 9. FEATURE-BY-FEATURE FORENSIC AUDIT

### Feature: 1-Step Inline COD Checkout Form
- **Status:** ✅ IMPLEMENTED AND WORKING
- **Frontend:** [apps/storefront/src/components/InlineCheckoutForm.tsx](file:///d:/Go%20Com/apps/storefront/src/components/InlineCheckoutForm.tsx) (React 19 Island)
- **Backend:** [apps/api/src/routes/checkout.ts](file:///d:/Go%20Com/apps/api/src/routes/checkout.ts) (`POST /api/orders`)
- **Database:** `orders`, `order_items`, `product_variants`, `products`
- **Validation:** `checkoutOrderSchema` in `@gocom/contracts/src/order.ts`
- **Current Behavior:** Validates BD mobile number, computes delivery charges based on zone (Dhaka, Sub-Dhaka, Outside Dhaka), verifies prices from database, creates sequential order record, and dispatches BullMQ outbox job.
- **Missing Pieces:** Does NOT decrement stock quantity from `product_variants`. Uses unsafe `MAX(order_number) + 1`.
- **Known Problems:** Race condition on high-volume concurrent checkouts.

### Feature: Abandoned Checkout Lead Capture (Incomplete Orders)
- **Status:** ✅ IMPLEMENTED AND WORKING
- **Frontend:** [apps/storefront/src/components/InlineCheckoutForm.tsx](file:///d:/Go%20Com/apps/storefront/src/components/InlineCheckoutForm.tsx) (Debounced input handler)
- **Backend:** [apps/api/src/routes/incomplete.ts](file:///d:/Go%20Com/apps/api/src/routes/incomplete.ts) (`POST /api/incomplete-orders`)
- **Dashboard View:** [apps/dashboard/src/views/IncompleteView.tsx](file:///d:/Go%20Com/apps/dashboard/src/views/IncompleteView.tsx)
- **Database:** `incomplete_orders` table
- **Current Behavior:** Captures phone number and current form fields after 1.5s pause. If customer abandons form, lead appears in merchant dashboard with 1-click WhatsApp message link and direct phone dialer.
- **Missing Pieces:** Automatic recovery when customer later completes order (`recoveredOrderId` is defined in schema but not set in `checkout.ts`).

### Feature: Tele-Sales Call Verification Center
- **Status:** ✅ IMPLEMENTED AND WORKING
- **Frontend:** [apps/dashboard/src/views/OrdersView.tsx](file:///d:/Go%20Com/apps/dashboard/src/views/OrdersView.tsx)
- **Backend:** [apps/api/src/routes/admin.ts](file:///d:/Go%20Com/apps/api/src/routes/admin.ts) (`PATCH /api/admin/orders/:id/call-status`)
- **Database:** `orders.callStatus`, `orders.callAttempts`, `orders.lastCalledAt`, `orders.callNotes`
- **Current Behavior:** Merchants click `tel:` links to dial customers from Android/browser. Dropdown updates status (`confirmed`, `no_answer_1..3`, `wrong_number`, `cancelled`). Changing status to `confirmed` automatically updates main order status to `confirmed`.
- **Missing Pieces:** Call history audit log (schema has `order_events` table, but `admin.ts` does not write to it).

### Feature: Steadfast Courier Direct API Booking & CSV Export
- **Status:** ✅ IMPLEMENTED AND WORKING
- **Frontend:** `OrdersView.tsx` & `CourierView.tsx`
- **Backend:** [apps/api/src/services/steadfast.ts](file:///d:/Go%20Com/apps/api/src/services/steadfast.ts), `/api/admin/courier/book`, `/api/admin/courier/export-csv`
- **Database:** `orders.courierConsignmentId`, `orders.courierTrackingCode`, `courier_remittances`
- **Integration:** Steadfast Portal API (`https://portal.steadfast.com.bd/api/v1/create_order`)
- **Current Behavior:** Direct booking creates parcel with Steadfast API and updates order status to `shipped`. Bulk CSV export generates standard 6-column Steadfast spreadsheet with advance fees deducted.
- **Missing Pieces:** Webhook endpoint to receive Steadfast delivery status updates.

### Feature: Advance Delivery Charge Verification (Anti-Fraud)
- **Status:** ✅ IMPLEMENTED AND WORKING
- **Frontend:** `InlineCheckoutForm.tsx` & `OrdersView.tsx`
- **Backend:** [apps/api/src/routes/admin.ts](file:///d:/Go%20Com/apps/api/src/routes/admin.ts) (`POST /api/admin/orders/:id/advance-verify`)
- **Database:** `orders.advanceRequired`, `orders.advanceAmount`, `orders.advanceTrxId`, `orders.advanceVerified`
- **Current Behavior:** Store setting outside Dhaka requires advance fee. Shopper inputs bKash TrxID. Merchant clicks "অগ্রিম ১২০ ৳ ভেরিফাই করুন", enters TrxID, order is marked verified, and Steadfast COD collection is reduced by ৳120.

### Feature: Facebook Product Catalog XML Feed
- **Status:** ✅ IMPLEMENTED AND WORKING
- **Backend:** [apps/api/src/routes/feed.ts](file:///d:/Go%20Com/apps/api/src/routes/feed.ts) (`GET /feeds/facebook.xml`)
- **Integration:** Meta Commerce Manager RSS 2.0 XML specification
- **Current Behavior:** Streams XML feed with active products, Bengali titles, prices in BDT, and primary image URLs with 1-hour edge cache header.
- **Known Problems:** Product URLs point to `/p/[slug]`, which is not yet a routed page in `apps/storefront`.

### Feature: Catalog & Product Management
- **Status:** ⚠️ IMPLEMENTED BUT HAS ISSUES
- **Frontend:** [apps/dashboard/src/views/ProductsView.tsx](file:///d:/Go%20Com/apps/dashboard/src/views/ProductsView.tsx)
- **Backend:** [apps/api/src/routes/admin.ts](file:///d:/Go%20Com/apps/api/src/routes/admin.ts) (`POST /api/admin/products`)
- **Database:** `products`, `product_variants`, `product_images`
- **Current Behavior:** Form creates product with variants and images. Client compresses image to WebP.
- **Known Problem:** Image upload does not upload to Cloudflare R2! It sends a temporary `blob:...` URL or falls back to Unsplash.

---

# 10. STOREFRONT & THEME SYSTEM ANALYSIS

### Theme Architecture
The system specifies 5 Bangladesh-focused archetype themes in [packages/contracts/src/theme.ts](file:///d:/Go%20Com/packages/contracts/src/theme.ts):
1. `viral-funnel`: Single-product high-converting video funnel (Grihogadget style).
2. `multi-campaign`: Bundle and combo offers with checkbox add-ons.
3. `fashion-store`: Apparel, saree, panjabi with size/color swatches and cart drawer.
4. `tech-gadget`: Electronics with technical spec matrix and warranty badges.
5. `organic-food`: Grocery with weight chips (500g, 1kg) and harvest origin badges.

### Implementation Reality
- **Implemented Astro Themes:** ONLY [apps/storefront/src/components/themes/ViralFunnelTheme.astro](file:///d:/Go%20Com/apps/storefront/src/components/themes/ViralFunnelTheme.astro) exists!
- **Storefront Hardcoding:** In [apps/storefront/src/pages/index.astro](file:///d:/Go%20Com/apps/storefront/src/pages/index.astro) line 64, `<ViralFunnelTheme>` is rendered unconditionally regardless of `store.themeArchetype`.
- **Dashboard Theme Switcher:** [apps/dashboard/src/views/ThemeView.tsx](file:///d:/Go%20Com/apps/dashboard/src/views/ThemeView.tsx) displays all 5 archetypes and allows saving the selection to PostgreSQL (`PUT /api/admin/theme`), but the storefront cannot render the other 4.

---

# 11. COMPLETE ROUTE MAP

### Storefront Application (`apps/storefront`)
| Path | Purpose | Access | Main Component | Data Source | Status |
|---|---|---|---|---|---|
| `/` | Multi-tenant homepage & single-product funnel | Public | `src/pages/index.astro` | `db.query.stores`, `createTenantRepository` | ✅ Working |
| `/p/[slug]` | Dedicated product landing page | Public | *Missing file* | — | 🔴 Planned / Broken from Feed |
| `/cart` | Slide-out or dedicated cart | Public | *Not implemented* | — | 🔴 Planned |
| `/checkout` | Standalone multi-item checkout | Public | *Inline in index* | — | 🟡 Implemented inline |

### Merchant Dashboard SPA (`apps/dashboard`)
*Note: Dashboard uses internal React state navigation (`currentTab`) rather than URL-based routing.*
| Tab / View | Purpose | Access | Main Component | API Dependencies | Status |
|---|---|---|---|---|---|
| `orders` | Tele-sales call center & order list | Merchant (Unprotected) | `OrdersView.tsx` | `GET /api/admin/orders`, `PATCH .../call-status` | ✅ Working |
| `incomplete` | Abandoned checkout leads & WhatsApp recovery | Merchant (Unprotected) | `IncompleteView.tsx` | `GET /api/admin/incomplete-orders` | ✅ Working |
| `products` | Catalog listing & product creation modal | Merchant (Unprotected) | `ProductsView.tsx` | `GET /api/storefront/products`, `POST /api/admin/products` | ⚠️ Image upload stub |
| `courier` | Steadfast bulk CSV & remittance tracker | Merchant (Unprotected) | `CourierView.tsx` | `GET /api/admin/courier/remittances`, `.../export-csv` | ✅ Working |
| `theme` | 5 Archetype selector & content customizer | Merchant (Unprotected) | `ThemeView.tsx` | `GET /api/storefront/config`, `PUT /api/admin/theme` | 🟡 Backend saves; SF only has 1 theme |

---

# 12. COMPLETE API INVENTORY

All backend routes are mounted on Hono in [apps/api/src/index.ts](file:///d:/Go%20Com/apps/api/src/index.ts).

### System & Health Endpoints
- `GET /health`: Checks database liveness via `SELECT 1`. Returns `{ status: "ok", uptime, database: "connected" }`.
- `GET /docs`: Interactive Scalar OpenAPI documentation UI.

### Storefront APIs
- `GET /api/storefront/config`: Returns active store branding, theme archetype, settings, and theme configuration.
- `GET /api/storefront/products`: Returns list of active products with variants and sorted images.
- `GET /api/storefront/products/:slug`: Returns single product details by URL slug.
- `POST /api/orders`: Validates and creates a new COD order. Computes delivery charges, records items, enqueues outbox job.
- `POST /api/incomplete-orders`: Debounced lead capture for abandoned checkouts. Upserts lead based on phone number.
- `GET /feeds/facebook.xml`: Generates real-time Meta Commerce Manager catalog RSS 2.0 feed.

### Merchant Admin APIs (⚠️ Currently Unauthenticated)
- `GET /api/admin/orders`: List store orders with optional filters `?callStatus=` and `?status=`.
- `PATCH /api/admin/orders/:id/call-status`: Updates tele-sales call outcome, call notes, increments attempts.
- `POST /api/admin/orders/:id/advance-verify`: Records manual bKash/Nagad advance payment verification.
- `GET /api/admin/incomplete-orders`: List abandoned leads enriched with generated `whatsappUrl`.
- `POST /api/admin/courier/book`: Books consignment directly with Steadfast API and creates remittance expectation.
- `GET /api/admin/courier/export-csv`: Streams Steadfast bulk import CSV file for confirmed orders.
- `GET /api/admin/courier/remittances`: Returns list of expected courier payouts and reconciliation status.
- `POST /api/admin/products`: Creates product, variants, and image records in catalog.
- `PUT /api/admin/theme`: Updates store theme archetype, announcement bar, and support numbers.

---

# 13. FILE & DIRECTORY ARCHITECTURE

```text
d:\Go Com
├── apps/
│   ├── api/                     # Backend Hono API & BullMQ Background Worker
│   │   ├── src/
│   │   │   ├── config.ts        # Zod validated environment configuration
│   │   │   ├── index.ts         # Main server entrypoint (port 3000)
│   │   │   ├── worker.ts        # Process-isolated BullMQ worker
│   │   │   ├── middleware/      # Security headers & Tenant resolution middleware
│   │   │   ├── routes/          # Health, Storefront, Checkout, Incomplete, Feed, Admin
│   │   │   └── services/        # BullMQ Queues & Steadfast API client
│   │   └── test/api.test.ts     # Automated Node test runner suite
│   ├── dashboard/               # React 19 Merchant Administrative SPA (Vite, port 5173)
│   │   └── src/
│   │       ├── App.tsx          # Main dashboard container & tab router
│   │       ├── components/      # Sidebar navigation & branding
│   │       ├── lib/             # Client-side Canvas WebP image compressor
│   │       └── views/           # Orders, Incomplete Leads, Products, Courier, Themes
│   └── storefront/              # Astro SSR Edge Storefront (port 4321)
│       └── src/
│           ├── components/      # InlineCheckoutForm React island & ViralFunnelTheme
│           └── pages/index.astro# Multi-tenant SSR entrypoint
├── packages/
│   ├── contracts/               # Shared Zod schemas, poisha/BDT & phone utils
│   └── db/                      # Drizzle ORM schema, client connection pool, seed data
├── android/                     # Kotlin Android Studio app (WebView wrapper + FCM)
├── docker-compose.yml           # Local development stack (PostgreSQL 17 + Valkey 8)
├── Dockerfile.api               # Multi-stage production container for API
├── Dockerfile.storefront        # Multi-stage production container for Astro SSR
├── run.bat / run.ps1 / run.sh   # Cross-platform 1-click local development runners
└── turbo.json                   # Turborepo task pipeline configuration
```

---

# 14. IMPORTANT FILE MAP

| System Area | File Path | Purpose | Implementation Status |
|---|---|---|---|
| **Database Schema** | `packages/db/src/schema.ts` | Complete relational Drizzle schema | ✅ Complete |
| **Tenant Queries** | `packages/db/src/tenant.ts` | Scoped repository for store isolation | ✅ Complete |
| **Seed Data** | `packages/db/src/seed.ts` | 64 BD districts, demo Grihogadget store | ✅ Complete |
| **Contracts** | `packages/contracts/src/index.ts` | Zod validation & currency/phone utils | ✅ Complete |
| **API Entry** | `apps/api/src/index.ts` | Hono server & route mounting | ✅ Complete |
| **Tenant Middleware**| `apps/api/src/middleware/tenant.ts` | Hostname & subdomain tenant resolution | ⚠️ Needs auth check |
| **Checkout API** | `apps/api/src/routes/checkout.ts` | Atomic order creation & fee logic | ⚠️ Order number race |
| **Incomplete Leads** | `apps/api/src/routes/incomplete.ts` | Debounced lead capture endpoint | ✅ Complete |
| **Admin Operations** | `apps/api/src/routes/admin.ts` | Tele-sales, courier booking, CSV export | ⚠️ Unauthenticated |
| **Steadfast Client** | `apps/api/src/services/steadfast.ts` | Official Steadfast API adapter | ✅ Complete |
| **Background Worker**| `apps/api/src/worker.ts` | BullMQ outbox job consumer | 🟡 Stubs for FCM & CAPI |
| **Dashboard Main** | `apps/dashboard/src/App.tsx` | Main state controller & KPI bar | ✅ Complete |
| **Orders View** | `apps/dashboard/src/views/OrdersView.tsx` | Tele-sales call center view | ✅ Complete |
| **Lead Recovery** | `apps/dashboard/src/views/IncompleteView.tsx` | WhatsApp 1-click lead recovery | ✅ Complete |
| **Image Compressor**| `apps/dashboard/src/lib/image-compress.ts` | Zero-compute browser Canvas WebP | ✅ Complete |
| **Storefront Page** | `apps/storefront/src/pages/index.astro` | SSR multi-tenant landing page | ⚠️ Hardcoded theme |
| **Checkout Island** | `apps/storefront/src/components/InlineCheckoutForm.tsx` | React 19 interactive COD form | ✅ Complete |
| **Android Service** | `android/.../GoComFirebaseMessagingService.kt` | FCM push notification receiver | ⚠️ Missing sound file |

---

# 15. BUSINESS LOGIC & STATE MACHINES

### Monetary Representation (Poisha Rule)
To avoid JavaScript floating-point rounding errors (e.g. `0.1 + 0.2 !== 0.3`), all currency amounts are stored as integers in **poisha** ($1\text{ BDT} = 100\text{ poisha}$).
- ৳1,050 product price $\rightarrow$ `105000` poisha
- ৳60 delivery charge $\rightarrow$ `6000` poisha
- ৳120 advance charge $\rightarrow$ `12000` poisha
- Helper utilities: `poishaToBdt()`, `bdtToPoisha()`, and `formatBdt()` in `packages/contracts/src/common.ts`.

### Tele-Sales Call Status State Machine
```text
                  ┌───────────────┐
                  │    pending    │
                  └───────┬───────┘
                          │
         ┌────────────────┼────────────────┬────────────────┐
         ▼                ▼                ▼                ▼
   ┌───────────┐   ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
   │ confirmed │   │ no_answer_1 │  │ wrong_number│  │ cancelled_by_│
   └─────┬─────┘   └──────┬──────┘  └─────────────┘  │   customer   │
         │                ▼                          └──────────────┘
         │         ┌─────────────┐
         │         │ no_answer_2 │
         │         └──────┬──────┘
         │                ▼
         │         ┌─────────────┐
         │         │ no_answer_3 │
         │         └─────────────┘
         ▼
   (Order Status becomes 'confirmed', ready for courier)
```

### Order Fulfillment Status State Machine
```text
   pending ──► confirmed ──► processing ──► shipped ──► delivered
      │                                       │
      ▼                                       ▼
  cancelled                                returned
```

### Incomplete Order (Abandoned Lead) State Machine
```text
   abandoned ──► called ──► recovered (converts to Order)
       │
       ▼
    dropped
```

---

# 16. PAYMENT & ANTI-FRAUD SYSTEM

- **Primary Payment Method:** 100% Cash on Delivery (COD). The shopper pays the delivery courier upon receiving and inspecting the package.
- **Advance Delivery Charge Anti-Fraud Workflow:**
  - High return rates outside Dhaka plague Bangladesh eCommerce (fake orders, competitors placing bogus orders).
  - Merchants enable `advanceDeliveryRequiredOutsideDhaka: true`.
  - When a shopper selects **ঢাকার বাইরে** or **ঢাকা উপশহর**, the form highlights an advance charge of ৳120 to cover courier return costs.
  - The shopper sends money to the merchant's personal bKash/Nagad number and submits the TrxID.
  - The order is created with `advanceRequired: true` and `advanceVerified: false`.
  - In `OrdersView.tsx`, the merchant verifies the TrxID and clicks verify.
  - When booking the parcel or generating the Steadfast CSV, the COD collection amount is automatically reduced by ৳120 (`COD = totalAmount - advanceAmount`).
- **Online Payment Gateways (bKash Checkout, SSLCommerz):** 🔴 Not implemented. No payment gateway SDKs or webhook handlers exist.

---

# 17. COURIER & LOGISTICS INTEGRATIONS

### Steadfast Courier (`apps/api/src/services/steadfast.ts`)
- **API Integration:**
  - Endpoint: `POST https://portal.steadfast.com.bd/api/v1/create_order`
  - Authentication: `Api-Key` and `Secret-Key` headers
  - Payload: `invoice`, `recipient_name`, `recipient_phone` (11 digits, stripped `+88`), `recipient_address`, `cod_amount` (in BDT), `note`.
  - Response: Stores `consignment_id` and `tracking_code` into `orders` table. Sets order status to `shipped`.
- **Bulk CSV Export Fallback:**
  - When the Steadfast API is slow or credentials are not yet approved, merchants click **Steadfast CSV ডাউনলোড**.
  - Generates RFC-compliant CSV with exact portal headers: `Invoice,Name,Address,Phone,Amount,Note`.
  - Automatically subtracts verified advance payments from the COD amount.

### Pathao Courier
- Environment variables exist (`PATHAO_CLIENT_ID`, `PATHAO_CLIENT_SECRET`, `PATHAO_BASE_URL`).
- Interface `PathaoCsvRow` exists in `packages/contracts/src/courier.ts`.
- 🔴 Pathao API client is NOT yet written in `apps/api`.

---

# 18. DOMAIN, DNS & CLOUDFLARE EDGE TOPOLOGY

### Edge Specification (Cloudflare Free Tier + Cloudflare for SaaS)
- **Apex & Subdomains:**
  - `yourbrand.com`: Main landing page & platform admin.
  - `*.yourbrandshop.com`: Storefront subdomains (e.g. `grihogadget.yourbrandshop.com`).
- **Custom Domains:**
  - Merchants configure a CNAME from `www.merchant.com` $\rightarrow$ `shops.yourbrandshop.com`.
  - Cloudflare for SaaS handles automatic SSL certificate issuance.
- **Edge Cache Rules:**
  - Origin sets `Cache-Control: public, max-age=0, s-maxage=86400`.
  - Cloudflare edge caches HTML pages for 24 hours.
  - Purging occurs via `Cache-Tag: s:{store_id},s:{store_id}:home`.
- **Query Parameter Stripping Rule:**
  - Transform rule strips tracking query parameters (`fbclid`, `utm_source`, `utm_campaign`, `gclid`) before edge cache evaluation to maintain high cache hit ratios on Facebook Ad traffic.
- **Repository Implementation Status:** The Astro origin headers are configured in `apps/storefront/src/pages/index.astro`. Cloudflare API management routes and tunnel config files are planned and not stored in repo.

---

# 19. CACHING & PERFORMANCE ARCHITECTURE

### Target Budget: 4 GB RAM VPS Zero-Crash Architecture
| Tier | Technology | Configuration / Implementation |
|---|---|---|
| **Database Pool** | `postgres.js` | Restricted to max 10 connections (`packages/db/src/client.ts`) |
| **In-Memory Cache** | Node `Map` | 60-second TTL for resolved hostnames (`apps/api/src/middleware/tenant.ts`) |
| **Worker Concurrency**| BullMQ | Restricted to concurrency of 2 (`apps/api/src/worker.ts`) |
| **Valkey Memory** | Valkey 8 | Memory capped at 128 MB with `noeviction` (`docker-compose.yml`) |
| **Edge Cache** | Cloudflare | `s-maxage=86400` with Cache Tags |
| **Image Compression**| Browser Canvas | Zero server CPU/RAM usage. Converted in browser before upload. |

---

# 20. COMPREHENSIVE SECURITY AUDIT

### Vulnerability Findings by Severity

| Severity | Vulnerability | Location | Description & Impact |
|---|---|---|---|
| 🚨 **CRITICAL** | **Missing Authentication on Admin APIs** | `apps/api/src/routes/admin.ts` | All `/api/admin/*` endpoints have no authentication or session check. Anyone can read orders, change statuses, book couriers, or delete products. |
| 🚨 **CRITICAL** | **Tenant Spoofing via `x-tenant-id` Header** | `apps/api/src/middleware/tenant.ts` | The tenant middleware trusts the `x-tenant-id` HTTP header without checking the caller's identity or permissions (BOLA/IDOR). |
| ⚠️ **HIGH** | **Sequential Order Number Race Condition** | `packages/db/src/tenant.ts` line 82 | Concurrent checkouts read identical `MAX(order_number)` values, triggering unique constraint violations (`500 Internal Server Error`). |
| ⚠️ **HIGH** | **Inventory Race & No Stock Decrement** | `apps/api/src/routes/checkout.ts` | Order placement does not check if stock is available and never decrements `stockQuantity`. |
| ⚠️ **MEDIUM** | **Localhost Fallback Tenant Hijack** | `apps/api/src/middleware/tenant.ts` line 64 | Any request with `Host: localhost` defaults to the first active store in the database. |
| ⚠️ **MEDIUM** | **Temporary Blob Image Persistence** | `apps/dashboard/src/views/ProductsView.tsx` | New products save `blob:...` client URLs which become invalid as soon as the browser tab closes. |
| ℹ️ **LOW** | **Wildcard CORS in Development** | `apps/api/src/index.ts` line 25 | CORS allows `*` if origin is not provided. |

---

# 21. ERROR HANDLING & OBSERVABILITY

- **API Validation Errors:** Handled via Zod `safeParse`. Returns HTTP 400 with `{ error: "Validation failed", details: error.format() }`.
- **Health Check Endpoint:** `GET /health` runs `SELECT 1` on PostgreSQL and returns HTTP 200 or HTTP 503.
- **Queue Fault Tolerance:** BullMQ configured with exponential backoff (3 attempts for outbox, 5 attempts for courier).
- **Checkout Resiliency:** If BullMQ Redis connection is down, order creation succeeds in PostgreSQL and logs a warning instead of failing the customer checkout.

---

# 22. AUTOMATED TESTING AUDIT

Automated tests are executed using Node.js native test runner (`node --test`) and `tsx`.

### Test Execution Results: 100% Passing (11 of 11 tests)
```text
@gocom/contracts:test:
  ✔ BD Phone Schema: validates and normalizes 11-digit mobile numbers (2.49ms)
  ✔ Poisha & BDT Conversion: handles exact monetary amounts (18.45ms)
  ✔ Steadfast CSV Generator: strips +88 and formats columns for portal upload (0.42ms)
  ✔ Steadfast CSV Generator: deducts advance delivery payment if verified (0.19ms)
  ✔ 1-Click WhatsApp Recovery URL: generates valid wa.me link with encoded Bangla message (0.33ms)
  ✔ Checkout Order Schema: enforces mandatory fields for COD (1.86ms)
  Tests: 6 passed, 0 failed

@gocom/api:test:
  ✔ Security Headers: ensures mandatory protection headers on every response (21.14ms)
  ✔ Health Check Endpoint: responds with system status (18.13ms)
  ✔ OpenAPI Interactive Docs: /docs returns HTML documentation UI (2.51ms)
  ✔ Checkout API: rejects malformed order payloads with 400 Bad Request (2.41ms)
  ✔ Incomplete Orders API: rejects invalid phone numbers (2.61ms)
  Tests: 5 passed, 0 failed
```

### Untested Components
- Frontend React components (`apps/dashboard` and `apps/storefront` have no Vitest or Playwright tests).
- BullMQ worker job execution has no unit tests.
- Steadfast live API network calls have no mocked integration tests.

---

# 23. DEPLOYMENT & CONTAINER ARCHITECTURE

### Production Multi-Container Layout (Coolify)
1. **Container 1: `gocom-postgres`** (PostgreSQL 17 on Alpine, port 5432, 700 MB memory cap).
2. **Container 2: `gocom-valkey`** (Valkey 8 on Alpine, port 6379, 150 MB memory cap).
3. **Container 3: `gocom-api`** (Node 24 LTS via `Dockerfile.api`, port 3000, 250 MB memory cap).
4. **Container 4: `gocom-worker`** (Same image as API with `CMD ["node", "dist/worker.js"]`, 250 MB memory cap).
5. **Container 5: `gocom-storefront`** (Node 24 LTS via `Dockerfile.storefront`, port 4321, 250 MB memory cap).
6. **Cloudflare Pages:** `apps/dashboard` built with `pnpm --filter @gocom/dashboard build` outputting static assets to `dist/`, hosted on Cloudflare Pages (0 MB VPS RAM).

---

# 24. ENVIRONMENT VARIABLES INVENTORY

| Variable Name | Category | Purpose | Required? | Where Used |
|---|---|---|---|---|
| `NODE_ENV` | Runtime | 'development', 'production', or 'test' | Required | Monorepo-wide |
| `PORT` | API | HTTP server listen port (default 3000) | Optional | `apps/api/src/config.ts` |
| `DATABASE_URL` | Database | PostgreSQL connection URI | Required | `@gocom/db`, `apps/api` |
| `REDIS_URL` | Cache/Queue | Valkey/Redis connection URI | Required | `apps/api/src/config.ts` |
| `SESSION_SECRET` | Security | 64-char crypto session secret | Required in Prod | `apps/api/src/config.ts` |
| `PLATFORM_ROOT_DOMAIN` | Networking | e.g. `yourbrand.com` | Optional | `apps/api/src/config.ts` |
| `STOREFRONT_ROOT_DOMAIN`| Networking | e.g. `yourbrandshop.com` | Required | `apps/api/src/config.ts` |
| `STEADFAST_API_KEY` | Logistics | Steadfast Courier API Key | Optional (Prod) | `apps/api/src/services/steadfast.ts` |
| `STEADFAST_SECRET_KEY` | Logistics | Steadfast Courier Secret Key | Optional (Prod) | `apps/api/src/services/steadfast.ts` |
| `STEADFAST_BASE_URL` | Logistics | Default `https://portal.steadfast.com.bd/api/v1` | Optional | `apps/api/src/services/steadfast.ts` |
| `R2_ACCOUNT_ID` | Storage | Cloudflare R2 Account ID | Planned | `.env.example` |
| `R2_ACCESS_KEY_ID` | Storage | Cloudflare R2 Access Key | Planned | `.env.example` |
| `R2_SECRET_ACCESS_KEY` | Storage | Cloudflare R2 Secret Key | Planned | `.env.example` |
| `R2_BUCKET_NAME` | Storage | Cloudflare R2 Bucket Name | Planned | `.env.example` |
| `CLOUDFLARE_API_TOKEN` | Edge | Cloudflare for SaaS custom hostnames | Planned | `.env.example` |
| `CLOUDFLARE_ZONE_ID` | Edge | Cloudflare Zone ID | Planned | `.env.example` |
| `FIREBASE_PROJECT_ID` | Notifications | Firebase Cloud Messaging project | Planned | `.env.example` |
| `PATHAO_CLIENT_ID` | Logistics | Pathao Hermes API Client ID | Planned | `.env.example` |

---

# 25. PACKAGE DEPENDENCY AUDIT

### Version Inconsistencies Detected
- **Tailwind CSS Mismatch:**
  - `apps/dashboard`: Uses **Tailwind CSS v4.0.0** with `@tailwindcss/vite`.
  - `apps/storefront`: Uses **Tailwind CSS v3.4.17** with `@astrojs/tailwind`.
  - *Note:* Do not force upgrade storefront to v4 without verifying Astro integration support.
- **Unused Packages:**
  - `dotenv` is listed in both `packages/db` and `apps/api`. Node 22+ supports native `--env-file`, but `dotenv` is currently retained for local script runners.

---

# 26. DEAD, LEGACY & INCOMPLETE CODE AUDIT

1. **Committed Compiled Artifacts in `src`:**
   - In `packages/contracts/src` and `packages/db/src`, TypeScript compiler outputs (`.js`, `.d.ts`, `.map`) were committed directly into the source folders because `tsconfig.json` lacks an `outDir`.
2. **Missing `packages/themes` and `packages/logistics`:**
   - Mentioned in `MASTER_ARCHITECTURE.md`, but neither directory exists in `packages/`.
3. **Android Cha-Ching Audio File:**
   - `GoComFirebaseMessagingService.kt` references `res/raw/chaching.mp3`, but `res/raw/` directory does not exist in the Android project.
4. **Worker Log Placeholders:**
   - `apps/api/src/worker.ts` has console logs for Firebase Admin SDK and Meta CAPI rather than actual SDK invocations.

---

# 27. CURRENT STATE — WHAT WORKS RIGHT NOW

If you run `./run.sh` or `run.ps1` with Docker active:
1. PostgreSQL 17 and Valkey 8 spin up in Docker.
2. Drizzle creates all tables and seeds the demo store **গৃহগ্যাজেট (Grihogadget)** with 64 Bangladesh districts, demo products, and sample orders.
3. The Storefront loads on `http://localhost:4321` rendering a single-product viral funnel with sticky emergency bar, problem/solution bullets, and 1-step inline checkout.
4. Typing `01711223344` debounces and creates an abandoned lead in PostgreSQL.
5. Submitting the form places order #1003 in PostgreSQL and prints BullMQ outbox logs.
6. The Dashboard loads on `http://localhost:5173` showing gross sales, confirmation rate, tele-sales orders, and abandoned leads.
7. Merchants can click to call customers, verify advance bKash payments, book parcels to Steadfast API, and download Steadfast bulk CSV files.

---

# 28. PRIORITIZED IMPLEMENTATION BACKLOG

### Priority 1: Critical (Must Fix Before Any Production Deployment)
1. **Implement Better Auth:** Install Better Auth in `packages/db` and `apps/api`. Protect `/api/admin/*` endpoints with session middleware.
2. **Fix Order Number Sequence:** Replace `MAX(order_number) + 1` with a PostgreSQL sequence or atomic transaction with row locking.
3. **Resolve `x-tenant-id` Security Hole:** Restrict `x-tenant-id` to authenticated users whose `storeMembers.userId` belongs to that store.

### Priority 2: High (Core Product Completeness)
1. **Cloudflare R2 Presigned Upload API:** Implement `POST /api/media/upload-url` in Hono and connect `ProductsView.tsx` to upload compressed WebP directly to R2.
2. **Add Storefront Product Page (`/p/[slug]`):** Create `apps/storefront/src/pages/p/[slug].astro` so Meta Catalog Facebook Ad clicks do not 404.
3. **Implement Stock Decrement:** Decrement variant stock on checkout and block checkout if stock is 0.

### Priority 3: Medium (Feature Enhancements)
1. **Implement Remaining 4 Theme Archetypes:** Create Astro templates for Multi-Item Campaign, Fashion Store, Tech Gadget, and Organic Food.
2. **Steadfast Delivery Webhook:** Add `POST /api/webhooks/steadfast` to update delivery and return statuses automatically.
3. **Wire Firebase Admin SDK:** Implement FCM push notifications in `worker.ts` using `FIREBASE_PRIVATE_KEY`.

### Priority 4: Low (Polish & Scale)
1. **Add Sound Asset to Android:** Place `chaching.mp3` in `android/app/src/main/res/raw/`.
2. **Clean Monorepo TS Output:** Configure `outDir: "dist"` in `packages/contracts` and `packages/db` and remove committed `.js`/`.d.ts` from `src/`.

---

# 29. KNOWN PROBLEMS & TECHNICAL DEBT

1. **Unauthenticated Admin Endpoints:** Anyone can perform admin mutations via curl.
2. **Race Condition on High Traffic:** Sequential order numbers will collide under concurrent checkouts.
3. **Decoupled Inventory:** Product variants have stock quantities, but checkouts never decrease them.
4. **Local Blob Image URLs:** Images added via dashboard modal break when reloading the dashboard.
5. **Missing Migration Folder:** Relies on `drizzle-kit push`, lacking traceable SQL migration history.

---

# 30. CURRENT DEVELOPMENT PHASE

```text
[X] 1. Monorepo & Base Tooling Setup (pnpm, Turbo, TypeScript)
[X] 2. Database Schema Design & Bangladesh Contracts (Drizzle, Zod)
[X] 3. Storefront SSR & Viral Funnel Archetype (Astro, Preact Island)
[X] 4. Incomplete Order Abandoned Lead Engine (Debounced API, WhatsApp URL)
[X] 5. Tele-Sales Call Center Dashboard (React 19, Dial Links, Status Selector)
[X] 6. Logistics Adapters (Steadfast API Parcel Booking, Bulk CSV Export)
[X] 7. Client-Side Image Compression Pipeline (Canvas WebP)
[ ] 8. Multi-Tenant Merchant Authentication (Better Auth) ◄── [CURRENT FOCUS]
[ ] 9. Cloudflare R2 Direct Upload & Presigned URLs
[ ] 10. Remaining 4 Storefront Archetype Templates
[ ] 11. Courier Webhooks & Payout Reconciliation
[ ] 12. Production Coolify & Cloudflare Pages Deployment
```

---

# 31. PROJECT ROADMAP ANALYSIS

- **Documented Roadmap (`MASTER_ARCHITECTURE.md`):** Sprint 1 (Base Platform & Better Auth) $\rightarrow$ Sprint 2 (Storefront & 5 Archetypes) $\rightarrow$ Sprint 3 (Operations & Tele-Sales Dashboard) $\rightarrow$ Sprint 4 (Android App & Coolify Deploy).
- **Codebase Reality:** The project built Sprints 2, 3, and 4 (Storefront, Tele-Sales, Steadfast, Android WebView) before implementing Sprint 1's Better Auth. As a result, the operational F-Commerce features work, but user registration and authentication are completely unbuilt.

---

# 32. ARCHITECTURAL DECISIONS LOG

1. **Decision: Client-Side Browser Image Compression**
   - *Evidence:* [apps/dashboard/src/lib/image-compress.ts](file:///d:/Go%20Com/apps/dashboard/src/lib/image-compress.ts)
   - *Reason:* 4 GB VPS RAM limit. Running `sharp` on 15 MB mobile photos will trigger kernel OOM crashes.
2. **Decision: Process-Isolated BullMQ Worker**
   - *Evidence:* `apps/api/src/worker.ts` and `Dockerfile.api`
   - *Reason:* Prevents hanging third-party courier APIs or webhook retries from blocking customer checkouts.
3. **Decision: Poisha Integer Representation for Currency**
   - *Evidence:* `packages/contracts/src/common.ts`
   - *Reason:* Prevents floating-point currency drift across orders and courier remittances.
4. **Decision: 1-Step Inline COD Checkout**
   - *Evidence:* `ViralFunnelTheme.astro` & `InlineCheckoutForm.tsx`
   - *Reason:* Cart pages drop conversion by over 40% in Bangladesh mobile traffic.

---

# 33. AI DEVELOPMENT RULES & INVARIANTS

For any AI assistant continuing development on this codebase:
1. **Never mutate money as float in database:** Always convert BDT $\rightarrow$ Poisha with `bdtToPoisha()` before database insertion.
2. **Always validate phone numbers with `bdPhoneSchema`:** Enforces standard 11 digits and normalizes to `+8801XXXXXXXXX`.
3. **Never import `sharp` into the API or Worker:** Image resizing must remain client-side.
4. **Always scope queries by `storeId`:** Maintain tenant isolation in every query.
5. **Run test suite before completing tasks:** Verify with `pnpm test` and `pnpm build`.

---

# 34. GIT & REVISION HISTORY ANALYSIS

- `ef285a9`: Initial release of Go Commerce BD multi-tenant platform (monorepo, Astro storefront, Hono API, Drizzle schema, React dashboard, Kotlin Android wrapper).
- `ccc81b2`: Added cross-platform local runner scripts (`run.bat`, `run.ps1`, `run.sh`) and database push commands.

---

# 35. DOCUMENTATION CONSISTENCY CHECK (DOC VS CODE)

| Documentation Claim in `MASTER_ARCHITECTURE.md` | Actual Codebase Reality | Status |
|---|---|---|
| "PostgreSQL 18" | `docker-compose.yml` uses `postgres:17-alpine` | ⚠️ Discrepancy |
| "Better Auth multi-tenant authentication" | `better-auth` package is not installed; no auth routes exist | 🔴 Major Gap |
| "React 19 SPA (Vite + TanStack Router)" | Uses local tab state in `App.tsx`; TanStack Router is not installed | ⚠️ Discrepancy |
| "5 Core Theme Archetypes" | Only `ViralFunnelTheme.astro` exists; other 4 are UI stubs | 🟡 Partial |
| "Presigned PUT URL from API (`/v1/media/upload-url`)" | No media upload route exists; uses blob URLs | 🔴 Major Gap |
| "Meta CAPI purchase event deduplication" | `worker.ts` only logs to console; no Meta Graph API call | 🟡 Stub |
| "Pathao Courier API integration" | Only Steadfast is implemented; Pathao client does not exist | 🔴 Missing |
| "`packages/themes` and `packages/logistics`" | Neither directory exists in `packages/` | ⚠️ Monorepo Difference |

---

# 36. CONFIDENCE & VERIFICATION MATRIX

- **High Confidence (100% Verified in Code):** Database Schema, Monorepo Setup, Hono API Routes, Inline COD Checkout, Abandoned Lead Debounce Capture, Tele-Sales Dashboard, Steadfast API & CSV Export, Test Suites, Image Compressor.
- **High Confidence (Verified Missing):** Better Auth, Pathao API, R2 Presigned Uploads, Other 4 Astro Themes, Stock Decrement Logic.

---

# 37. MASTER SYSTEMS STATUS TABLE

| System | Status | Frontend | Backend | Database | Integration | Main Files | Outstanding Problems |
|---|---|---|---|---|---|---|---|
| **Authentication** | 🔴 Planned | None | None | `users`, `sessions` | None | `packages/db/src/schema.ts` | Better Auth not installed; admin is unprotected |
| **Multi-Tenancy** | ⚠️ Has Issues | Host-aware | Subdomain/Host parser | `stores`, `domains` | In-memory cache | `apps/api/src/middleware/tenant.ts` | `x-tenant-id` header spoofing vulnerability; no RLS |
| **Products Catalog**| ⚠️ Has Issues | `ProductsView.tsx` | `POST /api/admin/products` | `products`, `variants` | None | `apps/dashboard/src/views/ProductsView.tsx`| Image uploads save temporary blob URLs |
| **Orders & Checkout**| ⚠️ Has Issues | `InlineCheckoutForm.tsx`| `POST /api/orders` | `orders`, `order_items` | BullMQ Outbox | `apps/api/src/routes/checkout.ts` | Race condition in order numbers; no stock decrement |
| **Tele-Sales CRM** | ✅ Working | `OrdersView.tsx` | `PATCH .../call-status` | `orders.call_status` | `tel:` links | `apps/dashboard/src/views/OrdersView.tsx`| Audit history not recorded in `order_events` |
| **Incomplete Leads**| ✅ Working | `InlineCheckoutForm.tsx`| `POST /api/incomplete-orders`| `incomplete_orders` | WhatsApp links | `apps/api/src/routes/incomplete.ts` | Not auto-linked when order later finishes |
| **Logistics (Steadfast)**| ✅ Working | `CourierView.tsx` | `SteadfastCourierService` | `courier_remittances` | Steadfast API | `apps/api/src/services/steadfast.ts` | No delivery status webhook handler |
| **Logistics (Pathao)**| 🔴 Planned | None | None | None | None | `packages/contracts/src/courier.ts` | Client adapter not written |
| **Anti-Fraud (bKash)**| ✅ Working | `OrdersView.tsx` | `POST .../advance-verify` | `orders.advance_*` | Manual bKash Trx | `apps/api/src/routes/admin.ts` | Manual verification only (no automated API) |
| **Storefront Themes**| 🟡 Partial | `index.astro` | `GET /api/storefront/config` | `stores.theme_*` | Astro SSR | `apps/storefront/src/pages/index.astro` | Only 1 of 5 themes implemented; no `/p/[slug]` |
| **Meta Catalog Feed**| ✅ Working | None | `GET /feeds/facebook.xml` | `products`, `variants` | RSS 2.0 XML | `apps/api/src/routes/feed.ts` | Product links point to unrouted `/p/[slug]` |
| **Android App** | ⚠️ Has Issues | WebView | External link interception | None | Firebase Messaging | `android/.../MainActivity.kt` | Missing `chaching.mp3`; token endpoint stub |
