# ==============================================================================
# Go Commerce BD - All-in-One Local Runner Script
# Multi-Tenant SaaS eCommerce and F-Commerce Platform for Bangladesh
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$Seed,
    [switch]$DockerOnly,
    [switch]$SkipDocker,
    [switch]$Build
)

$ErrorActionPreference = 'Stop'

function Write-BrandHeader {
    Write-Host ''
    Write-Host '================================================================================' -ForegroundColor Cyan
    Write-Host '                GO COMMERCE BD - SAAS PLATFORM (LOCAL RUNNER)                 ' -ForegroundColor Green
    Write-Host '================================================================================' -ForegroundColor Cyan
    Write-Host '  * Storefront (Astro SSR + Preact):      http://localhost:4321' -ForegroundColor Yellow
    Write-Host '  * Merchant and Admin Dashboard (React): http://localhost:5173' -ForegroundColor Yellow
    Write-Host '  * Backend API and BullMQ Engine (Hono): http://localhost:3000' -ForegroundColor Yellow
    Write-Host '  * OpenAPI Interactive Documentation:     http://localhost:3000/docs' -ForegroundColor Yellow
    Write-Host '  * Facebook Product Catalog XML Feed:     http://localhost:3000/feeds/facebook.xml' -ForegroundColor Yellow
    Write-Host '================================================================================' -ForegroundColor Cyan
    Write-Host ''
}

# 1. Environment Checks
Write-Host '[1/5] Checking environment prerequisites...' -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVer = (node -v).Trim()
    Write-Host "  [OK] Node.js installed: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host '  [FAIL] Node.js is not found. Please install Node.js 22+ from https://nodejs.org' -ForegroundColor Red
    exit 1
}

# Check pnpm
try {
    $pnpmVer = (pnpm -v).Trim()
    Write-Host "  [OK] pnpm installed: v$pnpmVer" -ForegroundColor Green
} catch {
    Write-Host '  [INFO] pnpm is not found. Installing pnpm globally...' -ForegroundColor Yellow
    npm install -g pnpm
}

# 2. Check and Copy .env
if (-not (Test-Path '.env')) {
    Write-Host '  [INFO] .env file missing. Copying from .env.example...' -ForegroundColor Yellow
    Copy-Item '.env.example' '.env'
    Write-Host '  [OK] Created .env configuration file.' -ForegroundColor Green
}

# 3. Docker and Database Services
Write-Host ''
Write-Host '[2/5] Checking database services...' -ForegroundColor Cyan

$dockerAvailable = $false
$dockerRunning = $false

if (-not $SkipDocker) {
    if (Get-Command 'docker' -ErrorAction SilentlyContinue) {
        $dockerAvailable = $true
        try {
            $info = & docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
            }
        } catch {
            $dockerRunning = $false
        }
    }
}

if ($dockerRunning) {
    Write-Host '  [OK] Docker Desktop is active and running.' -ForegroundColor Green
    Write-Host '  [EXEC] Spinning up PostgreSQL 17 and Valkey containers...' -ForegroundColor Yellow
    & docker compose up -d
    
    # Wait for PostgreSQL to be ready on port 5432
    Write-Host '  [WAIT] Checking PostgreSQL availability on port 5432...' -ForegroundColor Gray
    $retries = 10
    $dbReady = $false
    while ($retries -gt 0 -and -not $dbReady) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect('127.0.0.1', 5432)
            $tcp.Close()
            $dbReady = $true
        } catch {
            Start-Sleep -Seconds 1
            $retries--
        }
    }

    if ($dbReady) {
        Write-Host '  [OK] PostgreSQL container is ready and accepting connections.' -ForegroundColor Green
    } else {
        Write-Host '  [WARN] PostgreSQL container is starting up slowly. Proceeding...' -ForegroundColor Yellow
    }
} else {
    # Check if a native local PostgreSQL is already listening on port 5432
    $nativeDbReady = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('127.0.0.1', 5432)
        $tcp.Close()
        $nativeDbReady = $true
    } catch {
        $nativeDbReady = $false
    }

    if ($nativeDbReady) {
        Write-Host '  [OK] Native PostgreSQL detected on 127.0.0.1:5432.' -ForegroundColor Green
    } else {
        Write-Host '  [WARN] Docker is not running and no local PostgreSQL was found on port 5432.' -ForegroundColor Yellow
        Write-Host '         * To start Docker: Open Docker Desktop and run this script again.' -ForegroundColor Gray
        Write-Host '         * Or configure a remote database URL in your .env (e.g. Supabase, Neon).' -ForegroundColor Gray
        Write-Host '         * Note: The API and Storefront operate in mock mode if DB is offline.' -ForegroundColor Gray
    }
}

if ($DockerOnly) {
    Write-Host ''
    Write-Host '  [OK] Docker services initialized. Exiting as -DockerOnly was requested.' -ForegroundColor Green
    exit 0
}

# 4. Optional Build and Database Push / Seed
if ($Build) {
    Write-Host ''
    Write-Host '[3/5] Building all monorepo packages...' -ForegroundColor Cyan
    pnpm build
}

# Check if DB is reachable
$canConnectDb = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect('127.0.0.1', 5432)
    $tcp.Close()
    $canConnectDb = $true
} catch {
    $canConnectDb = $false
}

if ($canConnectDb) {
    Write-Host ''
    Write-Host '[3/5] Syncing database schema with Drizzle...' -ForegroundColor Cyan
    try {
        pnpm db:push
        Write-Host '  [OK] Database schema synchronized.' -ForegroundColor Green
    } catch {
        Write-Host '  [WARN] db:push completed with notice. Continuing...' -ForegroundColor Yellow
    }

    if ($Seed) {
        Write-Host ''
        Write-Host '[4/5] Seeding database with Bangladesh 64 districts and demo store...' -ForegroundColor Cyan
        try {
            pnpm db:seed
            Write-Host '  [OK] Seed data applied successfully!' -ForegroundColor Green
        } catch {
            Write-Host '  [WARN] Seeding encountered an error. Check logs above.' -ForegroundColor Yellow
        }
    }
} else {
    Write-Host ''
    Write-Host '[3/5] Skipping database migrations/seed (PostgreSQL is not listening on 5432).' -ForegroundColor Yellow
}

# 5. Launch Full Development Environment
Write-BrandHeader

Write-Host '[5/5] Launching Go Commerce BD Development Services (pnpm dev)...' -ForegroundColor Green
Write-Host 'Press Ctrl+C to terminate all services.' -ForegroundColor Gray
Write-Host ''

pnpm dev
