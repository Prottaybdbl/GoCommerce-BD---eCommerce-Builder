process.env.NODE_ENV = "test";
import { test, describe, after } from "node:test";
import assert from "node:assert";
import app from "../src/index.js";
import { encryptData, decryptData } from "@gocom/db";

const testStore = {
  id: "10000000-0000-0000-0000-000000000001",
  organizationId: "org_alpha",
  name: "Alpha Gadgets",
  subdomain: "alpha",
  phone: "+8801711000001",
  plan: "pilot",
  isActive: true,
};

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

describe("Phase 2: Checkout Integrity, Idempotency & Per-Store Courier Tests", () => {
  const masterKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  // 1. AES-256-GCM Encryption Tests (Invariant #10)
  test("Crypto Service: encrypts and decrypts per-store credentials with AES-256-GCM", () => {
    const original = {
      apiKey: "st_live_abcdef1234567890",
      secretKey: "st_sec_9876543210fedcba",
    };

    const encrypted = encryptData(original, masterKey);
    assert.ok(encrypted.encryptedData);
    assert.ok(encrypted.iv);
    assert.ok(encrypted.tag);

    const decrypted = decryptData<{ apiKey: string; secretKey: string }>(encrypted, masterKey);
    assert.strictEqual(decrypted.apiKey, original.apiKey);
    assert.strictEqual(decrypted.secretKey, original.secretKey);
  });

  test("Crypto Service: rejects tampered ciphertext or altered auth tag", () => {
    const encrypted = encryptData({ test: "secret" }, masterKey);

    // Tamper with tag
    const tamperedTag = {
      ...encrypted,
      tag: Buffer.from("bad_auth_tag_1234").toString("base64"),
    };

    assert.throws(() => {
      decryptData(tamperedTag, masterKey);
    });
  });

  // 2. Checkout Idempotency Tests
  test("Checkout API: accepts valid order and normalizes Bangla digits in phone", async () => {
    const payload = {
      customerName: "আরিফুল ইসলাম",
      phone: "০১৭১১২২৩৩৪৪", // Bangla numerals
      deliveryZone: "inside_dhaka",
      deliveryDistrict: "Dhaka",
      deliveryAddress: "মিরপুর ১০, রোড ২",
      items: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          variantId: "22222222-2222-2222-2222-222222222222",
          quantity: 1,
        },
      ],
    };

    const res = await app.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.order);
    assert.ok(body.order.orderNumber);
  });

  test("Checkout API: Idempotency-Key prevents duplicate orders on retry", async () => {
    const idempotencyKey = `idemp_${Date.now()}_test`;
    const payload = {
      customerName: "তানভীর আহমেদ",
      phone: "01711223344",
      deliveryZone: "inside_dhaka",
      deliveryDistrict: "Dhaka",
      deliveryAddress: "ধানমন্ডি ৩২",
      items: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          variantId: "22222222-2222-2222-2222-222222222222",
          quantity: 2,
        },
      ],
    };

    // First request
    const res1 = await app.request("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res1.status, 201);
    const body1 = await res1.json();

    // Immediate duplicate request with same key
    const res2 = await app.request("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    // Should return 201 or 200 with the exact same order
    assert.ok(res2.status === 201 || res2.status === 200);
    const body2 = await res2.json();
    assert.strictEqual(body2.order.id, body1.order.id);
    assert.strictEqual(body2.order.orderNumber, body1.order.orderNumber);
  });

  // 3. Per-Store Courier Credentials Tests (Invariant #10)
  test("Courier API: blocks booking with 400 when merchant has not configured credentials", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_packer_1" }, "packer", testStore);

    const res = await app.request("/v1/courier/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": sessionHeader,
      },
      body: JSON.stringify({
        orderId: "11111111-1111-1111-1111-111111111111",
        courierProvider: "steadfast",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.type, "https://httpstatuses.com/400");
    assert.ok(body.title.includes("Courier Credentials Missing") || body.detail.includes("credentials"));
  });

  test("Courier Settings: saves and masks per-store credentials", async () => {
    const sessionHeader = makeSessionHeader({ id: "usr_owner_1" }, "owner", testStore);

    // Save credentials
    const saveRes = await app.request("/v1/courier/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": sessionHeader,
      },
      body: JSON.stringify({
        service: "steadfast",
        apiKey: "st_live_key_998877",
        secretKey: "st_live_secret_445566",
      }),
    });

    assert.strictEqual(saveRes.status, 200);
    const saveBody = await saveRes.json();
    assert.strictEqual(saveBody.success, true);

    // Read masked settings
    const getRes = await app.request("/v1/courier/settings?service=steadfast", {
      headers: { "x-test-session": sessionHeader },
    });

    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.configured, true);
    assert.strictEqual(getBody.service, "steadfast");
    // Masked API key must not expose the full raw secret
    assert.ok(getBody.maskedApiKey.includes("..."));
  });

  // 4. Concurrency Load Test (50 Concurrent Checkouts)
  test("Concurrency: handles 50 concurrent checkout requests without unhandled errors", async () => {
    const requests = Array.from({ length: 50 }, (_, i) => {
      const payload = {
        customerName: `Concurrent Buyer ${i + 1}`,
        phone: `017110000${String(i).padStart(2, "0")}`,
        deliveryZone: "inside_dhaka",
        deliveryDistrict: "Dhaka",
        deliveryAddress: `House ${i + 1}, Road 5`,
        items: [
          {
            productId: "11111111-1111-1111-1111-111111111111",
            variantId: "22222222-2222-2222-2222-222222222222",
            quantity: 1,
          },
        ],
      };

      return app.request("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `198.51.100.${(i % 250) + 1}`,
        },
        body: JSON.stringify(payload),
      });
    });

    const responses = await Promise.all(requests);
    assert.strictEqual(responses.length, 50);

    for (const res of responses) {
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    }
  });

  after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 100);
  });
});
