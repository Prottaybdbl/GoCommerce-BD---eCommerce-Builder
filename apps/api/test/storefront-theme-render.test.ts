process.env.NODE_ENV = "test";
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "dev-unsafe-preview-secret-key-change-in-prod-32ch";
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { resolveTheme, getManifest, buildDraftFromManifest } from "@gocom/themes";
import {
  clearMockStoreThemes,
  setMockStoreTheme,
  signPreviewToken,
} from "@gocom/db";
import {
  loadStoreTheme,
  resolveThemeRequestContext,
  PREVIEW_HEADERS,
} from "../../storefront/src/lib/load-store-theme.ts";
import { verifyPreviewToken } from "../../storefront/src/lib/theme-preview.ts";

const testStore = {
  id: "60000000-0000-0000-0000-000000000001",
  organizationId: "org_storefront_render_test",
  name: "Storefront Render Store",
  subdomain: "render-test",
  phone: "+8801711000021",
  plan: "package_4",
  isActive: true,
  themeArchetype: "viral-funnel",
  themeConfig: { presetId: "rose-bold" },
};

const otherStore = {
  id: "60000000-0000-0000-0000-000000000002",
  organizationId: "org_storefront_other",
  name: "Other Store",
  subdomain: "other-store",
  phone: "+8801711000022",
  plan: "package_1",
  isActive: true,
  themeArchetype: "viral-funnel",
  themeConfig: {},
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

describe("Storefront Theme Rendering & Preview Isolation (apps/api/test/storefront-theme-render.test.ts)", () => {
  after(() => {
    setTimeout(() => process.exit(0), 100);
  });

  beforeEach(() => {
    clearMockStoreThemes();
  });

  // 1. Published snapshot reaches rendered output
  test("Published snapshot with edited headline reaches rendered output", async () => {
    const manifest = getManifest("viral-funnel");
    const publishedDraft = buildDraftFromManifest(manifest);

    // Edit the hero headline in published draft
    const heroSec = publishedDraft.pages.main.sections.find((s) => s.type === "hero_product");
    assert.ok(heroSec, "viral-funnel has hero_product");
    const editedHeadline = "এক্সক্লুসিভ অফার — সেরা মানের ব্লেন্ডার";
    heroSec.settings.headline = editedHeadline;

    const publishedSnapshot = {
      templateId: "viral-funnel",
      templateVersion: 1,
      preset: { id: "rose-bold", name: "Rose Bold" },
      shell: { maxWidth: "48rem", gutter: "1rem", rhythm: "1.5rem" },
      pages: {
        main: {
          shell: { maxWidth: "48rem", gutter: "1rem", rhythm: "1.5rem" },
          sections: publishedDraft.pages.main.sections,
        },
      },
      sections: publishedDraft.pages.main.sections,
      publishedAt: new Date().toISOString(),
    };

    // Store in database
    setMockStoreTheme(testStore.id, {
      storeId: testStore.id,
      templateId: "viral-funnel",
      templateVersion: 1,
      presetId: "rose-bold",
      tokenOverrides: {},
      globalSections: {},
      published: publishedSnapshot,
      draft: publishedDraft,
      publishedVersion: 1,
      draftRevision: 1,
    });

    // Storefront loads the theme row
    const themeRow = await loadStoreTheme(testStore.id);
    assert.ok(themeRow, "loadStoreTheme must return store theme row");
    assert.equal(themeRow.publishedVersion, 1);

    // Render as a public customer (isEditor: false)
    const resolved = resolveTheme(
      { ...testStore, ...themeRow, features: [] },
      { page: "main", isEditor: false }
    );

    const renderedHero = resolved.sections.find((s) => s.type === "hero_product");
    assert.ok(renderedHero, "Rendered output must include hero_product");
    assert.equal(
      renderedHero.settings.headline,
      editedHeadline,
      "Rendered headline must match the merchant's published edit"
    );
  });

  // 2. Draft is NOT served without a valid preview token
  test("Draft is NOT served without a valid HMAC preview token", async () => {
    const manifest = getManifest("viral-funnel");

    // Published snapshot with published headline
    const publishedDraft = buildDraftFromManifest(manifest);
    const pubHero = publishedDraft.pages.main.sections.find((s) => s.type === "hero_product");
    assert.ok(pubHero);
    pubHero.settings.headline = "Published Live Headline";

    // Draft with UNPUBLISHED work-in-progress headline
    const unpublishedDraft = buildDraftFromManifest(manifest);
    const draftHero = unpublishedDraft.pages.main.sections.find((s) => s.type === "hero_product");
    assert.ok(draftHero);
    draftHero.settings.headline = "Secret Work In Progress Headline";

    setMockStoreTheme(testStore.id, {
      storeId: testStore.id,
      templateId: "viral-funnel",
      templateVersion: 1,
      presetId: "rose-bold",
      tokenOverrides: {},
      globalSections: {},
      published: {
        templateId: "viral-funnel",
        templateVersion: 1,
        pages: { main: { sections: publishedDraft.pages.main.sections } },
        sections: publishedDraft.pages.main.sections,
      },
      draft: unpublishedDraft,
      publishedVersion: 1,
      draftRevision: 2,
    });

    const themeRow = await loadStoreTheme(testStore.id);
    assert.ok(themeRow);

    // Case A: Normal customer URL without preview parameter
    const normalUrl = new URL(`http://${testStore.subdomain}.gocom.local/`);
    const normalCtx = resolveThemeRequestContext(normalUrl, testStore.id);
    assert.equal(normalCtx.isEditor, false, "Normal request must not have isEditor=true");
    const normalResolved = resolveTheme(
      { ...testStore, ...themeRow, features: [] },
      { page: "main", isEditor: normalCtx.isEditor }
    );
    const normalHeadline = normalResolved.sections.find((s) => s.type === "hero_product")?.settings.headline;
    assert.equal(normalHeadline, "Published Live Headline", "Normal visitor sees live snapshot");

    // Case B: Tampered URL with ?preview=draft but no token
    const noTokenUrl = new URL(`http://${testStore.subdomain}.gocom.local/?preview=draft`);
    const noTokenCtx = resolveThemeRequestContext(noTokenUrl, testStore.id);
    assert.equal(noTokenCtx.isEditor, false, "Request without token must not grant draft access");
    const noTokenResolved = resolveTheme(
      { ...testStore, ...themeRow, features: [] },
      { page: "main", isEditor: noTokenCtx.isEditor }
    );
    assert.equal(
      noTokenResolved.sections.find((s) => s.type === "hero_product")?.settings.headline,
      "Published Live Headline"
    );

    // Case C: Tampered URL with bogus/invalid token
    const badTokenUrl = new URL(`http://${testStore.subdomain}.gocom.local/?preview=draft&t=invalid-fake-token`);
    const badTokenCtx = resolveThemeRequestContext(badTokenUrl, testStore.id);
    assert.equal(badTokenCtx.isEditor, false, "Invalid token must not grant draft access");

    // Case D: Valid token issued for a DIFFERENT store
    const otherStoreToken = signPreviewToken(otherStore.id);
    const crossStoreUrl = new URL(
      `http://${testStore.subdomain}.gocom.local/?preview=draft&t=${encodeURIComponent(otherStoreToken)}`
    );
    const crossStoreCtx = resolveThemeRequestContext(crossStoreUrl, testStore.id);
    assert.equal(crossStoreCtx.isEditor, false, "Token for other store must not grant access to this store");

    // Case E: Valid token minted for this store
    const validToken = signPreviewToken(testStore.id);
    const authorizedUrl = new URL(
      `http://${testStore.subdomain}.gocom.local/?preview=draft&t=${encodeURIComponent(validToken)}`
    );
    const authorizedCtx = resolveThemeRequestContext(authorizedUrl, testStore.id);
    assert.equal(authorizedCtx.isEditor, true, "Valid HMAC token grants draft preview access");

    const draftResolved = resolveTheme(
      { ...testStore, ...themeRow, features: [] },
      { page: "main", isEditor: authorizedCtx.isEditor }
    );
    const draftHeadline = draftResolved.sections.find((s) => s.type === "hero_product")?.settings.headline;
    assert.equal(draftHeadline, "Secret Work In Progress Headline", "Authorized preview serves draft edits");
  });

  // 3. Preview responses carry no-store and still set no Set-Cookie (Invariant #8)
  test("Preview responses carry no-store and Invariant #8 prevents Set-Cookie", async () => {
    // A. Preview headers verify
    assert.ok(
      PREVIEW_HEADERS["Cache-Control"]?.includes("no-store"),
      "Preview header must include no-store"
    );
    assert.ok(
      PREVIEW_HEADERS["X-Robots-Tag"]?.includes("noindex"),
      "Preview header must include noindex"
    );

    // B. Mint preview token endpoint from API
    const tokenRes = await app.request("/v1/theme/preview-token", {
      method: "POST",
      headers: {
        "x-test-session": makeSessionHeader({ id: "user_owner" }, "owner", testStore),
      },
    });

    assert.equal(tokenRes.status, 200);
    const tokenData = await tokenRes.json();
    assert.equal(tokenData.success, true);
    assert.ok(tokenData.token, "Token must be returned");
    assert.ok(tokenData.previewUrl.includes("preview=draft"), "Preview URL must contain preview=draft");

    // Token verifies correctly
    const verifiedStoreId = verifyPreviewToken(tokenData.token);
    assert.equal(verifiedStoreId, testStore.id, "Token must verify to testStore.id");

    // C. Storefront public endpoint guarantees zero Set-Cookie (Invariant #8)
    const sfRes = await app.request("/api/storefront/config", {
      headers: {
        Host: `${testStore.subdomain}.gocommercebd.online`,
      },
    });

    assert.equal(
      sfRes.headers.get("set-cookie"),
      null,
      "Invariant #8: Storefront response must NEVER include Set-Cookie header"
    );
  });
});
