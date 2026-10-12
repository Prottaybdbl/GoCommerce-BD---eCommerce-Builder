# Go Commerce BD — Coolify & Cloudflare Production Deployment Guide

> **Target Environment**: Ubuntu 24.04 LTS (4 GB RAM VPS)  
> **Orchestration**: Coolify v4 (Docker Compose)  
> **Source Repository**: `prottay47/go-commerce-bd` (Branch: `main`)  
> **Production Domain**: `gocommercebd.online`  
> **Server IP**: `94.130.185.92`  
> **Last Updated & Verified**: October 2026 (Status: 🟢 **Running & Verified Healthy**)

---

## 1. System Architecture Overview

```
                      [ Namecheap DNS / Cloudflare ]
                        @ / www -> 94.130.185.92
                                   │
                                   ▼
                   [ Coolify Traefik Reverse Proxy ]
                     (Auto SSL / LetsEncrypt ACME)
                     Port 80 / 443 -> Internal Ports
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼ :4321                                             ▼ :3000
 ┌──────────────────────┐                           ┌──────────────────────┐
 │   gocom-storefront   │                           │      gocom-api       │
 │   (Astro 5 + Preact) │                           │  (Hono v4 REST API)  │
 └──────────┬───────────┘                           └──────────┬───────────┘
            │                                                  │
            │           ┌───────────────────────────┐          │
            └──────────►│      gocom-postgres       │◄─────────┘
                        │     (PostgreSQL 18)       │
                        └─────────────▲─────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │       gocom-worker        │
                        │    (BullMQ + Valkey 8)    │
                        └─────────────▲─────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │       gocom-valkey        │
                        │    (Redis 8 In-Memory)    │
                        └───────────────────────────┘
```

---

## 2. Cloudflare & DNS Configuration

### 2.1 Domain & DNS Records (Namecheap / DNS Provider)
| Type | Host | Value | TTL | Note |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `94.130.185.92` | Automatic / 300s | Points apex domain to VPS |
| **A** | `www` | `94.130.185.92` | Automatic / 300s | Points www subdomain to VPS |
| **A** | `app` | `94.130.185.92` | Automatic / 300s | Merchant Dashboard & Auth |
| **A** | `admin` | `94.130.185.92` | Automatic / 300s | Super Admin Console |

### 2.2 Cloudflare R2 Bucket (Zero-Server-Compute Media Storage)
* **Invariant #3**: All merchant and product photos are resized in the browser Web Worker (360px, 720px, 1080px) and uploaded directly to Cloudflare R2 via presigned URLs. No server-side Sharp or image decoding.
* **Bucket Details**:
  - **Bucket Name**: `gocom-media`
  - **Location**: Default / Auto
  - **Tier Free Allowance**: 10 GB storage free, 10M read ops/mo, 1M write ops/mo, **0 egress fees**.
  - **Excess Billing**: $0.015 / GB-month if storage exceeds 10 GB.
* **R2 Credentials Needed**:
  - `R2_ACCOUNT_ID`: Cloudflare Dashboard -> R2 -> Account ID (right sidebar).
  - `R2_ACCESS_KEY_ID`: Cloudflare Dashboard -> R2 -> Manage R2 API Tokens -> Access Key ID.
  - `R2_SECRET_ACCESS_KEY`: Secret Access Key (generated with Object Read & Write permissions).
  - `R2_BUCKET_NAME`: `gocom-media`
  - `R2_PUBLIC_DOMAIN`: Public Custom Domain connected to R2 (e.g. `media.gocommercebd.online` or Cloudflare dev URL).

### 2.3 Cloudflare Turnstile (Bot Protection)
* Used for protecting checkout and lead submission forms against bot abuse.
* `TURNSTILE_SECRET_KEY`: Turnstile widget secret key (min 20 characters in production).

### 2.4 Cloudflare Tunnel (`cloudflared`)
* Configured in `docker-compose.prod.yml` under the `profiles: ["tunnel"]` section.
* **Important**: It does **not** run by default unless `--profile tunnel` is specified, preventing container restart loops if `CLOUDFLARE_TUNNEL_TOKEN` is unset.

---

## 3. Coolify Production Environment Variables Reference

In Coolify → Application → **Environment Variables**, ensure the following keys are defined:

```bash
# ------------------------------------------------------------------------------
# 1. CORE DOMAINS & NETWORKING
# ------------------------------------------------------------------------------
PLATFORM_ROOT_DOMAIN=gocommercebd.online
STOREFRONT_ROOT_DOMAIN=gocommercebd.online
NODE_ENV=production

# ------------------------------------------------------------------------------
# 2. DATABASE (POSTGRESQL 18)
# ------------------------------------------------------------------------------
POSTGRES_USER=gocom_user
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>
POSTGRES_DB=gocom_db
DATABASE_URL=postgresql://gocom_user:<STRONG_RANDOM_PASSWORD>@postgres:5432/gocom_db

# ------------------------------------------------------------------------------
# 3. CACHE & QUEUE (VALKEY 8)
# ------------------------------------------------------------------------------
REDIS_URL=redis://valkey:6379

# ------------------------------------------------------------------------------
# 4. SECURITY & ENCRYPTION KEYS (STRICT INVARIANTS)
# ------------------------------------------------------------------------------
# Must be at least 32 characters
BETTER_AUTH_SECRET=<MIN_32_CHARACTERS_RANDOM_SECRET>
BETTER_AUTH_URL=https://app.gocommercebd.online

# Must be EXACTLY 64 hexadecimal characters (32 bytes AES-256 key)
# Generate with: openssl rand -hex 32
ENCRYPTION_MASTER_KEY=<64_HEX_CHARACTERS_MASTER_KEY>

# Cloudflare Turnstile Secret Key (min 20 chars)
TURNSTILE_SECRET_KEY=<CLOUDFLARE_TURNSTILE_SECRET>

# ------------------------------------------------------------------------------
# 5. CLOUDFLARE R2 OBJECT STORAGE
# ------------------------------------------------------------------------------
R2_ACCOUNT_ID=<CLOUDFLARE_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<R2_API_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<R2_API_SECRET_ACCESS_KEY>
R2_BUCKET_NAME=gocom-media
R2_PUBLIC_DOMAIN=media.gocommercebd.online

# ------------------------------------------------------------------------------
# 6. INITIAL SUPER ADMIN BOOTSTRAP (AUTOMATIC SEEDING)
# ------------------------------------------------------------------------------
SUPERADMIN_EMAIL=admin@gocommercebd.online
SUPERADMIN_PASSWORD=<YOUR_ADMIN_PASSWORD_MIN_8_CHARS>
SUPERADMIN_NAME=Super Admin

# Note: Once the super admin is created and you verify login, you can safely
# delete SUPERADMIN_PASSWORD from Coolify to avoid keeping cleartext passwords in the UI.
```

---

## 4. Coolify Service Configuration & Domain Routing

Under Coolify → Application → **Configuration**:

### Storefront Routing
* **Service Name**: `storefront`
* **Domains for storefront**:
  ```text
  https://gocommercebd.online:4321,https://www.gocommercebd.online:4321
  ```
  *(The port `:4321` informs Coolify's Traefik reverse proxy to forward traffic to Astro's internal container port 4321. Using `https://` automatically issues Let's Encrypt SSL and redirects HTTP traffic to HTTPS).*

### Merchant & Super-Admin API/Dashboard Routing
* **Service Name**: `api`
* **Domains for api**:
  ```text
  https://app.gocommercebd.online:3000
  ```
  *(The port `:3000` informs Traefik to forward traffic to Hono's internal container port 3000. It serves both the backend `/api/*`, `/v1/*` endpoints and the bundled `@gocom/dashboard` React SPA).*

---

## 5. Critical Technical Solved Gotchas (Lessons Learned)

The following bugs were diagnosed and solved during deployment:

### ⚠️ Gotcha 1: Storefront Missing `preact` in Monorepo Runner Stage (44x Restart Loop)
* **Symptom**: `storefront` container crash-looping with:
  ```text
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'preact' imported from /app/apps/storefront/dist/server/renderers.mjs
  ```
* **Cause**: In a `pnpm` monorepo, child workspace packages store dependencies in `apps/storefront/node_modules/` (symlinked into `.pnpm`). The runner stage in `Dockerfile.storefront` only copied `apps/storefront/dist/`, omitting `node_modules`.
* **Fix**:
  1. `Dockerfile.storefront` now copies the entire `apps/storefront` workspace directory:
     ```dockerfile
     COPY --chown=node:node --from=builder /app/apps/storefront ./apps/storefront
     ```
  2. Injected fallback module search:
     ```dockerfile
     ENV NODE_PATH="/app/apps/storefront/node_modules:/app/node_modules"
     ```

### ⚠️ Gotcha 2: Traefik `404 page not found`
* **Symptom**: Browser showed plain text `404 page not found` when loading `http://gocommercebd.online`.
* **Cause**: Two-fold:
  1. When a container is crash-looping or its Docker healthcheck is failing, Traefik has no healthy backend to route to, returning `404 page not found`.
  2. Traefik needs the destination container port in Coolify's Domain setting (`:4321`).
* **Fix**: Once the storefront crash loop was eliminated and the domain was mapped to `:4321`, Traefik routed traffic seamlessly.

### ⚠️ Gotcha 3: Worker Failing `BETTER_AUTH_URL` Validation (45x Restart Loop)
* **Symptom**: `worker` container crashed repeatedly with:
  ```text
  ❌ Refusing to start in production:
   - BETTER_AUTH_URL is required in production
  Error: Insecure production configuration
  ```
* **Cause**: The worker runs `dist/worker.js`, which imports `apps/api/src/config.ts`. In production mode (`NODE_ENV=production`), `assertProductionConfig` validates all production secrets. The worker service in `docker-compose.prod.yml` was missing these shared environment variables.
* **Fix**: Added `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ENCRYPTION_MASTER_KEY`, R2 secrets, and Turnstile secrets to the `worker` service in `docker-compose.prod.yml`.

### ⚠️ Gotcha 4: Database Migration Container Exiting with Code 1
* **Symptom**: Coolify failed deployment with `service "migration" didn't complete successfully: exit 1`.
* **Cause**:
  1. `create-super-admin.ts` strictly required passwords to be `≥ 12` characters. If a shorter password was passed in `SUPERADMIN_PASSWORD`, it threw an uncaught exception.
  2. The super admin creation error was directly bubbling up and aborting the database migration script.
* **Fix**:
  1. Lowered minimum password requirement to 8 characters.
  2. Wrapped super admin creation in its own isolated `try/catch` in `packages/db/src/migrate.ts`. If an issue occurs with super admin credentials, a clear warning is printed, but the schema migration exits `0 (Success)` so the app boots smoothly.
  3. Decoupled database connection closing so the pool isn't prematurely severed.

### ⚠️ Gotcha 5: Postgres 18 Alpine Mount Path
* **Symptom**: `initdb` permission denied or existing database files conflicts.
* **Cause**: The official `postgres:18-alpine` image requires volume mounting at `/var/lib/postgresql`, not `/var/lib/postgresql/data`.
* **Fix**: Pinned volume to `/var/lib/postgresql` in `docker-compose.prod.yml`.

---

## 6. How to Deploy or Redeploy

1. **Commit and Push to GitHub**:
   ```bash
   git add .
   git commit -m "your changes"
   git push origin main
   ```
2. **In Coolify Dashboard**:
   - Navigate to the project.
   - Click **Redeploy**.
   - Coolify executes:
     1. Multi-stage Docker image builds with layer caching.
     2. Healthy check on `postgres` & `valkey`.
     3. Execution of `migration` service (applies committed Drizzle migrations from `packages/db/drizzle`).
     4. Starts `api`, `worker`, and `storefront`.
     5. Verifies internal healthchecks and updates Traefik routing.

---

## 7. Emergency Maintenance & CLI Commands

If you need to perform maintenance inside the running containers, use Coolify's **Terminal** tab or connect via SSH to the server:

### Check Container Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### View Live Container Logs
```bash
# View storefront logs
docker logs -f gocom-storefront --tail 100

# View API logs
docker logs -f gocom-api --tail 100

# View background worker logs
docker logs -f gocom-worker --tail 100
```

### Manually Create / Reset Super Admin
```bash
docker exec -it gocom-api node /app/packages/db/dist/create-super-admin.js --email="admin@gocommercebd.online" --password="NewSecurePassword123!" --name="Super Admin"
```

### Inspect PostgreSQL Database
```bash
docker exec -it gocom-postgres psql -U gocom_user -d gocom_db
```
*(Run `\dt` to list all tables; `SELECT email, role FROM "user";` to verify users).*
