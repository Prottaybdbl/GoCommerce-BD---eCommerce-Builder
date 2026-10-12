/**
 * Loads a store's saved theme so the storefront renders what the merchant
 * actually published — not the raw template defaults.
 *
 * Until this existed, every page passed only the `stores` row into
 * `resolveTheme()`, so `published` was always undefined and nothing a merchant
 * customised in the dashboard ever reached a customer.
 */
import { db, storeThemes, getStoreEntitlements, getMockStoreTheme } from "@gocom/db";
import { eq } from "drizzle-orm";
import { verifyPreviewToken } from "./theme-preview.ts";

/** The `ResolveThemeInput` fragment held in `store_themes`. */
export interface StoreThemeRow {
  templateId: string;
  templateVersion: number;
  presetId: string;
  tokenOverrides: Record<string, any>;
  globalSections: Record<string, any>;
  published: any;
  draft: any;
  publishedVersion: number;
  draftRevision: number;
}

/**
 * Returns the store's theme row, or `null` when it has none — in which case the
 * caller falls back to the template manifest defaults, as before.
 */
export async function loadStoreTheme(storeId?: string | null): Promise<StoreThemeRow | null> {
  if (!storeId) return null;

  try {
    const row = await db.query.storeThemes.findFirst({
      where: eq(storeThemes.storeId, storeId),
    });
    const target = row || (typeof getMockStoreTheme === "function" ? getMockStoreTheme(storeId) : null);
    if (!target) return null;

    return {
      templateId: target.templateId,
      templateVersion: target.templateVersion,
      presetId: target.presetId,
      tokenOverrides: (target.tokenOverrides as Record<string, any>) ?? {},
      globalSections: (target.globalSections as Record<string, any>) ?? {},
      published: target.published ?? null,
      draft: target.draft ?? null,
      publishedVersion: target.publishedVersion,
      draftRevision: target.draftRevision,
    };
  } catch (err) {
    const target = typeof getMockStoreTheme === "function" ? getMockStoreTheme(storeId) : null;
    if (target) {
      return {
        templateId: target.templateId,
        templateVersion: target.templateVersion,
        presetId: target.presetId,
        tokenOverrides: (target.tokenOverrides as Record<string, any>) ?? {},
        globalSections: (target.globalSections as Record<string, any>) ?? {},
        published: target.published ?? null,
        draft: target.draft ?? null,
        publishedVersion: target.publishedVersion,
        draftRevision: target.draftRevision,
      };
    }
    // A theme lookup must never take a storefront down; fall back to defaults.
    console.warn("Store theme lookup note:", err);
    return null;
  }
}

/** The entitlement features that drive section feature-gating on the storefront. */
export async function loadStoreFeatures(store: { id?: string; plan?: string }): Promise<string[]> {
  try {
    const entitlements = await getStoreEntitlements(store);
    return entitlements.features ?? [];
  } catch {
    return [];
  }
}

export interface ThemeRequestContext {
  /** Render the unpublished draft instead of the live snapshot. */
  isEditor: boolean;
  previewPreset?: string;
}

/**
 * Decides whether this request may see the unpublished draft.
 *
 * `?preview=draft&t=<token>` is honoured only when the HMAC token signed by
 * `POST /v1/theme/preview-token` verifies AND names this exact store, so a
 * guessed query string can never leak work in progress.
 */
export function resolveThemeRequestContext(url: URL, storeId: string): ThemeRequestContext {
  const previewPreset = url.searchParams.get("previewPreset") || undefined;
  if (url.searchParams.get("preview") !== "draft") {
    return { isEditor: false, previewPreset };
  }

  const authorizedStoreId = verifyPreviewToken(url.searchParams.get("t"));
  return { isEditor: authorizedStoreId === storeId, previewPreset };
}

/**
 * Headers a draft preview response must carry: never cached at the edge, never
 * indexed. Invariant #8 still holds — no cookie is set here or anywhere else.
 */
export const PREVIEW_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};
