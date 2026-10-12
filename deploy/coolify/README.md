# Go Commerce BD — Coolify Production Stack

This directory contains the production Docker Compose stack for deploying Go Commerce BD to an Ubuntu 24.04 (4 GB RAM) VPS using [Coolify v4](https://coolify.io).

## Quick Links
- **Comprehensive Production Deployment & Troubleshooting Guide**: See [`docs/DEPLOYMENT_COOLIFY_CLOUDFLARE.md`](../../docs/DEPLOYMENT_COOLIFY_CLOUDFLARE.md)
- **Environment Variables Template**: See [`.env.example`](../../.env.example)
- **Master Architecture Reference**: See [`MASTER_ARCHITECTURE.md`](../../MASTER_ARCHITECTURE.md)

## Services in `docker-compose.prod.yml`
1. **`postgres`** (PostgreSQL 18 Alpine) — Multi-tenant database with Row-Level Security (RLS).
2. **`valkey`** (Valkey 8 Alpine) — Redis-compatible in-memory cache and BullMQ job queue.
3. **`migration`** (Init Service) — Runs committed Drizzle SQL migrations and optional super admin bootstrap before boot.
4. **`api`** (Hono v4) — Merchant API, checkout pipeline, and admin router (Port `3000`).
5. **`worker`** (BullMQ Outbox Worker) — Transactional outbox relay, FCM push notifications, Meta CAPI.
6. **`storefront`** (Astro 5 + Preact) — High-performance island-rendered storefront (Port `4321`).
7. **`cloudflared`** (Cloudflare Tunnel) — Optional profile (`--profile tunnel`) for zero-inbound-port deployments.
