/**
 * Serves a store from its chosen gallery template's own markup.
 *
 * Most gallery templates are complete hand-built pages. For those the
 * storefront does not rebuild the design from generic sections — it renders
 * the original page with the merchant's texts and images swapped in, so the
 * live store is exactly what they previewed and customised.
 */
import { getTemplateSourceStatus, hasTemplatePage, renderTemplateHtml, templateCsp } from "@gocom/themes/html";
import type { StoreThemeRow } from "./load-store-theme.ts";
import { PREVIEW_HEADERS } from "./load-store-theme.ts";
import { previewFrameAncestors } from "./frame-ancestors.ts";

export interface TemplatePageRequest {
  store: { id: string; name: string; subdomain: string };
  themeRow: StoreThemeRow | null;
  /** Render the unpublished draft (verified dashboard preview only). */
  isEditor: boolean;
  /** Template page key; empty for the store's home page. */
  page?: string;
  /** The request URL, so draft-preview links keep their preview token. */
  url: URL;
}

/**
 * What a visitor should see: the published snapshot once there is one. A store
 * that has never published shows the design its owner picked, so the store
 * link works from the moment a template is chosen.
 */
function activeDesign(row: StoreThemeRow, isEditor: boolean): { templateId: string; html: any } {
  if (!isEditor && row.published?.templateId) {
    return { templateId: row.published.templateId, html: row.published.html };
  }
  return { templateId: row.templateId, html: row.draft?.html };
}

/**
 * Returns the rendered template page, or `null` when this store's design is a
 * section-engine template (the caller then renders it the usual way) or the
 * template has no such page.
 */
export function renderStoreTemplatePage(req: TemplatePageRequest): Response | null {
  if (!req.themeRow) return null;

  const { templateId, html } = activeDesign(req.themeRow, req.isEditor);
  if (getTemplateSourceStatus(templateId) !== "ok") return null;

  const page = req.page ?? "";
  if (!hasTemplatePage(templateId, page)) return null;

  const base = `/${req.store.subdomain}`;
  // Carry the signed preview query across template pages while editing.
  const suffix = req.isEditor ? req.url.search : "";

  const body = renderTemplateHtml(templateId, {
    page,
    mode: req.isEditor ? "draft" : "live",
    overrides: html?.pages?.[page || "index"] ?? null,
    checkoutUrl: `${base}/checkout`,
    pageUrl: (key) => (key ? `${base}/${key}` : base) + suffix,
    storeName: req.store.name,
  });
  if (body === null) return null;

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    // Recognised by middleware.ts, which otherwise applies the first-party page policy.
    "Content-Security-Policy": templateCsp(req.isEditor ? previewFrameAncestors() : "'self'"),
  });

  if (req.isEditor) {
    for (const [key, value] of Object.entries(PREVIEW_HEADERS)) headers.set(key, value);
  } else {
    headers.set("Cache-Control", "public, max-age=0, s-maxage=86400");
    headers.set("Cache-Tag", `s:${req.store.id},s:${req.store.id}:home,s:${req.store.id}:theme`);
  }

  return new Response(body, { status: 200, headers });
}
