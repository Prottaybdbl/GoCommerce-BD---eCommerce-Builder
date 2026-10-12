import { config } from "../config.js";

/**
 * Cloudflare Edge Cache Service
 * Invariant #8: Storefront Performance & Hygiene:
 * - Cacheable storefront responses are cached at Cloudflare Edge (s-maxage=86400)
 * - Cache tags enable sub-second invalidation when merchants update products or themes
 * - Set-Cookie is strictly forbidden on cacheable pages
 */

// In-memory record of purges for test verification and telemetry (capped at 100 to prevent memory leaks)
const MAX_PURGE_HISTORY = 100;
export const cachePurgeHistory: Array<{
  storeId: string;
  tags: string[];
  timestamp: Date;
  status: "dispatched" | "skipped_no_creds" | "mocked";
}> = [];

function recordPurgeHistory(entry: (typeof cachePurgeHistory)[0]) {
  cachePurgeHistory.push(entry);
  if (cachePurgeHistory.length > MAX_PURGE_HISTORY) {
    cachePurgeHistory.shift();
  }
}

export interface PurgeOptions {
  tags?: string[];
}

/**
 * Purges Cloudflare edge cache by tag for a specific store.
 * e.g., on product update, theme update, or store settings edit.
 */
export async function purgeStoreCache(
  storeId: string,
  options: PurgeOptions | string[] = {}
): Promise<{ success: boolean; purgedTags: string[]; status: string }> {
  const defaultTags = [`s:${storeId}`, `s:${storeId}:home`, `s:${storeId}:products`];
  const providedTags = Array.isArray(options) ? options : options.tags;
  const targetTags = providedTags
    ? providedTags.map((t) => (t.startsWith("s:") ? t : `s:${storeId}:${t}`))
    : defaultTags;

  if (process.env.NODE_ENV === "test") {
    recordPurgeHistory({
      storeId,
      tags: targetTags,
      timestamp: new Date(),
      status: "mocked",
    });
    return { success: true, purgedTags: targetTags, status: "mocked" };
  }

  if (!config.CLOUDFLARE_ZONE_ID || !config.CLOUDFLARE_API_TOKEN) {
    recordPurgeHistory({
      storeId,
      tags: targetTags,
      timestamp: new Date(),
      status: "skipped_no_creds",
    });
    return {
      success: true,
      purgedTags: targetTags,
      status: "skipped_no_creds",
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${config.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags: targetTags }),
      }
    );

    const json = (await response.json()) as any;
    const success = Boolean(json?.success);

    recordPurgeHistory({
      storeId,
      tags: targetTags,
      timestamp: new Date(),
      status: success ? "dispatched" : "skipped_no_creds",
    });

    return {
      success,
      purgedTags: targetTags,
      status: success ? "dispatched" : "error",
    };
  } catch (err: any) {
    console.error(`[EdgeCache] Purge failed for store ${storeId}:`, err);
    return {
      success: false,
      purgedTags: targetTags,
      status: `error: ${err.message}`,
    };
  }
}

/**
 * Standard edge caching headers for storefront and public catalog responses
 */
export function getStorefrontCacheHeaders(
  storeId: string,
  options: {
    maxAge?: number;
    sMaxAge?: number;
    tags?: string[];
  } = {}
): Record<string, string> {
  const { maxAge = 0, sMaxAge = 86400, tags = ["home", "products"] } = options;

  const tagList = [`s:${storeId}`, ...tags.map((t) => (t.startsWith("s:") ? t : `s:${storeId}:${t}`))];

  return {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=600`,
    "Cache-Tag": tagList.join(","),
  };
}

/**
 * Invariant #8 Checker: Validates that response does NOT include Set-Cookie
 */
export function validateStorefrontHygiene(headers: Headers | Record<string, string>): boolean {
  if (headers instanceof Headers) {
    return !headers.has("set-cookie");
  }
  const keys = Object.keys(headers).map((k) => k.toLowerCase());
  return !keys.includes("set-cookie");
}
