process.env.NODE_ENV = "test";
import { test, describe, afterEach, after } from "node:test";
import assert from "node:assert";
import app from "../src/index.js";
import { config } from "../src/config.js";
import {
  generatePresignedPutUrl,
  generateMediaUploadBatch,
  verifyUploadedObject,
  mockR2Storage,
} from "../src/services/r2.js";
import {
  purgeStoreCache,
  getStorefrontCacheHeaders,
  validateStorefrontHygiene,
  cachePurgeHistory,
} from "../src/services/cloudflare-cache.js";

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

describe("Phase 3: Media Pipeline, Cloudflare R2 & Edge Caching Tests", () => {
  afterEach(() => {
    mockR2Storage.clear();
  });

  // 1. Invariant #3: Zero Server Image Processing Verification
  test("Invariant #3: apps/api does not import sharp or image decoding libraries", async () => {
    let imported = false;
    try {
      // @ts-ignore
      await import("sharp");
      imported = true;
    } catch {
      imported = false;
    }
    assert.strictEqual(imported, false);
  });

  // 2. AWS SigV4 Presigner & 3-Width Batch Generation
  test("SigV4 Presigner: generates valid SigV4 presigned PUT URL for Cloudflare R2", () => {
    const key = "stores/test-store/products/img-123/720.webp";
    const testDate = new Date("2026-10-01T12:00:00Z");

    const urlString = generatePresignedPutUrl({
      key,
      contentType: "image/webp",
      expiresInSeconds: 900,
      date: testDate,
    });

    const parsed = new URL(urlString);
    assert.ok(parsed.hostname.includes("cloudflarestorage.com"));
    assert.ok(parsed.pathname.includes(key));
    assert.strictEqual(parsed.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
    assert.ok(parsed.searchParams.get("X-Amz-Credential")?.includes("/auto/s3/aws4_request"));
    assert.strictEqual(parsed.searchParams.get("X-Amz-Date"), "20261001T120000Z");
    assert.strictEqual(parsed.searchParams.get("X-Amz-Expires"), "900");
    assert.strictEqual(parsed.searchParams.get("X-Amz-SignedHeaders"), "host");
    assert.ok(parsed.searchParams.get("X-Amz-Signature")!.length > 30);
  });

  test("Media Batch Generator: outputs 3 widths (360px, 720px, 1080px) scoped to store tenant", () => {
    const batch = generateMediaUploadBatch(testStoreA.id, "smart-chopper.png", "image/webp", "products");

    assert.ok(batch.uploadId);
    assert.strictEqual(batch.urls.small.width, 360);
    assert.strictEqual(batch.urls.medium.width, 720);
    assert.strictEqual(batch.urls.large.width, 1080);

    // Assert strictly scoped to store A's tenant prefix
    const expectedPrefix = `stores/${testStoreA.id}/products/${batch.uploadId}/`;
    assert.ok(batch.urls.small.key.startsWith(expectedPrefix));
    assert.ok(batch.urls.small.key.endsWith("360.webp"));
    assert.ok(batch.urls.medium.key.endsWith("720.webp"));
    assert.ok(batch.urls.large.key.endsWith("1080.webp"));

    // Assert public URLs are formed with R2 public domain
    assert.ok(
      batch.urls.large.publicUrl.startsWith(`https://${config.R2_PUBLIC_DOMAIN}/`) ||
      batch.urls.large.publicUrl.startsWith("https://media.yourbrand.com/")
    );
  });

  // 3. Media Presign API Endpoint & RBAC
  test("POST /v1/media/presign: requires authentication (401 Unauthorized)", async () => {
    const res = await app.request("/v1/media/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "camera.jpg", contentType: "image/webp" }),
    });

    assert.strictEqual(res.status, 401);
  });

  test("POST /v1/media/presign: call_staff cannot manage media (403 Forbidden)", async () => {
    const res = await app.request("/v1/media/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "staff_call" }, "call_staff", testStoreA),
      },
      body: JSON.stringify({ filename: "camera.jpg", contentType: "image/webp" }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.status, 403);
    assert.ok(body.detail.includes("products:manage"));
  });

  test("POST /v1/media/presign: store admin receives 3-width presigned PUT URLs", async () => {
    const res = await app.request("/v1/media/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "owner_1" }, "owner", testStoreA),
      },
      body: JSON.stringify({ filename: "camera.jpg", contentType: "image/webp" }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.uploadId);
    assert.ok(body.data.urls.small.uploadUrl);
    assert.ok(body.data.urls.medium.uploadUrl);
    assert.ok(body.data.urls.large.uploadUrl);
  });

  // 4. Tenant Isolation on Media Verification (Invariant #4 & #5)
  test("POST /v1/media/verify: blocks cross-store verification attempts (IDOR 403)", async () => {
    const foreignKey = `stores/${testStoreB.id}/products/foreign-upload/720.webp`;

    const res = await app.request("/v1/media/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "owner_1" }, "owner", testStoreA),
      },
      body: JSON.stringify({ keys: [foreignKey] }),
    });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.title, "Tenant Isolation Violation");
    assert.ok(body.detail.includes("does not belong to store"));
  });

  // 5. Backend HTTP HEAD Verification Logic (Zero Server Processing)
  test("HEAD Verification: verifies valid uploaded object metadata", async () => {
    const key = `stores/${testStoreA.id}/products/test-upload/720.webp`;
    mockR2Storage.set(key, { size: 85_400, contentType: "image/webp" });

    const result = await verifyUploadedObject(key);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.metadata?.size, 85_400);
    assert.strictEqual(result.metadata?.contentType, "image/webp");
  });

  test("HEAD Verification: rejects oversized object exceeding 2 MB limit", async () => {
    const key = `stores/${testStoreA.id}/products/test-upload/1080.webp`;
    // 3 MB file
    mockR2Storage.set(key, { size: 3 * 1024 * 1024, contentType: "image/webp" });

    const result = await verifyUploadedObject(key);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes("exceeds"));
  });

  test("POST /v1/media/verify: successfully verifies valid store images", async () => {
    const keySmall = `stores/${testStoreA.id}/products/test-upload/360.webp`;
    const keyMedium = `stores/${testStoreA.id}/products/test-upload/720.webp`;
    const keyLarge = `stores/${testStoreA.id}/products/test-upload/1080.webp`;

    mockR2Storage.set(keySmall, { size: 28_000, contentType: "image/webp" });
    mockR2Storage.set(keyMedium, { size: 65_000, contentType: "image/webp" });
    mockR2Storage.set(keyLarge, { size: 120_000, contentType: "image/webp" });

    const res = await app.request("/v1/media/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "owner_1" }, "owner", testStoreA),
      },
      body: JSON.stringify({ keys: [keySmall, keyMedium, keyLarge] }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.verified, true);
    assert.strictEqual(body.objects.length, 3);
  });

  // 6. Edge Caching & Cloudflare Tag Purge
  test("Edge Caching Headers: provides compliant Cache-Control and Cache-Tag", () => {
    const headers = getStorefrontCacheHeaders(testStoreA.id, {
      maxAge: 60,
      sMaxAge: 86400,
      tags: ["products", "catalog"],
    });

    assert.ok(headers["Cache-Control"].includes("s-maxage=86400"));
    assert.ok(headers["Cache-Control"].includes("stale-while-revalidate=600"));
    assert.ok(headers["Cache-Tag"].includes(`s:${testStoreA.id}`));
    assert.ok(headers["Cache-Tag"].includes(`s:${testStoreA.id}:products`));
  });

  test("Invariant #8: Storefront endpoints never return Set-Cookie headers", async () => {
    const res = await app.request("/api/storefront/config", {
      headers: {
        host: "alpha.yourbrandshop.com",
      },
    });

    assert.ok(validateStorefrontHygiene(res.headers));
    assert.strictEqual(res.headers.get("set-cookie"), null);
  });

  test("Cache Purge: purgeStoreCache records tag invalidation", async () => {
    const initialCount = cachePurgeHistory.length;
    const purgeResult = await purgeStoreCache(testStoreA.id, ["products", "catalog"]);

    assert.strictEqual(purgeResult.success, true);
    assert.ok(purgeResult.purgedTags.includes(`s:${testStoreA.id}:products`));
    assert.ok(cachePurgeHistory.length > initialCount);
  });

  test("Catalog & Theme Mutations: triggers cache purge on update", async () => {
    const initialCount = cachePurgeHistory.length;

    // Theme update
    const res = await app.request("/v1/theme", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "owner_1" }, "owner", testStoreA),
      },
      body: JSON.stringify({ themeArchetype: "viral-funnel" }),
    });

    assert.strictEqual(res.status, 200);
    assert.ok(cachePurgeHistory.length > initialCount);
    const lastPurge = cachePurgeHistory[cachePurgeHistory.length - 1];
    assert.strictEqual(lastPurge.storeId, testStoreA.id);
    assert.ok(lastPurge.tags.some((t) => t.includes("theme")));
  });

  after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 100);
  });
});
