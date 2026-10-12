import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { bdtToPoisha } from "@gocom/contracts";

test("Phase 15: Dynamic Packages & Pricing Engine Tests", async (t) => {
  await t.test("GET /api/storefront/packages: public endpoint returns active packages", async () => {
    const res = await app.request("/api/storefront/packages");
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.packages));
    assert.ok(data.packages.length >= 4);

    const starter = data.packages.find((p: any) => p.id === "starter");
    assert.ok(starter);
    assert.equal(starter.name, "Starter");
    assert.equal(starter.priceBdt, 599);
    assert.equal(starter.pricePoisha, "59900");
    assert.ok(starter.featuresList.length > 0);
  });

  await t.test("GET /api/super-admin/packages: rejects unauthenticated requests with 403", async () => {
    const res = await app.request("/api/super-admin/packages");
    assert.equal(res.status, 403);
  });

  await t.test("GET /api/super-admin/packages: allows Super Admin access", async () => {
    const res = await app.request("/api/super-admin/packages", {
      headers: {
        "x-test-role": "super_admin",
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.packages.length >= 4);
  });

  await t.test("POST /api/super-admin/packages: creates a new package with poisha math", async () => {
    const newPkg = {
      id: "enterprise-test",
      name: "Enterprise VIP",
      priceBdt: 4999,
      billingInterval: "monthly",
      badge: "ENTERPRISE",
      isPopular: false,
      description: "Custom scale for large brands",
      featuresList: [
        "Dedicated Account Manager",
        "Custom ERP Sync",
        "Unlimited everything",
      ],
      fees: { physical: "0%", digital: "1%", resell: "0.5%" },
      limits: { products: 50000, landingPages: 200, staff: 50, storageMb: 50000 },
      ctaText: "Contact Us",
      ctaLink: "#contact",
      sortOrder: 5,
      isActive: true,
    };

    const res = await app.request("/api/super-admin/packages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      },
      body: JSON.stringify(newPkg),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.package.id, "enterprise-test");
    assert.equal(data.package.priceBdt, 4999);
    assert.equal(data.package.pricePoisha, "499900"); // 1 BDT = 100 poisha invariant
    assert.equal(data.package.badge, "ENTERPRISE");
  });

  await t.test("PUT /api/super-admin/packages/:id: updates price and features dynamically", async () => {
    const res = await app.request("/api/super-admin/packages/starter", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      },
      body: JSON.stringify({
        priceBdt: 499,
        badge: "DISCOUNTED",
        description: "Special seasonal discount",
        featuresList: ["500 products", "Free custom domain", "Priority 24/7 call support"],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.package.priceBdt, 499);
    assert.equal(data.package.pricePoisha, "49900");
    assert.equal(data.package.badge, "DISCOUNTED");

    // Verify storefront endpoint immediately reflects updated price
    const sfRes = await app.request("/api/storefront/packages");
    const sfData = await sfRes.json();
    const updatedStarter = sfData.packages.find((p: any) => p.id === "starter");
    assert.equal(updatedStarter.priceBdt, 499);
    assert.equal(updatedStarter.badge, "DISCOUNTED");
  });

  await t.test("DELETE /api/super-admin/packages/:id: removes package", async () => {
    const res = await app.request("/api/super-admin/packages/enterprise-test", {
      method: "DELETE",
      headers: {
        "x-test-role": "super_admin",
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    // Verify gone from public storefront
    const sfRes = await app.request("/api/storefront/packages");
    const sfData = await sfRes.json();
    assert.equal(sfData.packages.some((p: any) => p.id === "enterprise-test"), false);
  });

  await t.test("POST /api/super-admin/packages/reset-defaults: resets to default 4 packages", async () => {
    const res = await app.request("/api/super-admin/packages/reset-defaults", {
      method: "POST",
      headers: {
        "x-test-role": "super_admin",
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.packages.length, 4);

    const starter = data.packages.find((p: any) => p.id === "starter");
    assert.equal(starter.priceBdt, 599);
  });

  await t.test("GET /api/super-admin/tenants: rejects unauthenticated requests with 403", async () => {
    const res = await app.request("/api/super-admin/tenants");
    assert.equal(res.status, 403);
  });

  await t.test("GET /api/super-admin/tenants: allows Super Admin access and returns clean real tenants without dummy stores", async () => {
    const res = await app.request("/api/super-admin/tenants", {
      headers: {
        "x-test-role": "super_admin",
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.tenants));
    // Verify none of the old fake hardcoded mock stores exist
    assert.equal(data.tenants.some((tenant: any) => tenant.id === "store_01" || tenant.id === "store_02"), false);
  });

  setTimeout(() => process.exit(0), 100);
});
