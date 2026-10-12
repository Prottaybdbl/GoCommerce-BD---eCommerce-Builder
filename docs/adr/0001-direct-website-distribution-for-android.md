# ADR 0001: Direct Website Distribution for Android App

## Status
Accepted

## Date
2026-10-01

## Context
The original architecture plan contemplated publishing the Go Commerce BD Android merchant app to the Google Play Store. However, Google Play Store policies introduce significant barriers and delays for early-stage B2B SaaS deployments in Bangladesh:
1. New personal Google Play developer accounts (created after November 2023) require a mandatory 14-day closed testing period with at least 12 distinct opt-in testers before production release.
2. Organization developer accounts exempt from the 12-tester rule require a Dun & Bradstreet (D-U-N-S) registration, which requires business incorporation and weeks of processing time.
3. Google Play's "Webview Spam" enforcement strictly flags and removes apps that encapsulate web views without substantial native wrapper functionality.
4. Google Play developer verification enforces strict regional rollouts.

The merchant target audience for Go Commerce BD consists of Bangladeshi f-commerce sellers who operate primarily on Facebook, WhatsApp, and mobile devices, and are accustomed to installing APKs directly from merchant portals.

## Decision
The Go Commerce BD Android merchant application will be distributed **directly via the platform website** (`app.yourbrand.com/download/app.apk` and direct dashboard QR codes / download links) rather than the Google Play Store.

## Technical Ramifications & Requirements
1. **Self-Hosted APK Hosting**:
   - The compiled release APK will be built via CI/CD and hosted on Cloudflare R2 or direct web download endpoints with proper MIME type headers (`application/vnd.android.package-archive`).
2. **In-App Auto-Update Mechanism**:
   - Because Google Play auto-updates are bypassed, the app must include a lightweight version check against `/api/app/version` on launch.
   - When an update is detected, the app displays a non-intrusive prompt allowing 1-tap download and installation via Android's `FileProvider`.
3. **Mandatory Native WebView Capabilities**:
   - `WebChromeClient.onShowFileChooser`: Critical for allowing merchants to photograph or select product photos from their device gallery.
   - `DownloadListener` + Android `DownloadManager`: Critical for exporting CSV manifests (Steadfast bulk booking) and downloading PDF invoices.
   - `NotificationChannel` with `IMPORTANCE_HIGH` and bundled `chaching.mp3` for loud order alerts.
   - OEM Battery Optimization & Autostart onboarding guide (for Xiaomi, Vivo, Oppo, Realme) to prevent Chinese-brand battery managers from terminating background order alerts.
4. **Security**:
   - The Android WebView JavaScript bridge (`GoComNative`) is strictly locked down to execute only when the current URL origin matches `https://app.yourbrand.com`.
