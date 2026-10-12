# Go Commerce BD — Multi-Tenant eCommerce & F-Commerce SaaS (Bangladesh)
## Unified Master Architecture & MVP Specification

**Document Version:** 1.0 (Production Blueprint)  
**Target Environment:** Coolify on 2 vCPU / 4 GB RAM / 40 GB NVMe VPS (Germany) + Cloudflare Free Tier  
**Target Market:** Bangladesh Mobile Shoppers (4G/3G data, COD-first, Facebook Ad traffic) & Local F-Commerce Merchants  

---

## 1. Executive Summary & Architectural Consensus

This document represents the **authoritative synthesis** of the initial high-performance foundation and the pragmatic Bangladesh operational corrections:

1. **Keep the Technical Foundation:** Edge-cached SSR via Astro (sub-30 KB JS), Hono Node.js API, PostgreSQL 18 with Drizzle ORM, Valkey caching, Cloudflare R2 image storage, Cloudflare Tunnel, and Cloudflare for SaaS custom hostnames.
2. **Process Isolation with Zero-Crash Memory Layout:** Retain an isolated BullMQ background worker container (do not merge with the API), but eliminate server-side image processing. All image resizing and WebP conversion happens **client-side in the merchant browser and mobile app**.
3. **Consolidate Admin Applications:** A single React 19 SPA on Cloudflare Pages serving both Merchant Dashboard and Super-Admin panel via RBAC routes (`/admin/*`), consuming zero VPS RAM.
4. **Android App Strategy (Phased):**
   * **Phase 1 (MVP):** Kotlin WebView wrapper around the responsive dashboard + **Native Firebase Cloud Messaging (FCM) Service** with high-priority wake locks and custom cash-register ("Cha-Ching!") sound. Ship in days, not months.
   * **Phase 2 (Scale):** Pure Jetpack Compose native application consuming the OpenAPI-generated SDK.
5. **Shift Focus from "100+ Generic Themes" to 5 High-Converting BD Archetypes:**
   * Single-Product Viral Funnel (Grihogadget style)
   * Multi-Item Campaign Page
   * Fashion & Apparel Store (Variant chips & cart drawer)
   * Tech & Gadget Store (Specs & warranty badges)
   * Organic Food & Grocery (Weight variants & fast checkout)
6. **Prioritize Bangladesh Operational Realities:**
   * Automated Incomplete Order (Abandoned Lead) capture on phone input.
   * Tele-sales Call Verification pipeline (`tel:` links, retry counters).
   * Advance Delivery Charge bKash/Nagad workflow.
   * Dynamic Facebook Product Catalog XML Feed (`/feeds/facebook.xml`).
   * Steadfast / Pathao API + One-click Courier CSV Export fallback.
   * Courier COD Remittance & Return reconciliation tracker.

---

## 2. Infrastructure & Memory Allocation (4 GB VPS)

By delegating image compression to the merchant's device and static assets to Cloudflare, the 4 GB server maintains an isolated, multi-container architecture with **> 1.6 GB of unallocated headroom**, preventing OOM crashes.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TOTAL SYSTEM RAM: 4,096 MB (4 GB)                    │
├───────────────────────────────────┬──────────────┬─────────────────────┤
│ Service / Container               │ Memory Cap   │ Internal Limits     │
├───────────────────────────────────┼──────────────┼─────────────────────┤
│ OS (Ubuntu 24.04 LTS) + Docker    │ 350 MB       │ System reserved     │
│ Coolify Engine & Internal Proxy   │ 400 MB       │ System management   │
│ PostgreSQL 18                     │ 700 MB       │ shared_buffers=256M │
│ Valkey (Redis alternative)        │ 150 MB       │ maxmemory 128MB     │
│ Hono API (Node 24 LTS)            │ 250 MB       │ max-old-space=200M  │
│ BullMQ Worker (Node 24 LTS)       │ 250 MB       │ max-old-space=200M  │
│ Astro SSR Storefront (Node)       │ 250 MB       │ max-old-space=200M  │
│ Cloudflared Tunnel                │ 60 MB        │ Lightweight ingress │
├───────────────────────────────────┼──────────────┼─────────────────────┤
│ TOTAL ACTIVE ALLOCATION           │ ~2,410 MB    │ (~2.4 GB)           │
│ UNALLOCATED SAFETY HEADROOM       │ ~1,686 MB    │ Buffer for bursts   │
│ EMERGENCY NVMe SWAPFILE           │ 4,096 MB     │ vm.swappiness=10    │
└───────────────────────────────────┴──────────────┴─────────────────────┘
```

### Why Worker Isolation is Kept
* BullMQ runs in a separate Docker container using the same base image as the API but with `CMD ["pnpm", "start:worker"]`.
* **Fault Isolation:** If a third-party courier webhook fails, a Meta CAPI request hangs, or an unexpected edge case spikes CPU, the API container continues serving checkout and storefront traffic without interruption.
* Since raw image decoding is eliminated from the worker, it handles purely network/IO-bound tasks (dispatching webhooks, pushing notifications, updating database records).

---

## 3. High-Performance Edge & Domain Topology

```
                  Shopper Mobile Traffic (Bangladesh 4G/3G)
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │        Cloudflare Edge (Dhaka / Chattogram PoPs)        │
        │                                                         │
        │  1. Transform Rule: remove_query_args(fbclid, utm_*)    │
        │  2. Cache Rules: Cache HTML (s-maxage=86400, purge-tag) │
        │  3. Cloudflare for SaaS: Custom Hostnames (CNAME target)│
        │  4. Cloudflare R2: Pre-compressed WebP Images           │
        └────────────────────────────┬────────────────────────────┘
                                     │ Cloudflare Tunnel (Outbound)
                                     ▼
                      VPS (Coolify / Docker Network)
                 ┌───────────────────────────────────────┐
                 │             cloudflared               │
                 │   /api/*         ──► api:3000         │
                 │   /feeds/*       ──► api:3000         │
                 │   (all else)     ──► storefront:4321  │
                 └───────────────────┬───────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
        PostgreSQL 18 (Local)                 Valkey (Cache & Queue)
```

### Critical Edge Rules
1. **Strip Tracking Query Parameters:**
   ```
   Expression: (http.host ne "api.yourbrand.com")
   Dynamic Rewrite: remove_query_args(http.request.uri.query, {"fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "gclid", "ttclid"})
   ```
2. **HTML Caching:**
   * Origin sends: `Cache-Control: public, max-age=0, s-maxage=86400`
   * Cache Tags: `s:{store_id}, s:{store_id}:p:{product_id}, s:{store_id}:catalog`
   * Never send `Set-Cookie` on public storefront HTML.
3. **Custom Domains (Cloudflare for SaaS):**
   * Fallback Origin: `fallback.yourbrandshop.com`
   * Custom hostnames require CNAME: `www.merchant.com` -> `shops.yourbrandshop.com`.
   * Merchant forwards apex `merchant.com` -> `www.merchant.com` at registrar.

---

## 4. Zero-Server-Compute Image Pipeline

To safeguard server stability without paying for Cloudflare Images:

```
[Merchant Dashboard / Mobile App]
       │
       ├─► 1. File Selected (Raw 10MB iPhone/Android photo)
       ├─► 2. Local Canvas/Web Worker compresses to:
       │      - Max dimension: 1200px
       │      - Format: WebP (Quality 80)
       │      - Size: ~80 KB - 140 KB
       ├─► 3. Request presigned PUT URL from API (`/v1/media/upload-url`)
       └─► 4. Direct Upload PUT ──► Cloudflare R2
                                           │
                                           ▼
                             Served via cdn.yourbrand.com
```

---

## 5. Core Data Model & Bangladesh Schema Extensions

### 5.1 Multi-Tenant Tenant Isolation Convention
* Every tenant-owned table contains `store_id UUID NOT NULL`.
* **Primary Isolation:** Repository layer explicitly appends `.where(eq(table.storeId, tenantContext.id))`.
* **Secondary Isolation (Defense in Depth):** PostgreSQL Row Level Security (RLS) configured for transactions.

### 5.2 Specific Tables for F-Commerce Operations

```sql
-- Incomplete Orders (Abandoned Checkout Lead Recovery)
CREATE TABLE incomplete_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(120),
    district VARCHAR(60),
    address TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_amount BIGINT NOT NULL DEFAULT 0, -- poisha
    last_step VARCHAR(30) NOT NULL, -- 'phone_entered', 'address_entered'
    status VARCHAR(30) NOT NULL DEFAULT 'abandoned', -- 'abandoned', 'called', 'recovered', 'dropped'
    notes TEXT,
    recovered_order_id UUID REFERENCES orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_incomplete_store_created ON incomplete_orders(store_id, created_at DESC);

-- Orders with Tele-Sales & Advance bKash Support
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    order_number INT NOT NULL, -- Sequential per store: 1001, 1002...
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    delivery_district VARCHAR(60) NOT NULL,
    delivery_thana VARCHAR(60),
    delivery_address TEXT NOT NULL,
    
    -- Tele-Sales Call Verification
    call_status VARCHAR(30) NOT NULL DEFAULT 'pending', 
    -- 'pending', 'confirmed', 'no_answer_1', 'no_answer_2', 'no_answer_3', 'wrong_number', 'cancelled_by_customer'
    call_attempts INT NOT NULL DEFAULT 0,
    last_called_at TIMESTAMPTZ,
    call_notes TEXT,
    verified_by_user_id UUID REFERENCES users(id),

    -- Financials (Stored in poisha: 1 BDT = 100 poisha)
    subtotal BIGINT NOT NULL,
    delivery_fee BIGINT NOT NULL,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    total_amount BIGINT NOT NULL,

    -- Advance Delivery Charge (Anti-Fraud for outside Dhaka)
    advance_required BOOLEAN NOT NULL DEFAULT FALSE,
    advance_amount BIGINT NOT NULL DEFAULT 0,
    advance_payment_method VARCHAR(20), -- 'bkash_personal', 'nagad_personal', 'bkash_merchant'
    advance_sender_phone VARCHAR(20),
    advance_trx_id VARCHAR(60),
    advance_verified BOOLEAN NOT NULL DEFAULT FALSE,
    advance_verified_at TIMESTAMPTZ,

    -- Order Status & Logistics
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'
    courier_id VARCHAR(30), -- 'steadfast', 'pathao', 'redx'
    courier_consignment_id VARCHAR(100),
    courier_tracking_code VARCHAR(100),
    courier_status VARCHAR(60),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_store_order_number UNIQUE (store_id, order_number)
);

-- Courier Remittance & Payout Reconciliation
CREATE TABLE courier_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    courier_id VARCHAR(30) NOT NULL,
    consignment_id VARCHAR(100) NOT NULL,
    cod_collected BIGINT NOT NULL,
    courier_delivery_charge BIGINT NOT NULL,
    cod_service_fee BIGINT NOT NULL,
    net_payout_expected BIGINT NOT NULL,
    payout_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'received', 'disputed'
    payout_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. The 5 Core Archetype Themes (Engine Specification)

Instead of maintaining 100 separate codebases, the platform implements **5 high-converting component archetypes** configured via standard JSON definitions:

### Archetype 1: Viral Single-Product Funnel (The "Grihogadget" Model)
* **Goal:** Maximum impulse buy conversion from TikTok & Facebook Video ads.
* **Layout:**
  1. Sticky Top Emergency Bar ("অফার শেষ হতে আর মাত্র ৩ ঘণ্টা! সারা দেশে ক্যাশ অন ডেলিভারি")
  2. Large Product Video / Demonstration Carousel
  3. Dynamic Quantity Selector with Discount Badges ("১টি কিনলে ১,০৫০ ৳ | ২টি কিনলে ১,৯৫০ ৳ (১০০ ৳ ছাড়)")
  4. Visual Problem / Solution comparison grid
  5. Customer Review Screenshots (Social Proof)
  6. Direct Inline 1-Step COD Checkout Form (No cart page)
  7. Sticky Mobile Footer: Pulsing "অর্ডার করতে চাই" button that auto-scrolls directly to the form.

### Archetype 2: Multi-Item Campaign Page
* **Goal:** High AOV for bundles, combo offers, and related accessory promotions.
* **Layout:** Grid of 3–8 campaign items, one-click bundle checkboxes ("Add extra filter for ৳250"), live order summary, inline COD form.

### Archetype 3: Fashion & Apparel Store
* **Goal:** Clothing, footwear, sarees, and panjabis.
* **Layout:** Visual category grid, multi-variant selectors (Size buttons with out-of-stock strike-through, Color swatches with image link), Size Chart modal, slide-out Ajax cart drawer.

### Archetype 4: Tech & Gadget Store
* **Goal:** Electronics, watches, audio, and mobile accessories.
* **Layout:** Tabbed specification matrix, warranty badge declaration ("৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি"), unboxing video embed, trust badges.

### Archetype 5: Organic Food & Daily Grocery
* **Goal:** Honey, ghee, mustard oil, dates, nuts, spices.
* **Layout:** Weight/volume chip selector (500g / 1kg / 5kg), harvest authenticity notes, express delivery time indicator, minimum order requirement rules.

---

## 7. Dynamic Facebook Product Catalog Feed

Every store automatically provides a real-time, edge-cached RSS/XML feed conforming to Meta Commerce Manager standards.

* **URL Pattern:** `https://{store}.yourbrandshop.com/feeds/facebook.xml`
* **Response Header:** `Content-Type: application/xml; charset=utf-8`, `Cache-Control: public, s-maxage=3600`
* **XML Payload Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title><![CDATA[Store Name]]></title>
    <link>https://store.yourbrandshop.com</link>
    <description><![CDATA[Store Product Feed]]></description>
    <item>
      <g:id>PROD-1024</g:id>
      <g:title><![CDATA[Wireless Electric Chopper - 250ml]]></g:title>
      <g:description><![CDATA[স্মার্ট রিচার্জেবল ফুড চপার...]]></g:description>
      <g:link>https://store.yourbrandshop.com/p/electric-chopper</g:link>
      <g:image_link>https://cdn.yourbrand.com/s/store-id/chopper-main.webp</g:image_link>
      <g:brand><![CDATA[Store Brand]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>1050.00 BDT</g:price>
    </item>
  </channel>
</rss>
```

---

## 8. Mobile App Implementation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       ANDROID ROADMAP                       │
├──────────────────────────────┬──────────────────────────────┤
│ Phase 1: MVP App (Days 1–3)  │ Phase 2: Native App (Scale)  │
├──────────────────────────────┼──────────────────────────────┤
│ • Kotlin WebView Wrapper     │ • Jetpack Compose UI         │
│ • Pointing to Cloudflare     │ • Offline Room Database      │
│   Pages Dashboard URL        │ • WorkManager Background Sync│
│ • Native Firebase Messaging  │ • Hardware Thermal Printing  │
│   (FCM) HTTP v1 Receiver     │   via Bluetooth ESC/POS      │
│ • WakeLock + Loud Cha-Ching  │ • Direct Biometric Auth      │
│   Cash Register Audio Alert  │ • Full Kotlin Multiplatform  │
│ • Notification Deep-Linking  │   foundation                 │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 9. Monorepo Structure (`d:\Go Com`)

```
/
├── apps/
│   ├── storefront/             # Astro SSR (Node Adapter, Tailwind v4, Preact)
│   ├── dashboard/              # React 19 SPA (Vite + TanStack Router + Tailwind)
│   │                           # Hosted on Cloudflare Pages (Merchant + Super-Admin)
│   └── api/                    # Hono (Node 24 LTS, Zod OpenAPI, BullMQ Workers)
├── packages/
│   ├── db/                     # Drizzle ORM Schema, Migrations, Seeders
│   ├── contracts/              # Shared Zod Schemas & OpenAPI Definitions
│   ├── themes/                 # 5 Core Theme Templates (JSON + Astro Section definitions)
│   └── logistics/              # Steadfast, Pathao & CSV Export Adapters
├── android/                    # Kotlin Android Studio Project (Phase 1 WebView + FCM)
├── docker-compose.yml          # Local development stack (Postgres, Valkey)
├── Dockerfile.api              # Multi-stage production container for API & Worker
├── Dockerfile.storefront       # Production container for Astro SSR
└── turbo.json                  # Turborepo build pipeline
```

---

## 10. Concrete MVP Execution Checklist

- [ ] **Sprint 1: Base Platform & Database (Week 1–2)**
  - Set up Monorepo (pnpm + Turborepo).
  - PostgreSQL schema with Drizzle (Stores, Users, Products, Variants, Orders, Incomplete Orders).
  - Better Auth multi-tenant authentication for merchants.
  - Setup Cloudflare Zone, R2 bucket, and Tunnel configuration.
- [ ] **Sprint 2: Storefront & 5 Archetype Themes (Week 3–4)**
  - Astro SSR Storefront with dynamic tenant resolution via `Host` header.
  - Implement Single-Product Viral Funnel (Grihogadget style) with 1-step inline COD form.
  - Automated Incomplete Order phone number debounced capture.
  - Dynamic Facebook Catalog XML feed (`/feeds/facebook.xml`).
  - Client-side browser image compression pipeline.
- [ ] **Sprint 3: Operations & Tele-Sales Dashboard (Week 5–6)**
  - React 19 Dashboard on Cloudflare Pages.
  - Order Management with Tele-sales Call Statuses (`tel:` direct link, call counter).
  - Incomplete Order Recovery view with 1-click WhatsApp message generation.
  - Steadfast Courier API direct parcel booking + Bulk CSV Export button.
  - Manual bKash/Nagad Advance Delivery Verification form.
- [ ] **Sprint 4: Android App & Launch (Week 7)**
  - Kotlin Android wrapper with high-priority FCM notification service.
  - Cash-register audio alert on order placement.
  - Deploy to VPS via Coolify; deploy Dashboard to Cloudflare Pages.
  - Onboard first 3 friendly f-commerce merchants for real campaign testing.
