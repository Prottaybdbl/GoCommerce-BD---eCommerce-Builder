process.env.NODE_ENV = "test";
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { resolveFeatures, resolveLimits, can, limit } from "@gocom/db";
import { getAllManifests, getManifest, resolveTheme, SECTION_REGISTRY, getShell, buildDraftFromManifest } from "@gocom/themes";

const testStore = {
  id: "40000000-0000-0000-0000-000000000001",
  organizationId: "org_template_test",
  name: "Template Test Store",
  subdomain: "template-test",
  phone: "+8801711000004",
  plan: "package_4",
  isActive: true,
  themeArchetype: "viral-funnel",
  themeConfig: { presetId: "rose-bold" },
};

function makeSessionHeader(user: { id: string; role?: string }, role: string, store: any) {
  return JSON.stringify({
    user: { id: user.id, name: "Test Owner", email: `${user.id}@test.com`, role: user.role || "user" },
    session: {
      id: `sess_${user.id}`,
      userId: user.id,
      activeOrganizationId: store.organizationId,
      _testStore: store,
      _testRole: role,
    },
  });
}

describe("Template System Phase 0 & Phase A Verification", () => {
  after(() => {
    setTimeout(() => process.exit(0), 100);
  });

  // T-1: Cumulative Entitlements Hierarchy Guard
  test("T-1 Entitlements: package_4 ⊇ package_3 ⊇ package_2 ⊇ package_1", () => {
    const f1 = new Set(resolveFeatures("package_1"));
    const f2 = new Set(resolveFeatures("package_2"));
    const f3 = new Set(resolveFeatures("package_3"));
    const f4 = new Set(resolveFeatures("package_4"));

    // Every plan inherits the features of the plan below it
    for (const f of f1) {
      assert.ok(f2.has(f), `package_2 must inherit feature '${f}' from package_1`);
    }
    for (const f of f2) {
      assert.ok(f3.has(f), `package_3 must inherit feature '${f}' from package_2`);
    }
    for (const f of f3) {
      assert.ok(f4.has(f), `package_4 must inherit feature '${f}' from package_3`);
    }

    // Explicit checks: package_4 must retain critical features
    assert.ok(f4.has("landing"), "package_4 has landing");
    assert.ok(f4.has("multi_landing"), "package_4 has multi_landing");
    assert.ok(f4.has("shop"), "package_4 has shop");
    assert.ok(f4.has("shop_pro"), "package_4 has shop_pro");
    assert.ok(f4.has("pixel"), "package_4 has pixel");
    assert.ok(f4.has("incomplete_orders"), "package_4 has incomplete_orders");
    assert.ok(f4.has("template_library:landing"), "package_4 has landing templates");
    assert.ok(f4.has("template_library:shop"), "package_4 has shop templates");
  });

  test("T-1 Limits: page limits scale with packages", () => {
    const l1 = resolveLimits("package_1");
    const l2 = resolveLimits("package_2");
    const l3 = resolveLimits("package_3");
    const l4 = resolveLimits("package_4");

    assert.equal(l1.pages, 1);
    assert.equal(l2.pages, 10);
    assert.equal(l3.pages, 20);
    assert.equal(l4.pages, 50);
  });

  // Manifests & Section Registry
  test("Section Registry: 12 MVP sections registered with schemas and meta", () => {
    const expectedSections = [
      "announcement_bar",
      "features_list",
      "header",
      "banner_carousel",
      "hero_product",
      "inline_checkout",
      "origin_badge",
      "specs_table",
      "trust_badges",
      "video_showcase",
      "sticky_bottom_bar",
      "faq_accordion",
    ];

    for (const type of expectedSections) {
      const entry = (SECTION_REGISTRY as any)[type];
      assert.ok(entry, `Section ${type} must be in registry`);
      assert.ok(entry.meta, `Section ${type} must have meta`);
      assert.ok(entry.schema, `Section ${type} must have schema`);
      assert.equal(entry.meta.type, type);
    }
  });

  test("Manifests: all 5 starter templates load, validate, and have page shells", () => {
    const manifests = getAllManifests();
    assert.ok(manifests.length >= 5, "Must have at least 5 manifests registered");

    const manifestMap = new Map(manifests.map((m) => [m.id, m]));
    for (const id of ["viral-funnel", "fashion-store", "tech-gadget", "organic-food", "multi-campaign"]) {
      assert.ok(manifestMap.has(id), `Manifest ${id} must exist`);
      const m = manifestMap.get(id)!;
      assert.ok(m.pages.main);
      assert.ok(m.pages.main.sections.length >= 5);
      const shell = getShell(m.shell);
      assert.ok(shell.maxWidth);
      assert.ok(shell.gutter);
      assert.ok(shell.rhythm);
    }
  });

  // Theme API Endpoints & Permissions
  test("GET /v1/templates: returns available templates for store", async () => {
    const res = await app.request("/v1/templates", {
      headers: {
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.templates));
    assert.ok(data.templates.length >= 5);
  });

  test("GET /v1/theme: returns theme configuration and manifest", async () => {
    const res = await app.request("/v1/theme", {
      headers: {
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.theme);
    assert.ok(data.manifest);
    assert.equal(data.theme.storeId, testStore.id);
  });

  test("POST /v1/theme/draft: call_staff cannot save draft (403 Forbidden)", async () => {
    const res = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_call" }, "call_staff", testStore),
      },
      body: JSON.stringify({
        draft: { pages: { main: { sections: [] } } },
      }),
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.detail.includes("theme:manage"));
  });

  test("POST /v1/theme/draft: owner can save draft successfully", async () => {
    const draft = buildDraftFromManifest(getManifest("viral-funnel"));
    const announcementSec = draft.pages.main.sections.find((s) => s.type === "announcement_bar");
    if (announcementSec) {
      announcementSec.settings.text = "Updated draft announcement text";
    }

    const res = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
      body: JSON.stringify({
        templateId: "viral-funnel",
        presetId: "rose-bold",
        tokenOverrides: { primary: "#E11D48" },
        draft,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.templateId, "viral-funnel");
    assert.equal(data.data.draftRevision, 1);
  });

  test("POST /v1/theme/publish: publishes draft and creates revision", async () => {
    const res = await app.request("/v1/theme/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.publishedVersion, 1);
    assert.ok(data.snapshot);
    assert.ok(data.snapshot.sections.length > 0);
  });

  test("GET /v1/theme/revisions: lists published revisions", async () => {
    const res = await app.request("/v1/theme/revisions", {
      headers: {
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.revisions));
    assert.ok(data.revisions.length >= 1);
    assert.equal(data.revisions[0].version, 1);
  });

  test("POST /v1/theme/rollback: rolls back to revision 1", async () => {
    const res = await app.request("/v1/theme/rollback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
      body: JSON.stringify({ version: 1 }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.restoredVersion, 1);
    assert.equal(data.publishedVersion, 2);
  });
});
