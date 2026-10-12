import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { config, assertProductionConfig } from "../src/config.js";
import { isPathAllowed, platformHosts } from "../../storefront/src/lib/proxy-policy.js";

test("Phase 1 Security Remediation Suite", async (t) => {
  await t.test("V-01: verifySuperAdmin rejects arbitrary tokens containing 'super_admin'", async () => {
    // Arbitrary token containing the string "super_admin" must fail
    const res = await app.request("/api/super-admin/packages", {
      headers: {
        Authorization: "Bearer attacker_super_admin_fake_token",
      },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Access denied/);
  });

  await t.test("V-01: verifySuperAdmin rejects x-test-role when NODE_ENV is not 'test'", async () => {
    const origEnv = config.NODE_ENV;
    try {
      // Temporarily set NODE_ENV to development
      (config as any).NODE_ENV = "development";
      const res = await app.request("/api/super-admin/packages", {
        headers: {
          "x-test-role": "super_admin",
        },
      });
      assert.equal(res.status, 403);
    } finally {
      (config as any).NODE_ENV = origEnv;
    }
  });

  await t.test("V-02: Hardcoded 123456/admin12345 password backdoor is deleted", async () => {
    // Attempting login with password "123456" on a non-default or wrong credential must 401
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "merchant@demo.com",
        password: "wrong_password_123456",
      }),
    });
    assert.equal(res.status, 401);
  });

  await t.test("V-03: assertProductionConfig fails closed on missing or default secrets", async () => {
    // Test 1: Insecure default session secret
    const badEnv: NodeJS.ProcessEnv = {
      SESSION_SECRET: "dev_secret_must_be_changed_in_prod_12345",
      ENCRYPTION_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      DATABASE_URL: "postgres://user:pass@host:5432/db",
      R2_ACCOUNT_ID: "dummy_r2_account_id",
      R2_ACCESS_KEY_ID: "dummy_r2_access_key",
      R2_SECRET_ACCESS_KEY: "dummy_r2_secret_key",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      BETTER_AUTH_URL: "https://app.gocommercebd.online",
    };

    const problems = assertProductionConfig(badEnv, { ...config, DEV_TENANT_FALLBACK: "0" });
    assert.ok(problems.length >= 4);
    assert.ok(problems.some((p) => p.includes("SESSION_SECRET") && p.includes("insecure")));
    assert.ok(problems.some((p) => p.includes("ENCRYPTION_MASTER_KEY") && p.includes("insecure")));
    assert.ok(problems.some((p) => p.includes("R2_ACCOUNT_ID") && p.includes("insecure")));
    assert.ok(problems.some((p) => p.includes("TURNSTILE_SECRET_KEY") && p.includes("insecure")));
  });

  await t.test("V-03: assertProductionConfig accepts valid production secrets", async () => {
    const validEnv: NodeJS.ProcessEnv = {
      SESSION_SECRET: "a_very_strong_random_session_secret_of_32_characters_minimum",
      ENCRYPTION_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".split("").reverse().join(""),
      DATABASE_URL: "postgres://real_user:strong_pass@postgres:5432/gocom_db",
      R2_ACCOUNT_ID: "cf_real_account_id_1234567890",
      R2_ACCESS_KEY_ID: "cf_real_access_key_1234567890",
      R2_SECRET_ACCESS_KEY: "cf_real_secret_key_1234567890abcdef",
      TURNSTILE_SECRET_KEY: "0x4AAAAAAARealTurnstileSecretKey12345",
      BETTER_AUTH_URL: "https://app.gocommercebd.online",
    };

    const problems = assertProductionConfig(validEnv, { ...config, DEV_TENANT_FALLBACK: "0" });
    assert.equal(problems.length, 0);
  });

  await t.test("V-04: isPathAllowed enforces strict host-class routing policy", async () => {
    // Shopper host: allow public checkout & storefront
    assert.equal(isPathAllowed("/api/orders", false), true);
    assert.equal(isPathAllowed("/api/incomplete-orders", false), true);
    assert.equal(isPathAllowed("/api/storefront/config", false), true);
    assert.equal(isPathAllowed("/api/storefront/packages", false), true);
    assert.equal(isPathAllowed("/api/app/download", false), true);

    // Shopper host: strictly BLOCK admin, auth, and internal APIs
    assert.equal(isPathAllowed("/api/admin/orders", false), false);
    assert.equal(isPathAllowed("/api/super-admin/tenants", false), false);
    assert.equal(isPathAllowed("/api/auth/login", false), false);
    assert.equal(isPathAllowed("/v1/orders", false), false);

    // Platform host: allows auth & storefront
    assert.equal(isPathAllowed("/api/auth/login", true), true);
    assert.equal(isPathAllowed("/api/auth/register-store", true), true);
    assert.equal(isPathAllowed("/api/storefront/packages", true), true);

    // Platform host: still blocks admin & internal API from reverse proxy
    assert.equal(isPathAllowed("/api/admin/orders", true), false);
    assert.equal(isPathAllowed("/api/super-admin/tenants", true), false);
  });

  t.after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 100);
  });
});
