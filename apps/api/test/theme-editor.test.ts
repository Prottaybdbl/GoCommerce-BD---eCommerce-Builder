process.env.NODE_ENV = "test";
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { getManifest, buildDraftFromManifest } from "@gocom/themes";
import { clearMockStoreThemes } from "@gocom/db";

const testStoreP1 = {
  id: "50000000-0000-0000-0000-000000000001",
  organizationId: "org_theme_p1",
  name: "Theme Test Store P1",
  subdomain: "theme-p1",
  phone: "+8801711000011",
  plan: "package_1",
  isActive: true,
  themeArchetype: "viral-funnel",
  themeConfig: { presetId: "rose-bold" },
};

const testStoreP4 = {
  id: "50000000-0000-0000-0000-000000000002",
  organizationId: "org_theme_p4",
  name: "Theme Test Store P4",
  subdomain: "theme-p4",
  phone: "+8801711000012",
  plan: "package_4",
  isActive: true,
  themeArchetype: "fashion-store",
  themeConfig: { presetId: "minimal-dark" },
};

const testStoreOther = {
  id: "50000000-0000-0000-0000-000000000003",
  organizationId: "org_theme_other",
  name: "Theme Test Other Store",
  subdomain: "theme-other",
  phone: "+8801711000013",
  plan: "package_4",
  isActive: true,
  themeArchetype: "tech-gadget",
  themeConfig: { presetId: "ocean-light" },
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

describe("Theme Editor API Validation & Lifecycle (apps/api/test/theme-editor.test.ts)", () => {
  after(() => {
    setTimeout(() => process.exit(0), 100);
  });

  beforeEach(() => {
    clearMockStoreThemes();
  });

  // 1. Draft Rejections
  test("Draft validation rejects unknown section type (422)", async () => {
    const draft = buildDraftFromManifest(getManifest("viral-funnel"));
    draft.pages.main.sections.push({
      id: "sec-unknown-99",
      type: "non_existent_section_type" as any,
      enabled: true,
      settings: {},
    });

    const res = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({
        templateId: "viral-funnel",
        draft,
      }),
    });

    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.status, 422);
    assert.ok(data.detail.includes("Unknown section type"));
    assert.ok(data.errors.some((e: any) => e.sectionType === "non_existent_section_type"));
  });

  test("Draft validation rejects invalid settings with field path (422)", async () => {
    const draft = buildDraftFromManifest(getManifest("viral-funnel"));
    const bannerSec = draft.pages.main.sections.find((s) => s.type === "banner_carousel");
    assert.ok(bannerSec, "viral-funnel should have banner_carousel");
    // Invalid enum value for aspectRatio
    bannerSec.settings.aspectRatio = "invalid-aspect-ratio";

    const res = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({
        templateId: "viral-funnel",
        draft,
      }),
    });

    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.status, 422);
    assert.ok(data.errors.some((e: any) => e.field === "aspectRatio" || e.sectionType === "banner_carousel"));
  });

  test("Draft validation rejects missing non-removable locked section (422)", async () => {
    const draft = buildDraftFromManifest(getManifest("viral-funnel"));
    // viral-funnel has inline_checkout with locks.removable === false
    draft.pages.main.sections = draft.pages.main.sections.filter((s) => s.type !== "inline_checkout");

    const res = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({
        templateId: "viral-funnel",
        draft,
      }),
    });

    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.status, 422);
    assert.ok(data.detail.includes("inline_checkout") && data.detail.includes("cannot be removed"));
  });

  test("Draft validation rejects maxPerPage cap breach (422)", async () => {
    const draft = buildDraftFromManifest(getManifest("viral-funnel"));
    const announcement = draft.pages.main.sections.find((s) => s.type === "announcement_bar");
    assert.ok(announcement, "viral-funnel has announcement_bar");
    // announcement_bar has maxPerPage: 1. Adding a second instance breaches the cap.
    draft.pages.main.sections.push({
      id: "sec-announcement-dup",
      type: "announcement_bar",
      enabled: true,
      settings: { ...announcement.settings, text: "Second bar" },
    });

    const res = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({
        templateId: "viral-funnel",
        draft,
      }),
    });

    assert.equal(res.status, 422);
    const data = await res.json();
    assert.equal(data.status, 422);
    assert.ok(data.detail.includes("announcement_bar") && data.detail.includes("at most 1 time(s) per page"));
  });

  // 2. Publish shop template: snapshots all four pages and preserves custom settings
  test("Publish snapshots all four pages of a shop template and preserves custom settings", async () => {
    const shopManifest = getManifest("borkashop");
    const draft = buildDraftFromManifest(shopManifest);

    // Verify shop manifest has main, product, collection, cart
    assert.ok(draft.pages.main, "Shop template has main page");
    assert.ok(draft.pages.product, "Shop template has product page");
    assert.ok(draft.pages.collection, "Shop template has collection page");
    assert.ok(draft.pages.cart, "Shop template has cart page");

    // Modify custom settings on main and product pages
    const mainAnnouncement = draft.pages.main.sections.find((s) => s.type === "announcement_bar");
    if (mainAnnouncement) {
      mainAnnouncement.settings.text = "Custom Borka Main Announcement";
    }

    const prodHero = draft.pages.product.sections.find((s) => s.type === "hero_product");
    if (prodHero) {
      prodHero.settings.customBadge = "Special PDP Edition";
    }

    // Save draft first
    const draftRes = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p4" }, "owner", testStoreP4),
      },
      body: JSON.stringify({
        templateId: "borkashop",
        presetId: "ocean-clean",
        draft,
      }),
    });
    assert.equal(draftRes.status, 200);

    // Publish
    const pubRes = await app.request("/v1/theme/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p4" }, "owner", testStoreP4),
      },
    });

    assert.equal(pubRes.status, 200);
    const pubData = await pubRes.json();
    assert.equal(pubData.success, true);
    assert.equal(pubData.publishedVersion, 1);

    const snapshot = pubData.snapshot;
    assert.ok(snapshot, "Snapshot must exist");
    assert.ok(snapshot.pages.main, "Snapshot must include main page");
    assert.ok(snapshot.pages.product, "Snapshot must include product page");
    assert.ok(snapshot.pages.collection, "Snapshot must include collection page");
    assert.ok(snapshot.pages.cart, "Snapshot must include cart page");

    // Check custom settings persisted in snapshot
    const snapMainAnnouncement = snapshot.pages.main.sections.find((s: any) => s.type === "announcement_bar");
    assert.equal(snapMainAnnouncement?.settings?.text, "Custom Borka Main Announcement");
  });

  // 3. Rollback restores a prior snapshot
  test("Rollback restores a prior snapshot version", async () => {
    const draftV1 = buildDraftFromManifest(getManifest("viral-funnel"));
    const announcementV1 = draftV1.pages.main.sections.find((s) => s.type === "announcement_bar");
    if (announcementV1) announcementV1.settings.text = "Version 1 Announcement Text";

    // Save draft & publish V1
    await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({ templateId: "viral-funnel", draft: draftV1 }),
    });
    const pub1 = await app.request("/v1/theme/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
    });
    assert.equal((await pub1.json()).publishedVersion, 1);

    // Now edit to V2
    const draftV2 = buildDraftFromManifest(getManifest("viral-funnel"));
    const announcementV2 = draftV2.pages.main.sections.find((s) => s.type === "announcement_bar");
    if (announcementV2) announcementV2.settings.text = "Version 2 Changed Announcement";

    await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({ templateId: "viral-funnel", draft: draftV2 }),
    });
    const pub2 = await app.request("/v1/theme/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
    });
    assert.equal((await pub2.json()).publishedVersion, 2);

    // Rollback to version 1
    const rollRes = await app.request("/v1/theme/rollback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({ version: 1 }),
    });

    assert.equal(rollRes.status, 200);
    const rollData = await rollRes.json();
    assert.equal(rollData.success, true);
    assert.equal(rollData.restoredVersion, 1);
    assert.equal(rollData.publishedVersion, 3);

    const restoredSnap = rollData.snapshot;
    const restoredAnnouncement = restoredSnap.pages.main.sections.find((s: any) => s.type === "announcement_bar");
    assert.equal(restoredAnnouncement?.settings?.text, "Version 1 Announcement Text");
  });

  // 4. Template-switch quota returns 429 past the plan limit
  test("Template-switch quota returns 429 past plan limit for package_1", async () => {
    // package_1 allows 5 template switches per month.
    // Starting template: viral-funnel
    const templates = [
      "organic-food", // Switch 1
      "tech-gadget",  // Switch 2
      "multi-campaign", // Switch 3
      "organic-food", // Switch 4
      "tech-gadget",  // Switch 5 (last allowed)
      "organic-food", // Switch 6 (should be rejected with 429)
    ];

    for (let i = 0; i < 5; i++) {
      const target = templates[i];
      const draft = buildDraftFromManifest(getManifest(target));
      const res = await app.request("/v1/theme/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
        },
        body: JSON.stringify({
          templateId: target,
          draft,
        }),
      });
      assert.equal(res.status, 200, `Switch ${i + 1} to ${target} should succeed`);
    }

    // 6th switch should trigger 429
    const target6 = templates[5];
    const draft6 = buildDraftFromManifest(getManifest(target6));
    const res6 = await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({
        templateId: target6,
        draft: draft6,
      }),
    });

    assert.equal(res6.status, 429);
    const data6 = await res6.json();
    assert.equal(data6.status, 429);
    assert.ok(data6.detail.includes("টেমপ্লেট পরিবর্তন"));
  });

  // 5. Store isolation: Store A cannot read or write Store B's theme
  test("Multi-tenancy isolation: Store A cannot read or write Store B's theme", async () => {
    // Store A saves a draft
    const draftA = buildDraftFromManifest(getManifest("viral-funnel"));
    const announcementA = draftA.pages.main.sections.find((s) => s.type === "announcement_bar");
    if (announcementA) announcementA.settings.text = "Private Store A Secret Text";

    await app.request("/v1/theme/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-session": makeSessionHeader({ id: "user_p1" }, "owner", testStoreP1),
      },
      body: JSON.stringify({
        templateId: "viral-funnel",
        draft: draftA,
      }),
    });

    // Store B reads /v1/theme
    const resB = await app.request("/v1/theme", {
      headers: {
        "x-test-session": makeSessionHeader({ id: "user_other" }, "owner", testStoreOther),
      },
    });

    assert.equal(resB.status, 200);
    const dataB = await resB.json();
    assert.equal(dataB.theme.storeId, testStoreOther.id);

    // Store B's draft should NOT have Store A's secret text
    const textB = JSON.stringify(dataB.theme.draft);
    assert.ok(!textB.includes("Private Store A Secret Text"), "Store B must not see Store A's draft");
  });
});
