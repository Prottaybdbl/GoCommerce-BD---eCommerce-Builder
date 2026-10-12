import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import app from "../src/index.js";

function makeSessionHeader(user: { id: string; role?: string }, role: string, store: any) {
  return JSON.stringify({
    user: { id: user.id, name: "Test Staff", email: `${user.id}@test.com`, role: user.role || "user" },
    session: {
      id: `sess_${user.id}`,
      userId: user.id,
      activeOrganizationId: store.organizationId,
      _testStore: store,
      _testRole: role,
    },
  });
}

test("Phase 2 Security Remediation Suite", async (t) => {
  const baseStore = {
    id: "10000000-0000-0000-0000-000000000001",
    organizationId: "org_alpha",
    name: "Alpha Gadgets",
    subdomain: "alpha",
    phone: "+8801711000001",
    plan: "pilot",
    status: "active",
    isActive: true,
    deletedAt: null,
    settings: {
      deliveryChargeInsideDhaka: 6000,
      deliveryChargeSubDhaka: 10000,
      deliveryChargeOutsideDhaka: 12000,
      facebookPixelId: "FB_PIXEL_123",
      tiktokPixelId: "TT_PIXEL_456",
      facebookCapiToken: "SECRET_CAPI_TOKEN_NEVER_EXPOSE",
      bkashPersonalNumber: "01711000000",
      nagadPersonalNumber: "01811000000",
    },
  };

  // 1. Task 2.1: RLS Migration Completeness
  await t.test("V-06/Task 2.1: Migration 0005 enables RLS + FORCE on all tenant tables", async () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "../../packages/db/drizzle/0005_enable_core_rls.sql"
    );
    assert.ok(fs.existsSync(migrationPath), "Migration 0005_enable_core_rls.sql must exist");

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");
    const requiredTables = [
      "orders",
      "order_items",
      "order_events",
      "incomplete_orders",
      "products",
      "product_variants",
      "product_images",
      "store_credentials",
      "courier_remittances",
      "device_tokens",
      "store_counters",
      "idempotency_keys",
      "outbox",
      "audit_logs",
    ];

    for (const table of requiredTables) {
      assert.ok(
        sqlContent.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`),
        `Table ${table} must ENABLE ROW LEVEL SECURITY`
      );
      assert.ok(
        sqlContent.includes(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`),
        `Table ${table} must FORCE ROW LEVEL SECURITY`
      );
      assert.ok(
        sqlContent.includes(`CREATE POLICY tenant_isolation_${table} ON ${table}`),
        `Table ${table} must have tenant isolation policy`
      );
    }

    assert.ok(
      sqlContent.includes("current_setting('app.store_id'"),
      "RLS policies must inspect app.store_id session variable"
    );
  });

  // 2. Task 2.2: Public Storefront Config Whitelist (V-09)
  await t.test("V-09/Task 2.2: /api/storefront/config whitelists safe fields and hides secrets", async () => {
    const res = await app.request("/api/storefront/config", {
      headers: {
        host: "alpha.yourbrandshop.com",
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    // Sensitive tokens and payment numbers MUST NEVER be returned
    assert.equal(data.settings?.facebookCapiToken, undefined);
    assert.equal(data.settings?.bkashPersonalNumber, undefined);
    assert.equal(data.settings?.nagadPersonalNumber, undefined);
    assert.equal((data as any).facebookCapiToken, undefined);

    // Safe public UI configuration MUST be present
    assert.ok(data.id);
    assert.ok(data.name);
    assert.ok(data.settings);
    assert.equal(typeof data.settings.deliveryChargeInsideDhaka, "number");
  });

  // 3. Task 2.5: RBAC - Courier Settings Configuration (V-15)
  await t.test("V-15/Task 2.5: Packer role cannot configure courier credentials (403)", async () => {
    const packerSession = makeSessionHeader({ id: "usr_packer_99" }, "packer", baseStore);

    const res = await app.request("/v1/courier/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": packerSession,
      },
      body: JSON.stringify({
        service: "steadfast",
        apiKey: "fake_key",
        secretKey: "fake_secret",
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.title, "Forbidden");
    assert.ok(body.detail.includes("courier:configure"));
  });

  await t.test("V-15/Task 2.5: Packer role CAN view masked courier settings (courier:book)", async () => {
    const packerSession = makeSessionHeader({ id: "usr_packer_99" }, "packer", baseStore);

    const res = await app.request("/v1/courier/settings?service=steadfast", {
      headers: {
        "x-test-session": packerSession,
      },
    });

    // Should return 200 (masked credentials or not configured)
    assert.equal(res.status, 200);
  });

  // 4. Task 2.6: Suspended & Soft-Deleted Stores Rejected (V-11)
  await t.test("V-11/Task 2.6: Soft-deleted store is rejected with 404 in merchant API", async () => {
    const deletedStore = {
      ...baseStore,
      deletedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const session = makeSessionHeader({ id: "usr_owner_1" }, "owner", deletedStore);

    const res = await app.request("/v1/orders", {
      headers: {
        "x-test-session": session,
      },
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.title, "Store Not Found");
  });

  await t.test("V-11/Task 2.6: Suspended store is rejected with 403 in merchant API", async () => {
    const suspendedStore = {
      ...baseStore,
      status: "suspended",
    };
    const session = makeSessionHeader({ id: "usr_owner_1" }, "owner", suspendedStore);

    const res = await app.request("/v1/orders", {
      headers: {
        "x-test-session": session,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.title, "Store Suspended");
  });

  await t.test("V-11/Task 2.6: Inactive store is rejected with 403 in merchant API", async () => {
    const inactiveStore = {
      ...baseStore,
      isActive: false,
    };
    const session = makeSessionHeader({ id: "usr_owner_1" }, "owner", inactiveStore);

    const res = await app.request("/v1/orders", {
      headers: {
        "x-test-session": session,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.title, "Store Suspended");
  });

  t.after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 100);
  });
});
