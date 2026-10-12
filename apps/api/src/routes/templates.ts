import { Hono } from "hono";
import fs from "node:fs";
import { getAllManifests } from "@gocom/themes";
import {
  getTemplateCategory,
  getTemplateSlots,
  getTemplateSourceStatus,
  hasTemplatePage,
  listTemplatePages,
  templateCsp,
  ORIGIN_ASSET_PREFIX,
} from "@gocom/themes/html";
import {
  TEMPLATE_REGISTRY,
  getTemplatePreview,
  resolveTemplateAssetPath,
  getMimeType,
} from "../services/template-preview.js";
import { getMirroredAsset } from "../services/template-origin-cache.js";
import { config } from "../config.js";

export const templatesRouter = new Hono();

/**
 * Gallery facts about a template that come from its source on disk rather than
 * from its manifest: which tab it belongs to, and whether its real design can
 * be previewed and used yet.
 */
export function describeTemplateSource(templateId: string) {
  const info = TEMPLATE_REGISTRY[templateId];
  const sourceStatus = getTemplateSourceStatus(templateId);
  // Built from sections rather than from a captured page: the five archetypes,
  // and the shop-tier designs whose own pages have not been added to `templets/` yet.
  const isSectionEngine = Boolean(info) && sourceStatus === "missing" && (!info.categoryDir || info.tier === "shop");
  return {
    category: getTemplateCategory(templateId),
    /** "html" templates render their own markup; "sections" ones are built from the section engine. */
    renderMode: sourceStatus === "ok" ? ("html" as const) : ("sections" as const),
    isAvailable: sourceStatus === "ok" || isSectionEngine,
    /** Sub-pages of a multi-page HTML template. Not `pages`: a manifest already has that key. */
    htmlPages: sourceStatus === "ok" ? listTemplatePages(templateId) : [],
    previewUrl: `/api/templates/${templateId}/preview`,
  };
}

/** Who may embed a template preview: the dashboard and the platform's own pages. */
function previewFrameAncestors(): string {
  const root = config.PLATFORM_ROOT_DOMAIN;
  const origins = ["'self'", `https://${root}`, `https://www.${root}`, `https://app.${root}`];
  if (config.NODE_ENV !== "production") origins.push("http://localhost:*", "http://127.0.0.1:*");
  return origins.join(" ");
}

/**
 * GET /api/templates — Returns directory of all templates with metadata
 */
templatesRouter.get("/templates", async (c) => {
  const manifests = getAllManifests();
  const manifestMap = new Map(manifests.map((m) => [m.id, m]));

  const templatesList = Object.keys(TEMPLATE_REGISTRY).map((id) => {
    const reg = TEMPLATE_REGISTRY[id];
    const manifest = manifestMap.get(id);

    return {
      id,
      name: manifest?.name || reg.name,
      banglaName: manifest?.banglaName || reg.banglaName,
      description: manifest?.description || "High-conversion eCommerce template",
      banglaDescription: manifest?.banglaDescription || "হাই-কনভার্সন ই-কমার্স টেমপ্লেট",
      tier: reg.tier,
      archetype: reg.archetype,
      tags: manifest?.tags || ["ecommerce", "fast", "mobile"],
      bestFor: manifest?.bestFor || ["সকল প্রোডাক্ট", "অনলাইন শপ"],
      gallery: manifest?.gallery || { accent: "#2563EB", thumb: "", aspect: "16/9" },
      shell: manifest?.shell || "narrow-funnel",
      ...describeTemplateSource(id),
      isUnlocked: true,
      canPreview: true,
    };
  });

  return c.json({
    success: true,
    total: templatesList.length,
    templates: templatesList,
  });
});

/**
 * GET /api/templates/:templateId/preview — Serves the template's real page.
 *
 * Template markup carries scripts from the sites the designs were built on, and
 * this route is served from the dashboard's own origin. The `sandbox` CSP puts
 * the document in an opaque origin so those scripts cannot read the merchant's
 * session, whether the page is framed or opened directly.
 */
templatesRouter.get("/templates/:templateId/preview", async (c) => {
  const templateId = c.req.param("templateId");
  const preview = getTemplatePreview(templateId, c.req.query("page"));

  if (!preview) {
    return c.text(`Template '${templateId}' not found.`, 404);
  }

  c.header("Content-Type", "text/html; charset=utf-8");
  c.header("Content-Security-Policy", templateCsp(previewFrameAncestors()));
  c.header("Cache-Control", "public, max-age=300");

  return c.html(preview.html);
});

/**
 * GET /api/templates/:templateId/fields — The texts and images a merchant can
 * replace on one page of a template, in document order. Public: it describes
 * the template, not any store.
 */
templatesRouter.get("/templates/:templateId/fields", async (c) => {
  const templateId = c.req.param("templateId");
  const page = c.req.query("page") || "";

  if (getTemplateSourceStatus(templateId) !== "ok" || !hasTemplatePage(templateId, page)) {
    return c.json(
      {
        type: "https://httpstatuses.com/404",
        title: "Template Page Not Found",
        status: 404,
        detail: `Template '${templateId}' has no editable page '${page || "index"}'.`,
      },
      404
    );
  }

  c.header("Cache-Control", "public, max-age=300");
  return c.json({
    success: true,
    templateId,
    page,
    pages: listTemplatePages(templateId),
    fields: getTemplateSlots(templateId, page),
  });
});

/**
 * Headers for anything served out of a template: assets are public and
 * long-lived, readable from the opaque origin template pages run in, and — if
 * one is ever opened directly as a document (an SVG can carry script) — inert.
 */
function setAssetHeaders(c: any, contentType: string): void {
  c.header("Content-Type", contentType);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'");
  c.header("Cache-Control", "public, max-age=604800");
}

/**
 * GET /api/templates/:templateId/_o/* — Mirror of an asset on the site the
 * template was captured from (see services/template-origin-cache.ts).
 */
templatesRouter.get(`/templates/:templateId/${ORIGIN_ASSET_PREFIX}/*`, async (c) => {
  const templateId = c.req.param("templateId");
  const url = new URL(c.req.url);
  const prefix = `/api/templates/${templateId}/${ORIGIN_ASSET_PREFIX}/`;
  const result = await getMirroredAsset(templateId, url.pathname.slice(prefix.length) + url.search);

  if (result.kind === "hit") {
    setAssetHeaders(c, result.asset.contentType);
    return c.body(await fs.promises.readFile(result.asset.filePath));
  }
  if (result.kind === "redirect") {
    c.header("Cache-Control", "no-store");
    return c.redirect(result.url, 302);
  }
  return c.text("Asset not found", 404);
});

/**
 * GET /api/templates/:templateId/* — Serves a static asset from the template's folder
 */
templatesRouter.get("/templates/:templateId/*", async (c) => {
  const templateId = c.req.param("templateId");
  const pathPart = c.req.path.replace(`/api/templates/${templateId}/`, "");

  const { localPath } = resolveTemplateAssetPath(templateId, pathPart);

  // Template pages are served as documents elsewhere; this route is assets only.
  if (localPath && !/\.html?$/i.test(localPath)) {
    setAssetHeaders(c, getMimeType(localPath));
    return c.body(await fs.promises.readFile(localPath));
  }

  return c.text("Asset not found", 404);
});
