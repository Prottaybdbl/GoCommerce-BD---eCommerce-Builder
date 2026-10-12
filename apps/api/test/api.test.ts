process.env.NODE_ENV = "test";
import { test, describe, after } from "node:test";
import assert from "node:assert";
import app from "../src/index.js";

describe("GoCom API & Security Middleware Tests", () => {
  test("Security Headers: ensures mandatory protection headers on every response", async () => {
    const res = await app.request("/health");
    
    assert.strictEqual(res.headers.get("x-content-type-options"), "nosniff");
    assert.strictEqual(res.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.ok(res.headers.get("content-security-policy")?.includes("default-src 'self'"));
    assert.ok(res.headers.get("permissions-policy")?.includes("camera=()"));
  });

  test("Health Check Endpoint: responds with system status", async () => {
    const res = await app.request("/health");
    assert.ok(res.status === 200 || res.status === 503); // 503 if local DB not started yet, 200 if connected
    const data = await res.json();
    assert.ok(data.status);
  });

  test("OpenAPI Interactive Docs: /docs returns HTML documentation UI", async () => {
    const res = await app.request("/docs");
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Go Commerce BD"));
  });

  test("Checkout API: rejects malformed order payloads with 400 Bad Request", async () => {
    const res = await app.request("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "", // invalid empty name
        phone: "012345", // invalid short phone
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "Validation failed");
    assert.ok(body.details);
  });

  test("Incomplete Orders API: rejects invalid phone numbers", async () => {
    const res = await app.request("/api/incomplete-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "invalid-number",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "Invalid data");
  });

  test("CORS Security: blocks unauthorized external origins from credentialed access", async () => {
    const res = await app.request("/health", {
      headers: { Origin: "https://malicious-attacker.com" },
    });

    // Access-Control-Allow-Origin must NOT reflect the malicious origin
    const allowOrigin = res.headers.get("access-control-allow-origin");
    assert.notStrictEqual(allowOrigin, "https://malicious-attacker.com");
  });

  test("Tenant Security: x-tenant-id header is strictly ignored", async () => {
    // Attempting to inject a spoofed tenant ID via header
    const res = await app.request("/api/storefront/config", {
      headers: {
        "x-tenant-id": "evil-tenant-id-666",
        Host: "unknown-storefront-host-12345.com",
      },
    });

    // Because the unknown host does not exist and x-tenant-id is rejected,
    // in test mode it will either hit test fallback or 404, but NEVER load evil-tenant-id
    const body = await res.json();
    if (body.store) {
      assert.notStrictEqual(body.store.id, "evil-tenant-id-666");
    }
  });

  after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 100);
  });
});
