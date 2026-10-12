process.env.NODE_ENV = "test";
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import { getManifest, buildDraftFromManifest } from "@gocom/themes";
import { getTemplateSlots } from "@gocom/themes/html";
import { clearMockStoreThemes, getMockStoreTheme } from "@gocom/db";
import * as dbSchema from "@gocom/db";
import { extractSessionToken } from "../src/middleware/auth.js";


const store = {
  id: "60000000-0000-0000-0000-000000000001",
  organizationId: "org_html_tpl",
  name: "Html Template Store",
  subdomain: "html-tpl",
  phone: "+8801711000021",
  plan: "package_4",
  isActive: true,
  themeArchetype: "viral-funnel",
  themeConfig: {},
};

const session = JSON.stringify({
  user: { id: "user_html", name: "Owner", email: "owner@test.com", role: "user" },
  session: { id: "sess_html", userId: "user_html", activeOrganizationId: store.organizationId, _testStore: store, _testRole: "owner" },
});

const post = (path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-session": session },
    body: JSON.stringify(body),
  });

describe("HTML templates: gallery, customisation and publish", () => {
  after(() => {
    setTimeout(() => process.exit(0), 100);
  });

  beforeEach(() => {
    clearMockStoreThemes();
  });

  test("gallery lists three categories and marks which designs are usable", async () => {
    const res = await app.request("/v1/templates", { headers: { "x-test-session": session } });
    assert.equal(res.status, 200);
    const { templates } = await res.json();

    const byId = new Map<string, any>(templates.map((t: any) => [t.id, t]));
    assert.deepEqual(
      [...new Set(templates.map((t: any) => t.category))].sort(),
      ["ecommerce", "multi-landing", "single-landing"]
    );

    assert.equal(byId.get("honey").category, "single-landing");
    assert.equal(byId.get("honey").renderMode, "html");
    assert.equal(byId.get("honey").isAvailable, true);
    assert.equal(byId.get("organik").category, "multi-landing");
    assert.ok(byId.get("organik").htmlPages.includes("about"));
    assert.equal(byId.get("viral-funnel").renderMode, "sections");
    assert.equal(byId.get("viral-funnel").isAvailable, true);
    // Shop designs without their own page yet still work, built from sections.
    assert.equal(byId.get("borkashop").renderMode, "sections");
    assert.equal(byId.get("borkashop").isAvailable, true);
    // An app shell with no markup of its own: listed, but not usable.
    assert.equal(byId.get("anjumanbd").isAvailable, false);

    // The manifest's own `pages` map must survive: the editor builds drafts from it.
    assert.equal(typeof byId.get("honey").pages, "object");
    assert.ok(!Array.isArray(byId.get("honey").pages));
  });

  test("preview serves the template's own page, sandboxed and frameable by the dashboard", async () => {
    const honey = await app.request("/api/templates/honey/preview");
    const headphone = await app.request("/api/templates/headphone/preview");
    assert.equal(honey.status, 200);

    const csp = honey.headers.get("content-security-policy") ?? "";
    assert.match(csp, /^sandbox /, "the route's own policy must survive the global security middleware");
    assert.ok(!csp.includes("allow-same-origin"));
    assert.ok(csp.includes("frame-ancestors"));
    assert.equal(honey.headers.get("x-frame-options"), null);

    const honeyHtml = await honey.text();
    assert.ok(honeyHtml.includes("/api/templates/honey/_o/wp-content/"));
    assert.notEqual(honeyHtml, await headphone.text(), "each template shows its own design");
  });

  test("ordinary API responses keep the strict default policy", async () => {
    const res = await app.request("/api/templates");
    const csp = res.headers.get("content-security-policy") ?? "";
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("frame-src"), "the dashboard may frame the storefront preview");
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  });

  test("fields endpoint lists a page's editable texts and images", async () => {
    const res = await app.request("/api/templates/honey/fields");
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.fields.some((f: any) => f.kind === "text"));
    assert.ok(data.fields.some((f: any) => f.kind === "image"));

    assert.equal((await app.request("/api/templates/organik/fields?page=about")).status, 200);
    assert.equal((await app.request("/api/templates/honey/fields?page=about")).status, 404);
    assert.equal((await app.request("/api/templates/viral-funnel/fields")).status, 404);
    assert.equal((await app.request("/api/templates/organik/fields?page=../honey/index")).status, 404);
  });

  test("template pages are never served as raw assets, and assets cannot leave the folder", async () => {
    assert.equal((await app.request("/api/templates/organik/about.html")).status, 404);
    assert.equal((await app.request("/api/templates/organik/admin/login.html")).status, 404);
    assert.equal((await app.request("/api/templates/organik/..%2F..%2F..%2Fpackage.json")).status, 404);

    const css = await app.request("/api/templates/organik/assets/styles-DmgeGJ2G.css");
    assert.equal(css.status, 200);
    assert.equal(css.headers.get("access-control-allow-origin"), "*");
    assert.match(css.headers.get("content-security-policy") ?? "", /^sandbox/);
  });

  test("choosing a template, editing its content and publishing carries the edits to the live snapshot", async () => {
    const slots = getTemplateSlots("honey");
    const text = slots.find((s) => s.kind === "text" && s.id !== "title")!;
    const image = slots.find((s) => s.kind === "image")!;

    const draft: any = buildDraftFromManifest(getManifest("honey"));
    draft.html = {
      pages: {
        index: {
          text: { [text.id]: "আমার নিজের শিরোনাম", t999999: "stale slot" },
          image: { [image.id]: "https://cdn.example.com/my-honey.webp", i999999: "javascript:alert(1)" },
        },
      },
    };

    const saved = await post("/v1/theme/draft", { templateId: "honey", draft });
    assert.equal(saved.status, 200);

    const row = getMockStoreTheme(store.id);
    assert.equal(row.templateId, "honey");
    assert.deepEqual(row.draft.html.pages.index.text, { [text.id]: "আমার নিজের শিরোনাম" });
    assert.deepEqual(row.draft.html.pages.index.image, { [image.id]: "https://cdn.example.com/my-honey.webp" });

    const published = await post("/v1/theme/publish", {});
    assert.equal(published.status, 200);
    const body = await published.json();
    assert.equal(body.snapshot.templateId, "honey");
    assert.equal(body.snapshot.renderMode, "html");
    assert.equal(body.snapshot.html.pages.index.text[text.id], "আমার নিজের শিরোনাম");
    assert.ok(body.liveUrl.endsWith("/html-tpl"), "publish returns the store's own link");
  });

  test("the editor is told how the active template renders", async () => {
    await post("/v1/theme/draft", { templateId: "organik", draft: buildDraftFromManifest(getManifest("organik")) });
    const res = await app.request("/v1/theme", { headers: { "x-test-session": session } });
    const data = await res.json();
    assert.equal(data.templateSource.renderMode, "html");
    assert.equal(data.templateSource.category, "multi-landing");
    assert.ok(data.templateSource.htmlPages.includes("shop"));
  });

  test("a design that is not available yet cannot be switched to", async () => {
    const res = await post("/v1/theme/draft", {
      templateId: "anjumanbd",
      draft: buildDraftFromManifest(getManifest("anjumanbd")),
    });
    assert.equal(res.status, 409);
    assert.equal(getMockStoreTheme(store.id), null);
  });

  test("section-engine templates carry no HTML layer", async () => {
    const draft: any = buildDraftFromManifest(getManifest("viral-funnel"));
    draft.html = { pages: { index: { text: { t1: "x" } } } };
    assert.equal((await post("/v1/theme/draft", { templateId: "viral-funnel", draft })).status, 200);
    assert.equal(getMockStoreTheme(store.id).draft.html, undefined);
  });
});

describe("Merchant session resolution", () => {
  test("session rows can be joined to their user (the relation the auth fallback relied on)", () => {
    assert.ok((dbSchema as any).sessionRelations, "sessionRelations must be defined");
  });

  test("reads the token from a bearer header or either session cookie form", () => {
    assert.equal(extractSessionToken("Bearer abc123", null), "abc123");
    assert.equal(extractSessionToken(null, "foo=1; better-auth.session_token=tok.sig; bar=2"), "tok");
    assert.equal(extractSessionToken(null, "__Secure-better-auth.session_token=tok2.sig%3D"), "tok2");
    assert.equal(extractSessionToken(null, "gocom_logged_in=1"), null);
    assert.equal(extractSessionToken("Basic xyz", ""), null);
  });

  test("a merchant request without a session is still refused", async () => {
    const res = await app.request("/v1/theme/publish", { method: "POST" });
    assert.equal(res.status, 401);
  });
});
