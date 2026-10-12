process.env.NODE_ENV = "test";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { TEMPLATE_REGISTRY } from "../src/services/template-preview.js";

describe("Template Preview System Comprehensive Suite", () => {
  after(() => {
    setTimeout(() => process.exit(0), 100);
  });

  test("Template Preview System: All 71 templates registered and correctly categorized", () => {
    const templateIds = Object.keys(TEMPLATE_REGISTRY);
    assert.equal(templateIds.length, 71, `Expected 71 registered templates, got ${templateIds.length}`);

    const landingTemplates = templateIds.filter((id) => TEMPLATE_REGISTRY[id].tier === "landing");
    const shopTemplates = templateIds.filter((id) => TEMPLATE_REGISTRY[id].tier === "shop");

    assert.equal(landingTemplates.length, 45, `Expected 45 landing templates, got ${landingTemplates.length}`);
    assert.equal(shopTemplates.length, 26, `Expected 26 shop templates, got ${shopTemplates.length}`);
  });

  test("Template Preview System: Directory listing API returns all 71 templates", async () => {
    const res = await app.request("/api/templates");
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.total, 71);
    assert.equal(json.templates.length, 71);

    // Check sample template fields
    const salatHijab = json.templates.find((t: any) => t.id === "salat-hijab");
    assert.ok(salatHijab);
    assert.equal(salatHijab.name, "Comfort Salat Prayer Hijab");
    assert.equal(salatHijab.tier, "landing");
    assert.equal(salatHijab.previewUrl, "/api/templates/salat-hijab/preview");
  });

  test("Template Preview System: Core Dynamic Archetypes return 200 with preview HTML", async () => {
    const coreArchetypes = ["viral-funnel", "fashion-store", "multi-campaign", "tech-gadget", "organic-food"];

    for (const id of coreArchetypes) {
      const res = await app.request(`/api/templates/${id}/preview`);
      assert.equal(res.status, 200, `Expected 200 for ${id}`);
      assert.ok(res.headers.get("content-type")?.includes("text/html"), `Expected html content-type for ${id}`);
      const html = await res.text();
      assert.ok(html.includes("<!DOCTYPE html>"), `Expected <!DOCTYPE html> for ${id}`);
      assert.ok(html.includes("প্রিভিউ"), `Expected preview text for ${id}`);
    }
  });

  test("Template Preview System: Check all 71 templates preview endpoints return 200 OK with valid HTML", async () => {
    const allIds = Object.keys(TEMPLATE_REGISTRY);

    let successCount = 0;
    const failedIds: string[] = [];

    for (const id of allIds) {
      try {
        const res = await app.request(`/api/templates/${id}/preview`);
        if (res.status === 200) {
          const html = await res.text();
          if (html.includes("<html") || html.includes("<!DOCTYPE html") || html.includes("<head>")) {
            successCount++;
          } else {
            failedIds.push(`${id} (invalid html content)`);
          }
        } else {
          failedIds.push(`${id} (status: ${res.status})`);
        }
      } catch (err: any) {
        failedIds.push(`${id} (error: ${err.message})`);
      }
    }

    assert.equal(
      failedIds.length,
      0,
      `Failed previews: ${failedIds.join(", ")}. Passed: ${successCount}/71`
    );
    assert.equal(successCount, 71, `All 71 template previews must succeed. Got ${successCount}/71`);
  });
});
