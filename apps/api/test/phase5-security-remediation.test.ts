import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import app from "../src/index.js";
import { getAppVersionInfo } from "../src/routes/app-version.js";

const rootDir = path.resolve(process.cwd(), "../..");

test("Phase 5 Security Remediation Suite", async (t) => {
  // 1. Task 5.1: Container Security & .dockerignore Context Protection (V-18)
  await t.test("V-18/Task 5.1: Root .dockerignore exists and excludes secrets, git, and mobile code", () => {
    const dockerignorePath = path.join(rootDir, ".dockerignore");
    assert.ok(fs.existsSync(dockerignorePath), ".dockerignore must exist at root");

    const content = fs.readFileSync(dockerignorePath, "utf-8");
    assert.ok(content.includes(".git"), ".dockerignore must exclude .git");
    assert.ok(content.includes(".env*"), ".dockerignore must exclude .env*");
    assert.ok(content.includes("node_modules"), ".dockerignore must exclude node_modules");
    assert.ok(content.includes("android"), ".dockerignore must exclude android");
  });

  await t.test("V-18/Task 5.1: Dockerfiles enforce non-root user (USER node)", () => {
    const dockerfiles = ["Dockerfile.api", "Dockerfile.worker", "Dockerfile.storefront"];

    for (const df of dockerfiles) {
      const dfPath = path.join(rootDir, df);
      assert.ok(fs.existsSync(dfPath), `${df} must exist`);
      const content = fs.readFileSync(dfPath, "utf-8");
      assert.ok(content.includes("USER node"), `${df} must run as non-root user node`);
    }
  });

  await t.test("V-18/Task 5.1: Production compose pins cloudflared and includes migration init service", () => {
    const composePath = path.join(rootDir, "deploy/coolify/docker-compose.prod.yml");
    const content = fs.readFileSync(composePath, "utf-8");

    assert.ok(!content.includes("cloudflared:latest"), "cloudflared must not use unpinned :latest tag");
    assert.ok(content.includes("cloudflare/cloudflared:202"), "cloudflared must be pinned to a release version");
    assert.ok(content.includes("migration:"), "compose must contain database migration service");
    assert.ok(content.includes("pnpm --filter @gocom/db migrate") || content.includes("@gocom/db"), "migration service must invoke db migrations");
  });

  // 2. Task 5.2: Mobile App Security & APK Integrity Verification
  await t.test("V-18/Task 5.2: AndroidManifest disallows backup and disables cleartext traffic", () => {
    const manifestPath = path.join(rootDir, "android/app/src/main/AndroidManifest.xml");
    assert.ok(fs.existsSync(manifestPath), "AndroidManifest.xml must exist");

    const content = fs.readFileSync(manifestPath, "utf-8");
    assert.ok(content.includes('android:allowBackup="false"'), "allowBackup must be false");
    assert.ok(content.includes('android:usesCleartextTraffic="false"'), "usesCleartextTraffic must be false");
  });

  await t.test("V-18/Task 5.2: MainActivity validates target_url against allowed origins", () => {
    const activityPath = path.join(rootDir, "android/app/src/main/java/bd/gocom/merchant/MainActivity.kt");
    assert.ok(fs.existsSync(activityPath), "MainActivity.kt must exist");

    const content = fs.readFileSync(activityPath, "utf-8");
    assert.ok(content.includes("isHostAllowed"), "MainActivity must check if deep link host is allowed");
    assert.ok(content.includes('scheme == "https"'), "MainActivity must enforce HTTPS on deep links");
  });

  await t.test("V-18/Task 5.2: APK version endpoint rejects dummy hash in production", () => {
    // In production, dummy empty-string hash should be dropped
    const prodInfo = getAppVersionInfo("production");
    assert.equal(prodInfo.apkSha256, undefined, "Dummy hash must be rejected in production");

    // When valid 64-hex SHA-256 is supplied via env, it is accepted
    const origEnv = process.env.APK_SHA256;
    try {
      process.env.APK_SHA256 = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const validInfo = getAppVersionInfo("production");
      assert.equal(validInfo.apkSha256, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    } finally {
      process.env.APK_SHA256 = origEnv;
    }
  });

  // 3. Task 5.3: Security Headers & CSP
  await t.test("Task 5.3: API Content-Security-Policy drops unsafe-inline on script-src", async () => {
    const res = await app.request("/health");
    const csp = res.headers.get("content-security-policy") || "";

    assert.ok(csp.includes("script-src 'self'"), "CSP must include script-src 'self'");
    // Standard API response must NOT contain 'unsafe-inline' in script-src
    const scriptSrcDirectives = csp
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("script-src"));

    assert.ok(scriptSrcDirectives, "script-src directive must be present");
    assert.ok(!scriptSrcDirectives.includes("'unsafe-inline'"), "API script-src must not include 'unsafe-inline'");
  });

  await t.test("Task 5.3: Storefront middleware enforces security headers and strips cookies", () => {
    const middlewarePath = path.join(rootDir, "apps/storefront/src/middleware.ts");
    assert.ok(fs.existsSync(middlewarePath), "Storefront middleware.ts must exist");

    const content = fs.readFileSync(middlewarePath, "utf-8");
    assert.ok(content.includes("Set-Cookie") || content.includes("set-cookie"), "Must delete Set-Cookie header");
    assert.ok(content.includes("X-Content-Type-Options"), "Must set X-Content-Type-Options");
    assert.ok(content.includes("Content-Security-Policy"), "Must set Content-Security-Policy");
  });

  // 4. Task 5.5: Database Backup & Restore Drill Verification
  await t.test("Task 5.5: Backup & Restore scripts enforce SHA256 integrity verification", () => {
    const backupScript = path.join(rootDir, "scripts/backup-db.sh");
    const restoreScript = path.join(rootDir, "scripts/restore-db.sh");

    assert.ok(fs.existsSync(backupScript), "backup-db.sh must exist");
    assert.ok(fs.existsSync(restoreScript), "restore-db.sh must exist");

    const backupContent = fs.readFileSync(backupScript, "utf-8");
    const restoreContent = fs.readFileSync(restoreScript, "utf-8");

    assert.ok(backupContent.includes("sha256sum"), "backup-db.sh must compute sha256 checksum");
    assert.ok(restoreContent.includes("sha256sum"), "restore-db.sh must verify sha256 checksum");
    assert.ok(restoreContent.includes("Smoke Verification Drill"), "restore-db.sh must execute smoke verification drill");
  });

  t.after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 100);
  });
});
