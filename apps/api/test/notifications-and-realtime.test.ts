process.env.NODE_ENV = "test";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { fcmService } from "../src/services/fcm.js";
import { realtimeOrderBus } from "../src/services/realtime.js";

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

function makeSessionHeader(user: { id: string; role?: string }, role: string, store: any) {
  return JSON.stringify({
    user: { id: user.id, name: "Test Merchant", email: `${user.id}@test.com`, role: user.role || "user" },
    session: {
      id: `sess_${user.id}`,
      userId: user.id,
      activeOrganizationId: store.organizationId,
      _testStore: store,
      _testRole: role,
    },
  });
}

describe("Phase 5: Notifications, Realtime & Android v1 Tests", () => {
  const sessionHeader = makeSessionHeader({ id: "usr_owner_1" }, "owner", testStoreA);
  const authHeaders = {
    "x-test-session": sessionHeader,
  };

  // =========================================================================
  // 1. FCM Service & PII-Free Payload Construction
  // =========================================================================
  test("FCM Service: builds RFC-compliant, strictly PII-free payload", () => {
    const rawOrderData = {
      orderId: "ord-test-123",
      orderNumber: "1001",
      totalAmountBdt: "1,050.00",
      itemCount: 2,
      // Deliberately pass customer PII to ensure it gets stripped out
      customerName: "Mohammad Rahim",
      customerPhone: "+8801712345678",
      customerAddress: "House 12, Road 4, Dhanmondi, Dhaka",
    };

    const message = fcmService.buildPiiFreeMessage("dummy-token-abc", rawOrderData);

    // Assert message structure
    assert.equal(message.message.token, "dummy-token-abc");
    assert.equal(message.message.notification.title, "💰 নতুন অর্ডার এসেছে! (#1001)");
    assert.equal(message.message.notification.body, "2টি আইটেম — মোট ৳1,050.00");
    assert.equal(message.message.android.notification.channel_id, "new_orders_v1");
    assert.equal(message.message.android.notification.sound, "chaching");
    assert.equal(message.message.android.priority, "HIGH");

    // STRICT INVARIANT: PII must NEVER appear anywhere in the payload
    const jsonString = JSON.stringify(message);
    assert.ok(!jsonString.includes("Mohammad Rahim"), "Customer name leaked into FCM payload!");
    assert.ok(!jsonString.includes("+8801712345678"), "Customer phone leaked into FCM payload!");
    assert.ok(!jsonString.includes("Dhanmondi"), "Customer address leaked into FCM payload!");
  });

  test("FCM Service: simulated dispatch succeeds gracefully without Google credentials", async () => {
    const result = await fcmService.sendOrderNotification(["token-1", "token-2"], {
      orderId: "ord-sim-1",
      orderNumber: "1002",
      totalAmountBdt: "2,500.00",
      itemCount: 1,
    });

    assert.equal(result.success, true);
    assert.equal(result.sentCount, 2);
    assert.equal(result.failedTokens.length, 0);
  });

  // =========================================================================
  // 2. Device Registration Routes (POST & DELETE /v1/devices)
  // =========================================================================
  test("Device Registration: rejects unauthenticated requests with 401", async () => {
    const res = await app.request("/v1/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "fcm-valid-token-12345" }),
    });

    assert.equal(res.status, 401);
  });

  test("Device Registration: rejects invalid short token with 400", async () => {
    const res = await app.request("/v1/devices/register", {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "short" }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.errors?.token);
  });

  test("Device Registration: unregister endpoint handles request", async () => {
    const res = await app.request("/v1/devices/unregister", {
      method: "DELETE",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: "dummy-token-to-unregister" }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  // =========================================================================
  // 3. SSE Realtime Order Stream (/v1/realtime/orders)
  // =========================================================================
  test("Realtime Stream: rejects unauthenticated requests with 401", async () => {
    const res = await app.request("/v1/realtime/orders");
    assert.equal(res.status, 401);
  });

  test("Realtime Stream: connects and receives initial connected event", async () => {
    const controller = new AbortController();
    const res = await app.request("/v1/realtime/orders", {
      headers: authHeaders,
      signal: controller.signal,
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers.get("content-type")?.includes("text/event-stream"));

    const reader = res.body?.getReader();
    assert.ok(reader);

    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    assert.ok(text.includes("event: connected"));
    assert.ok(text.includes(testStoreA.id));
    controller.abort();
    await reader.cancel().catch(() => {});
  });

  test("Realtime Order Bus: Invariant #5 strictly isolates order events by tenant store", () => {
    let store1Received = false;
    let store2Received = false;

    // Listen on store 1
    const unsub1 = realtimeOrderBus.subscribe(testStoreA.id, (evt) => {
      if (evt.event === "order_created") store1Received = true;
    });

    // Listen on store 2
    const unsub2 = realtimeOrderBus.subscribe(testStoreB.id, (evt) => {
      if (evt.event === "order_created") store2Received = true;
    });

    // Broadcast on store 1
    realtimeOrderBus.broadcast(testStoreA.id, "order_created", { orderNumber: "ORD-999" });

    assert.equal(store1Received, true, "Store 1 should have received its own order event");
    assert.equal(store2Received, false, "Store 2 must NEVER receive Store 1 order events (Tenant leak!)");

    unsub1();
    unsub2();
  });

  // =========================================================================
  // 4. App Version & Direct APK Download Endpoints
  // =========================================================================
  test("App Version: public endpoint returns version metadata", async () => {
    const res = await app.request("/v1/app/version");
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.equal(typeof body.data.versionName, "string");
    assert.equal(typeof body.data.versionCode, "number");
    assert.ok(body.data.downloadUrl.includes(".apk"));
    assert.ok(body.data.releaseNotes.length > 0);
  });

  test("App Download: redirects to APK file", async () => {
    const res = await app.request("/v1/app/download");
    assert.equal(res.status, 302);
    assert.ok(res.headers.get("location")?.includes(".apk"));
  });

  after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 150);
  });
});
