process.env.NODE_ENV = "test";
import { test, describe, after } from "node:test";
import assert from "node:assert";
import app from "../src/index.js";
import { can, limit, DEFAULT_PLAN_ENTITLEMENTS } from "@gocom/db";

const testStoreA = {
  id: "10000000-0000-0000-0000-000000000001",
  organizationId: "org_alpha",
  name: "Alpha Gadgets",
  subdomain: "alpha",
  phone: "+8801711000001",
  plan: "pilot",
  isActive: true,
};

const testStoreB = {
  id: "20000000-0000-0000-0000-000000000002",
  organizationId: "org_beta",
  name: "Beta Fashion",
  subdomain: "beta",
  phone: "+8801711000002",
  plan: "package_3",
  isActive: true,
};

// Helpers for mock sessions via test header
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

describe("Phase 1: Multi-Tenancy, Better Auth & RBAC Isolation Tests", () => {
  // 1. Unauthenticated Protection Tests
  test("Unauthenticated Access: /v1/orders returns 401 Unauthorized (RFC 9457)", async () => {
    const res = await app.request("/v1/orders");
    assert.strictEqual(res.status, 401);

    const body = await res.json();
    assert.strictEqual(body.type, "https://httpstatuses.com/401");
    assert.strictEqual(body.title, "Unauthorized");
    assert.strictEqual(body.status, 401);
    assert.ok(body.detail.includes("Authentication session is missing"));
  });

  test("Unauthenticated Access: /api/admin/orders returns 401 Unauthorized", async () => {
    const res = await app.request("/api/admin/orders");
    assert.strictEqual(res.status, 401);
  });

  test("Unauthenticated Mutation: /v1/products returns 401 Unauthorized", async () => {
    const res = await app.request("/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hack Product" }),
    });
    assert.strictEqual(res.status, 401);
  });

  // 2. Staff Roles & RBAC (Task 1.4)
  test("RBAC: call_staff CAN view orders (200 OK)", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_call_staff_1" }, "call_staff", testStoreA);

    const res = await app.request("/v1/orders", {
      headers: { "x-test-session": sessionHeader },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
  });

  test("RBAC: call_staff CANNOT book couriers (403 Forbidden RFC 9457)", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_call_staff_1" }, "call_staff", testStoreA);

    const res = await app.request("/v1/courier/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": sessionHeader,
      },
      body: JSON.stringify({
        orderId: "00000000-0000-0000-0000-000000000001",
        courierProvider: "steadfast",
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.type, "https://httpstatuses.com/403");
    assert.strictEqual(body.title, "Forbidden");
    assert.ok(body.detail.includes("call_staff"));
    assert.ok(body.detail.includes("courier:book"));
  });

  test("RBAC: call_staff CANNOT create products (403 Forbidden)", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_call_staff_1" }, "call_staff", testStoreA);

    const res = await app.request("/v1/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": sessionHeader,
      },
      body: JSON.stringify({ title: "New Item", slug: "new-item", price: 100 }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(body.detail.includes("products:manage"));
  });

  test("RBAC: packer CAN view orders", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_packer_1" }, "packer", testStoreA);

    const res = await app.request("/v1/orders", {
      headers: { "x-test-session": sessionHeader },
    });

    assert.strictEqual(res.status, 200);
  });

  test("RBAC: packer CANNOT update call status (403 Forbidden)", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_packer_1" }, "packer", testStoreA);

    const res = await app.request("/v1/orders/11111111-1111-1111-1111-111111111111/call-status", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": sessionHeader,
      },
      body: JSON.stringify({ callStatus: "confirmed" }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(body.detail.includes("orders:update_status"));
  });

  test("RBAC: packer CANNOT verify advance payment (403 Forbidden)", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_packer_1" }, "packer", testStoreA);

    const res = await app.request("/v1/orders/11111111-1111-1111-1111-111111111111/advance-verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": sessionHeader,
      },
      body: JSON.stringify({
        advanceMethod: "bkash_personal",
        advanceSenderPhone: "+8801711223344",
        advanceTrxId: "TRX123456",
        advanceAmount: 12000,
        isVerified: true,
      }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(body.detail.includes("advance:verify"));
  });

  // 3. Plan Entitlements Invariant #6 Tests
  test("Plan Entitlements: enforces can() feature checks without comparing plan names", async () => {
    // Store A is 'pilot' plan
    const pilotCanSteadfast = await can(testStoreA, "courier:steadfast");
    const pilotCanPathao = await can(testStoreA, "courier:pathao");
    const pilotCanCustomDomain = await can(testStoreA, "custom_domain");

    assert.strictEqual(pilotCanSteadfast, true);
    assert.strictEqual(pilotCanPathao, false);
    assert.strictEqual(pilotCanCustomDomain, false);

    // Store B is 'package_3' (Full Shop) plan
    const pkg3CanPathao = await can(testStoreB, "courier:pathao");
    const pkg3CanShop = await can(testStoreB, "shop");
    const pkg3CanCustomDomain = await can(testStoreB, "custom_domain");
    const pkg3CanMetaCapi = await can(testStoreB, "meta_capi");

    assert.strictEqual(pkg3CanPathao, true);
    assert.strictEqual(pkg3CanShop, true);
    assert.strictEqual(pkg3CanCustomDomain, true);
    assert.strictEqual(pkg3CanMetaCapi, false);
  });

  test("Plan Entitlements: enforces limit() resource checks", async () => {
    assert.strictEqual(await limit(testStoreA, "products"), 50);
    assert.strictEqual(await limit(testStoreA, "staff"), 1);

    assert.strictEqual(await limit(testStoreB, "products"), 500);
    assert.strictEqual(await limit(testStoreB, "staff"), 3);

    // Package 4 (Pro) limits
    const proStore = { plan: "package_4" };
    assert.strictEqual(await limit(proStore, "products"), 2000);
    assert.strictEqual(await limit(proStore, "staff"), 10);
  });

  // 4. Better Auth Endpoint Test
  test("Better Auth: /api/auth/get-session returns empty response when unauthenticated", async () => {
    const res = await app.request("/api/auth/get-session");
    // Better Auth returns null / 200 or 401 when no session
    assert.ok(res.status === 200 || res.status === 401);
  });

  after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 150);
  });
});
