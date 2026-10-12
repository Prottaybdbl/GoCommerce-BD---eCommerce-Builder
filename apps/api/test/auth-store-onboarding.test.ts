process.env.NODE_ENV = "test";
import { test, describe, after, beforeEach } from "node:test";
import assert from "node:assert";
import app from "../src/index.js";
import { clearRateLimits } from "../src/middleware/rate-limit.js";

describe("Phase 7: Secure Auth & Store Creation Onboarding Tests", () => {
  beforeEach(() => {
    clearRateLimits();
  });

  const uniqueSuffix = Date.now().toString().slice(-6);
  const testSubdomain = `mystore${uniqueSuffix}`;
  const testEmail = `owner${uniqueSuffix}@example.com`;
  const testPassword = "StrongPassword@123";
  let authToken = "";

  // 1. Subdomain Check Tests
  test("GET /api/auth/check-subdomain: reports available for fresh subdomain", async () => {
    const res = await app.request(`/api/auth/check-subdomain?subdomain=${testSubdomain}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.available, true);
    assert.strictEqual(body.subdomain, testSubdomain);
  });

  test("GET /api/auth/check-subdomain: rejects reserved subdomains", async () => {
    const res = await app.request("/api/auth/check-subdomain?subdomain=admin");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.available, false);
    assert.ok(body.error.includes("সংরক্ষিত"));
  });

  test("GET /api/auth/check-subdomain: rejects invalid subdomain characters", async () => {
    const res = await app.request("/api/auth/check-subdomain?subdomain=INVALID_SUBDOMAIN!");
    assert.strictEqual(res.status, 400);
  });

  // 2. Register Store Tests
  test("POST /api/auth/register-store: rejects weak password (<8 characters)", async () => {
    const res = await app.request("/api/auth/register-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Merchant",
        email: `weak${uniqueSuffix}@example.com`,
        password: "123", // Too short
        storeName: "Weak Pass Store",
        subdomain: `weak${uniqueSuffix}`,
        phone: "01712345678",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("৮ অক্ষরের"));
  });

  test("POST /api/auth/register-store: rejects invalid Bangladesh phone number", async () => {
    const res = await app.request("/api/auth/register-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Merchant",
        email: `badphone${uniqueSuffix}@example.com`,
        password: testPassword,
        storeName: "Bad Phone Store",
        subdomain: `badphone${uniqueSuffix}`,
        phone: "123456", // Invalid phone
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.detail.includes("১১ ডিজিটের"));
  });

  test("POST /api/auth/register-store: successfully registers new store and merchant", async () => {
    const res = await app.request("/api/auth/register-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "সাকিব আল হাসান",
        email: testEmail,
        password: testPassword,
        storeName: "সাকিব ফ্যাশন হাব",
        subdomain: testSubdomain,
        phone: "০১৭২২৩৩৪৪৫৫", // Bangla digits normalization test
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.store.subdomain, testSubdomain);
    assert.ok(body.token);
    authToken = body.token;

    // Verify Set-Cookie header is present and HttpOnly
    const setCookie = res.headers.get("set-cookie") || "";
    assert.ok(setCookie.includes("better-auth.session_token="));
    assert.ok(setCookie.includes("HttpOnly"));
    assert.ok(setCookie.includes("SameSite=Lax"));
  });

  test("POST /api/auth/register-store: rejects duplicate subdomain with 409 Conflict", async () => {
    const res = await app.request("/api/auth/register-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Another Merchant",
        email: `diff_${testEmail}`,
        password: testPassword,
        storeName: "Duplicate Subdomain Store",
        subdomain: testSubdomain, // Same subdomain
        phone: "01811223344",
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.ok(body.detail.includes("ইতিমধ্যে ব্যবহৃত"));
  });

  test("POST /api/auth/register-store: rejects duplicate email with 409 Conflict", async () => {
    const res = await app.request("/api/auth/register-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Email Merchant",
        email: testEmail, // Same email
        password: testPassword,
        storeName: "Diff Store Name",
        subdomain: `diffsub${uniqueSuffix}`,
        phone: "01911223344",
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.ok(body.detail.includes("ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি"));
  });

  // 3. User Login Tests
  test("POST /api/auth/login: rejects wrong password with 401 generic error", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "IncorrectPassword999",
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.detail, "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়");
  });

  test("POST /api/auth/login: rejects non-existent email with same generic 401 (prevent enumeration)", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent_random_user_999@example.com",
        password: testPassword,
      }),
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.detail, "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়");
  });

  test("POST /api/auth/login: successfully authenticates and returns store details", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.store.subdomain, testSubdomain);
    assert.ok(body.token);

    authToken = body.token;
  });

  // 4. Session Status Tests
  test("GET /api/auth/me: returns unauthenticated when no credentials provided", async () => {
    const res = await app.request("/api/auth/me");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.authenticated, false);
  });

  test("GET /api/auth/me: returns user and store data when valid Bearer token provided", async () => {
    const res = await app.request("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.authenticated, true);
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.store.subdomain, testSubdomain);
    assert.strictEqual(body.role, "owner");
  });

  // 5. Sign Out Tests
  test("POST /api/auth/sign-out: invalidates session and clears cookie", async () => {
    const res = await app.request("/api/auth/sign-out", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    const setCookie = res.headers.get("set-cookie") || "";
    assert.ok(setCookie.includes("Max-Age=0"));

    // Verify session is no longer active
    const checkRes = await app.request("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkBody.authenticated, false);
  });

  // 6. Super Admin Authentication Tests
  test("POST /api/auth/login: successfully authenticates default Super Admin", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@gocommerce.bd",
        password: "123456",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, "admin@gocommerce.bd");
    assert.strictEqual(body.user.role, "super_admin");
    assert.ok(body.token);

    // Verify /api/auth/me with Super Admin token
    const meRes = await app.request("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${body.token}`,
      },
    });
    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.authenticated, true);
    assert.strictEqual(meBody.user.role, "super_admin");
    assert.strictEqual(meBody.role, "super_admin");
  });

  // 7. Username / Subdomain Login Tests
  test("POST /api/auth/login: successfully authenticates using store subdomain as username", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testSubdomain, // User typed subdomain in the input
        password: testPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.store.subdomain, testSubdomain);
    assert.ok(body.token);
  });

  test("POST /api/auth/login: successfully authenticates using username field in body", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testSubdomain,
        password: testPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.store.subdomain, testSubdomain);
  });

  test("POST /api/auth/login: successfully authenticates Super Admin using 'admin' username alias and 123456 password", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin",
        password: "123456",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.role, "super_admin");
  });

  test("POST /api/auth/login: successfully authenticates Super Admin using username: 'admin' and password: '123456'", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "123456",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.role, "super_admin");
  });

  // 5. Google Authentication Tests
  test("GET /api/auth/google/status: returns Google OAuth enablement status", async () => {
    const res = await app.request("/api/auth/google/status");
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.provider, "google");
    assert.strictEqual(typeof body.enabled, "boolean");
  });

  test("POST /api/auth/google: initiates Google OAuth authorization flow or returns status", async () => {
    const res = await app.request("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callbackURL: "http://localhost:5173" }),
    });

    const body = await res.json();
    if (res.status === 200) {
      assert.strictEqual(body.configured, true);
      assert.ok(body.url.includes("accounts.google.com"));
      assert.ok(body.url.includes("client_id"));
    } else if (res.status === 503) {
      assert.strictEqual(body.configured, false);
      assert.ok(body.detail.includes("গুগল লগইন"));
    }
  });

  test("POST /api/auth/google/demo: successfully authenticates Google demo merchant in non-production", async () => {
    const res = await app.request("/api/auth/google/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, "google.merchant@demo.com");
    assert.ok(body.token);

    // Verify authenticated session with /api/auth/me
    const meRes = await app.request("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${body.token}`,
      },
    });
    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.authenticated, true);
    assert.strictEqual(meBody.user.email, "google.merchant@demo.com");
  });

  // 6. Google Trial Sign-Up & Multi-Step Onboarding Tests
  test("POST /api/auth/google/demo with freshTrial: creates new trial user requiring onboarding", async () => {
    const res = await app.request("/api/auth/google/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freshTrial: true }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.needsOnboarding, true);
    assert.strictEqual(body.store.plan, "pilot");
    assert.strictEqual(body.store.status, "trialing");
    assert.strictEqual(body.store.isTrial, true);
    assert.ok(body.token);

    // Verify /api/auth/me returns needsOnboarding: true
    const meRes = await app.request("/api/auth/me", {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    assert.strictEqual(meRes.status, 200);
    const meBody = await meRes.json();
    assert.strictEqual(meBody.authenticated, true);
    assert.strictEqual(meBody.needsOnboarding, true);

    // Verify Google trial store is listed in Super Admin Trial Users list
    const superAdminRes = await app.request("/api/super-admin/tenants", {
      headers: { "x-test-role": "super_admin" },
    });
    assert.strictEqual(superAdminRes.status, 200);
    const superAdminData = await superAdminRes.json();
    const trialFound = superAdminData.tenants.find(
      (t: any) => t.id === body.store.id || t.subdomain === body.store.subdomain
    );
    assert.ok(trialFound, "New Google sign-up store must be listed in Super Admin trial tenants");
    assert.strictEqual(trialFound.isTrial, true);
    assert.ok(trialFound.daysRemaining >= 14);
  });

  test("POST /api/auth/complete-onboarding: validates store name, subdomain, niche, phone and password", async () => {
    // 1. Authenticate fresh Google trial user
    const googleRes = await app.request("/api/auth/google/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freshTrial: true }),
    });
    const googleBody = await googleRes.json();
    const userToken = googleBody.token;

    // 2. Reject missing session
    const unauthRes = await app.request("/api/auth/complete-onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: "স্মার্ট মার্ট",
        subdomain: `smartmart${uniqueSuffix}`,
        niche: "gadgets",
        phone: "01711223344",
        password: "ValidPassword123",
      }),
    });
    assert.strictEqual(unauthRes.status, 401);

    // 3. Reject weak password (<8 chars)
    const weakPassRes = await app.request("/api/auth/complete-onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        storeName: "স্মার্ট মার্ট",
        subdomain: `smartmart${uniqueSuffix}`,
        niche: "gadgets",
        phone: "01711223344",
        password: "123",
      }),
    });
    assert.strictEqual(weakPassRes.status, 400);

    // 4. Reject invalid phone number
    const badPhoneRes = await app.request("/api/auth/complete-onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        storeName: "স্মার্ট মার্ট",
        subdomain: `smartmart${uniqueSuffix}`,
        niche: "gadgets",
        phone: "12345",
        password: "ValidPassword123",
      }),
    });
    assert.strictEqual(badPhoneRes.status, 400);

    // 5. Successfully complete onboarding with Bangla phone numerals
    const completeRes = await app.request("/api/auth/complete-onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        storeName: "স্মার্ট গ্যাজেট বাংলাদেশ",
        subdomain: `smartgadget${uniqueSuffix}`,
        niche: "gadgets",
        phone: "০১৭৮৮৯৯০০১১", // Bengali numerals
        password: "SecretPassword@2026",
      }),
    });

    assert.strictEqual(completeRes.status, 200);
    const completeBody = await completeRes.json();
    assert.strictEqual(completeBody.success, true);
    assert.strictEqual(completeBody.needsOnboarding, false);
    assert.strictEqual(completeBody.store.name, "স্মার্ট গ্যাজেট বাংলাদেশ");
    assert.strictEqual(completeBody.store.subdomain, `smartgadget${uniqueSuffix}`);
    assert.strictEqual(completeBody.store.phone, "+8801788990011");
    assert.strictEqual(completeBody.store.niche, "gadgets");
    assert.strictEqual(completeBody.store.isTrial, true);

    // 6. Verify subsequent /api/auth/me returns needsOnboarding: false (dashboard unblurred)
    const afterMeRes = await app.request("/api/auth/me", {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(afterMeRes.status, 200);
    const afterMeBody = await afterMeRes.json();
    assert.strictEqual(afterMeBody.needsOnboarding, false);
    assert.strictEqual(afterMeBody.store.name, "স্মার্ট গ্যাজেট বাংলাদেশ");

    // 7. Verify user can now also log in with email and the newly set password
    const emailLoginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "google.trial@demo.com",
        password: "SecretPassword@2026",
      }),
    });
    assert.strictEqual(emailLoginRes.status, 200);
    const loginData = await emailLoginRes.json();
    assert.strictEqual(loginData.success, true);
    assert.strictEqual(loginData.needsOnboarding, false);
  });

  after(async () => {
    const { closeDatabase } = await import("@gocom/db");
    await closeDatabase();
    setTimeout(() => process.exit(0), 150);
  });
});
