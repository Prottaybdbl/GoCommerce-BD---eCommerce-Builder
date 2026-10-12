/**
 * Mirror of the assets (stylesheets, scripts, fonts, images) that gallery
 * templates reference on the sites they were captured from.
 *
 * Each asset is fetched from its source site once, written to a disk cache and
 * served from here afterwards — so a template keeps working when its source
 * site is slow or gone, and web fonts (which browsers only load cross-origin
 * with CORS headers those sites do not send) load at all.
 *
 * Only hosts named in the template registry are ever contacted, and only
 * static asset types are stored, so this cannot be used as an open proxy.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { resolveOriginAssetUrl, rewriteMirroredCss } from "@gocom/themes/html";

const CACHE_DIR = process.env.TEMPLATE_CACHE_DIR || path.join(os.tmpdir(), "gocom-template-cache");
const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const MAX_CACHED_ASSETS = 20_000;
const FETCH_TIMEOUT_MS = 20_000;
const FAILURE_TTL_MS = 5 * 60_000;

/** Extension → served type. The source's own Content-Type is not trusted: this list is the allowlist. */
const ASSET_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export interface MirroredAsset {
  filePath: string;
  contentType: string;
}

export type MirrorResult =
  | { kind: "hit"; asset: MirroredAsset }
  /** Could not be mirrored right now; the browser may still fetch it from the source directly. */
  | { kind: "redirect"; url: string }
  | { kind: "not_found" };

const inFlight = new Map<string, Promise<MirrorResult>>();
const recentFailures = new Map<string, number>();
let cachedCount: number | null = null;

function cachePathFor(templateId: string, url: URL, ext: string): string {
  const hash = createHash("sha1").update(url.toString()).digest("hex");
  return path.join(CACHE_DIR, templateId, `${hash}${ext}`);
}

async function countCached(): Promise<number> {
  if (cachedCount !== null) return cachedCount;
  let total = 0;
  try {
    for (const dir of await fs.promises.readdir(CACHE_DIR)) {
      total += (await fs.promises.readdir(path.join(CACHE_DIR, dir))).length;
    }
  } catch {
    // no cache yet
  }
  cachedCount = total;
  return total;
}

async function fetchAndStore(templateId: string, url: URL, filePath: string, contentType: string): Promise<MirrorResult> {
  const fallback: MirrorResult = { kind: "redirect", url: url.toString() };

  const failedAt = recentFailures.get(url.toString());
  if (failedAt && Date.now() - failedAt < FAILURE_TTL_MS) return fallback;
  if ((await countCached()) >= MAX_CACHED_ASSETS) return fallback;

  try {
    const res = await fetch(url, {
      // A redirect could leave the allowlisted host; the source's canonical URLs do not need one.
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "*/*", "User-Agent": "GoCommerceBD-TemplateMirror/1.0" },
    });

    if (res.status === 404 || res.status === 410) return { kind: "not_found" };
    if (!res.ok || !res.body) throw new Error(`upstream ${res.status}`);

    const declared = Number(res.headers.get("content-length") || 0);
    // An HTML body means an error or login page was returned in place of the asset.
    if (declared > MAX_ASSET_BYTES || /text\/html/i.test(res.headers.get("content-type") || "")) {
      throw new Error("unusable upstream response");
    }

    let body = Buffer.from(await res.arrayBuffer());
    if (body.byteLength > MAX_ASSET_BYTES) throw new Error("asset too large");
    if (contentType.startsWith("text/css")) {
      body = Buffer.from(rewriteMirroredCss(templateId, body.toString("utf-8")), "utf-8");
    }

    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    // Write-then-rename so a concurrent reader never sees a half-written asset.
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmp, body);
    await fs.promises.rename(tmp, filePath);
    if (cachedCount !== null) cachedCount += 1;

    return { kind: "hit", asset: { filePath, contentType } };
  } catch {
    recentFailures.set(url.toString(), Date.now());
    if (recentFailures.size > 5000) recentFailures.clear();
    return fallback;
  }
}

/**
 * Returns the mirrored copy of `pathAndQuery` on a template's source site,
 * fetching it on first use.
 */
export async function getMirroredAsset(templateId: string, pathAndQuery: string): Promise<MirrorResult> {
  const url = resolveOriginAssetUrl(templateId, pathAndQuery);
  if (!url) return { kind: "not_found" };

  const ext = path.extname(url.pathname).toLowerCase();
  const contentType = ASSET_TYPES[ext];
  if (!contentType) return { kind: "not_found" };

  const filePath = cachePathFor(templateId, url, ext);
  try {
    if ((await fs.promises.stat(filePath)).isFile()) return { kind: "hit", asset: { filePath, contentType } };
  } catch {
    // not cached yet
  }

  const key = url.toString();
  let pending = inFlight.get(key);
  if (!pending) {
    pending = fetchAndStore(templateId, url, filePath, contentType).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}
