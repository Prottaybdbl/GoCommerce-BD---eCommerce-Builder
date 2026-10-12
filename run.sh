#!/usr/bin/env bash
set -e

echo ""
echo "================================================================================"
echo "                GO COMMERCE BD — SAAS PLATFORM (LOCAL RUNNER)                 "
echo "================================================================================"
echo "  * Storefront (Astro SSR + Preact):      http://localhost:4321"
echo "  * Merchant & Admin Dashboard (React 19): http://localhost:5173"
echo "  * Backend API & BullMQ Engine (Hono):    http://localhost:3000"
echo "  * OpenAPI Interactive Documentation:     http://localhost:3000/docs"
echo "  * Facebook Product Catalog XML Feed:     http://localhost:3000/feeds/facebook.xml"
echo "================================================================================"
echo ""

# 1. Check prerequisites
echo "[1/4] Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "  ✖ Node.js is not installed. Please install Node.js 22+"
    exit 1
fi
echo "  ✔ Node.js: $(node -v)"

if ! command -v pnpm &> /dev/null; then
    echo "  ℹ Installing pnpm..."
    npm install -g pnpm
fi
echo "  ✔ pnpm: $(pnpm -v)"

# 2. Check .env
if [ ! -f ".env" ]; then
    echo "  ℹ Creating .env from .env.example..."
    cp .env.example .env
fi

# 3. Docker services
echo ""
echo "[2/4] Checking database services..."
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "  ✔ Docker is running. Starting PostgreSQL 17 & Valkey..."
    docker compose up -d
    
    echo "  ⏳ Waiting for PostgreSQL to be ready..."
    until docker compose exec -T postgres pg_isready -U gocom_user -d gocom_db &> /dev/null || [ $RETRIES -eq 0 ]; do
        sleep 1
        RETRIES=$((RETRIES-1))
    done
    echo "  ✔ PostgreSQL is ready."

    echo ""
    echo "[3/4] Syncing schema & running seed..."
    pnpm db:push || true
    if [ "$1" = "--seed" ] || [ "$SEED" = "true" ]; then
        pnpm db:seed
    fi
else
    echo "  ⚠ Docker is not running or not found. Continuing in development mode..."
fi

# 4. Launch dev services
echo ""
echo "[4/4] Launching Go Commerce BD Development Services..."
echo "Press Ctrl+C to terminate all services."
echo ""

pnpm dev
