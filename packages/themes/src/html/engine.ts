/**
 * HTML template engine (node-only).
 *
 * Gallery templates are complete, hand-built pages kept under `templets/`.
 * Rather than approximating them with generic sections, the storefront serves
 * the original markup — so a merchant gets exactly the layout they previewed —
 * and lets them replace its texts and images.
 *
 * A template file is parsed once into a list of string chunks with "holes" for
 * everything that varies per store (editable texts, images, links). Rendering a
 * page is then a plain join, with no HTML parsing on the request path.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { parse, serialize } from "parse5";
import { TEMPLATE_REGISTRY, type TemplateDiskInfo } from "./registry.js";
import { buildBootScript, buildRuntimeScript, type RuntimeConfig } from "./client-script.js";

export type TemplateRenderMode = "preview" | "draft" | "live";

/** One merchant-editable piece of a template page. */
export interface TemplateSlot {
  id: string;
  kind: "text" | "image";
  /** Tag of the element that holds it, e.g. `h2`, `a`, `img`. */
  tag: string;
  /** The template's own value: plain text, or the image URL. */
  value: string;
  multiline?: boolean;
}

export interface TemplatePageOverrides {
  text?: Record<string, string>;
  image?: Record<string, string>;
}

export interface RenderTemplateOptions {
  /** Page key: "" (or "index") for the entry page, else e.g. "about". */
  page?: string;
  mode: TemplateRenderMode;
  overrides?: TemplatePageOverrides | null;
  /** Where order / buy / cart buttons lead. */
  checkoutUrl: string;
  /** URL of the given template page for this store. */
  pageUrl: (pageKey: string) => string;
  /** Used as the document title unless the merchant set one. */
  storeName?: string;
}

export type TemplateSourceStatus = "ok" | "missing" | "unsupported";

type Hole =
  | { type: "html"; slot: string; orig: string }
  | { type: "textnode"; slot: string; orig: string }
  | { type: "title"; slot: string; orig: string }
  | { type: "img"; slot: string; orig: string }
  | { type: "imgaux"; slot: string; orig: string }
  | { type: "page"; key: string }
  | { type: "checkout" }
  | { type: "boot" }
  | { type: "runtime" };

interface PreparedPage {
  chunks: Array<string | number>;
  holes: Hole[];
  slots: TemplateSlot[];
  mtimeMs: number;
}

// ---------------------------------------------------------------------------
// Locating templates on disk
// ---------------------------------------------------------------------------

let cachedRoot: string | null | undefined;

/**
 * The `templets/` directory: `TEMPLATES_DIR` when set, otherwise the nearest
 * `templets` folder walking up from the working directory (repo root in dev,
 * `/app` in the containers).
 */
export function getTemplatesRoot(): string | null {
  if (cachedRoot !== undefined) return cachedRoot;

  const candidates: string[] = [];
  if (process.env.TEMPLATES_DIR) candidates.push(process.env.TEMPLATES_DIR);

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    candidates.push(path.join(dir, "templets"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  cachedRoot = candidates.find((c) => {
    try {
      return fs.statSync(c).isDirectory();
    } catch {
      return false;
    }
  }) ?? null;
  return cachedRoot;
}

/** Test hook: forget the resolved root and every prepared page. */
export function resetTemplateCache(): void {
  cachedRoot = undefined;
  prepared.clear();
  statusCache.clear();
}

export function getTemplateDir(templateId: string): string | null {
  const info = TEMPLATE_REGISTRY[templateId];
  const root = getTemplatesRoot();
  if (!info?.categoryDir || !info.subPath || !root) return null;
  return path.join(root, info.categoryDir, info.subPath);
}

function normalizePageKey(page?: string | null): string {
  const key = (page ?? "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\.html?$/i, "");
  return key === "index" ? "" : key;
}

/**
 * Page keys are a single plain segment: no traversal, and nothing from a
 * sub-folder of the capture (some carry the source site's admin pages).
 */
function isSafePageKey(key: string): boolean {
  return key === "" || /^[a-z0-9][a-z0-9_-]*$/i.test(key);
}

function pageFile(info: TemplateDiskInfo, dir: string, pageKey: string): string | null {
  if (!isSafePageKey(pageKey)) return null;
  const file = pageKey === "" ? path.join(dir, info.entryFile || "index.html") : path.join(dir, `${pageKey}.html`);
  if (!file.startsWith(dir + path.sep)) return null;
  try {
    return fs.statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

/** Sub-pages a multi-page template ships (entry page excluded), e.g. `["about", "shop"]`. */
export function listTemplatePages(templateId: string): string[] {
  const info = TEMPLATE_REGISTRY[templateId];
  const dir = getTemplateDir(templateId);
  if (!info || !dir) return [];

  const entry = (info.entryFile || "index.html").toLowerCase();
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.html$/i.test(e.name))
      .map((e) => e.name)
      // wget names query-string variants `index.html@p=1.html`; they are not pages.
      .filter((name) => name.toLowerCase() !== entry && !name.includes("@"))
      .map((name) => name.replace(/\.html$/i, ""))
      .filter(isSafePageKey)
      .sort();
  } catch {
    return [];
  }
}

const statusCache = new Map<string, TemplateSourceStatus>();

/**
 * Whether a template's original markup can be served:
 * - `missing`     — no source folder on disk (section-engine archetypes, or a
 *                   design that has not been added to `templets/` yet);
 * - `unsupported` — the source is an empty single-page-app shell whose content
 *                   only exists after its own backend responds;
 * - `ok`          — real markup we can render and customise.
 */
export function getTemplateSourceStatus(templateId: string): TemplateSourceStatus {
  const hit = statusCache.get(templateId);
  if (hit) return hit;

  let status: TemplateSourceStatus = "missing";
  const info = TEMPLATE_REGISTRY[templateId];
  const dir = getTemplateDir(templateId);
  if (info && dir && pageFile(info, dir, "")) {
    try {
      status = preparePage(templateId, "").slots.length >= 3 ? "ok" : "unsupported";
    } catch {
      status = "unsupported";
    }
  }
  statusCache.set(templateId, status);
  return status;
}

/** Resolves a template-local asset request to a file inside the template folder. */
export function resolveTemplateAsset(templateId: string, subPath: string): string | null {
  const dir = getTemplateDir(templateId);
  if (!dir) return null;

  let clean: string;
  try {
    clean = decodeURIComponent(subPath).replace(/^\/+/, "");
  } catch {
    return null;
  }
  const target = path.resolve(dir, clean);
  if (!target.startsWith(dir + path.sep)) return null;
  try {
    return fs.statSync(target).isFile() ? target : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Preparing a page
// ---------------------------------------------------------------------------

const SKIP_TAGS = new Set([
  "script", "style", "noscript", "svg", "template", "select", "option", "textarea",
  "iframe", "code", "pre", "math", "object", "canvas", "video", "audio", "head",
]);
/** Pure-emphasis tags: an element holding only text and these is edited as one field. */
const EMPHASIS_TAGS = new Set(["br", "b", "strong", "i", "em", "u"]);
const MEANINGFUL = /[\p{L}\p{N}]/u;

/** Third-party trackers and the source site's own shop plumbing: never shipped to a merchant's store. */
const STRIP_SCRIPT = new RegExp(
  [
    "googletagmanager", "google-analytics", "gtag\\(", "fbq\\(", "connect\\.facebook\\.net", "fbevents",
    "clarity\\.ms", "hotjar", "analytics\\.tiktok", "ttq\\.", "snaptr\\(", "fbpixel", "facebook-pixel", "pixelyoursite", "pixel[_-]id",
    "cartflows", "wc-ajax", "wc_cart_fragments", "cart-fragments", "add-to-cart", "wc-checkout",
    "checkout\\.min\\.js", "order-attribution", "sourcebuster", "country-select", "address-i18n",
    "password-strength", "zxcvbn", "email-decode", "cdn-cgi", "wc-popup-order",
    "woocommerce\\.min\\.js", "selectWoo", "custom-place-order", "wcf_", "wc_checkout_params",
    "serviceWorker", "cloudflareinsights",
  ].join("|"),
  "i"
);
const STRIP_LINK_REL = /^(alternate|canonical|edituri|shortlink|pingback|profile|dns-prefetch|preconnect|manifest|wlwmanifest|https:\/\/api\.w\.org\/|modulepreload)$/i;
const COMMERCE_LINK = /(checkout|cart|add[-_]to[-_]cart|order|buy|product|shop|category|collection|wishlist|my-account|track)/i;

type Node = any;

const attr = (el: Node, name: string): string | undefined =>
  el.attrs?.find((a: any) => a.name === name)?.value;

function setAttr(el: Node, name: string, value: string): void {
  const hit = el.attrs.find((a: any) => a.name === name);
  if (hit) hit.value = value;
  else el.attrs.push({ name, value });
}

function removeAttr(el: Node, name: string): void {
  el.attrs = el.attrs.filter((a: any) => a.name !== name);
}

const isElement = (n: Node): boolean => Array.isArray(n?.attrs);
const isText = (n: Node): boolean => n?.nodeName === "#text";

function textOf(node: Node): string {
  if (isText(node)) return node.value;
  if (node.tagName === "br") return "\n";
  return (node.childNodes ?? []).map(textOf).join("");
}

function detach(node: Node): void {
  const siblings = node.parentNode?.childNodes;
  if (!siblings) return;
  const i = siblings.indexOf(node);
  if (i >= 0) siblings.splice(i, 1);
}

function walkElements(root: Node, visit: (el: Node) => void): void {
  for (const child of [...(root.childNodes ?? [])]) {
    if (!isElement(child)) continue;
    visit(child);
    walkElements(child, visit);
    if (child.tagName === "template" && child.content) walkElements(child.content, visit);
  }
}

function find(root: Node, tag: string): Node | null {
  for (const child of root.childNodes ?? []) {
    if (child.tagName === tag) return child;
    const deep = find(child, tag);
    if (deep) return deep;
  }
  return null;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Only web URLs and site-relative paths may replace a template image. */
export function isSafeImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= 2048 && /^(https?:\/\/|\/(?!\/))[^\s"'<>]*$/i.test(value);
}

interface PageContext {
  templateId: string;
  info: TemplateDiskInfo;
  dir: string;
  /** Folder of the page inside the template dir, for relative URLs. */
  pageDir: string;
  /** The page's URL on the site it was captured from. */
  originPageUrl: URL | null;
  pages: Set<string>;
}

function buildPageContext(templateId: string, info: TemplateDiskInfo, dir: string, file: string): PageContext {
  let originPageUrl: URL | null = null;
  if (info.originDomain) {
    try {
      const origin = new URL(info.originDomain);
      // A folder named after the site is that site's web root; otherwise the
      // folder is one page of a larger site (e.g. `lp.example.com/honey/`).
      const isSiteRoot = (info.subPath ?? "").toLowerCase().includes(origin.hostname.toLowerCase());
      const rel = path.relative(dir, file).split(path.sep).map(encodeURIComponent).join("/");
      originPageUrl = new URL((isSiteRoot ? "/" : `/${info.subPath}/`) + rel, origin);
    } catch {
      originPageUrl = null;
    }
  }
  return {
    templateId,
    info,
    dir,
    pageDir: path.dirname(file),
    originPageUrl,
    pages: new Set(listTemplatePages(templateId)),
  };
}

const NON_FETCHABLE = /^(#|data:|blob:|javascript:|mailto:|tel:|sms:|about:|whatsapp:|viber:|fb-messenger:)/i;

/** Splits `path?query#hash`. wget stores `?` as `@` in file names, so both end the path. */
function splitLocalRef(ref: string): { file: string; tail: string } {
  const m = ref.match(/^([^?#]*?)(@[\w.-]+=[^#]*)?([?#].*)?$/);
  return { file: m?.[1] ?? ref, tail: m?.[3] ?? "" };
}

function localAssetUrl(ctx: PageContext, ref: string): string | null {
  const { file, tail } = splitLocalRef(ref);
  if (!file) return null;

  const tryFile = (candidate: string): string | null => {
    if (!candidate.startsWith(ctx.dir + path.sep)) return null;
    try {
      if (!fs.statSync(candidate).isFile()) return null;
    } catch {
      return null;
    }
    const rel = path.relative(ctx.dir, candidate).split(path.sep).map(encodeURIComponent).join("/");
    return `/api/templates/${ctx.templateId}/${rel}${tail}`;
  };

  let decoded = file;
  try {
    decoded = decodeURIComponent(file);
  } catch {
    // keep the raw reference
  }
  return file.startsWith("/")
    ? tryFile(path.join(ctx.dir, decoded))
    : tryFile(path.resolve(ctx.pageDir, decoded)) ?? tryFile(path.resolve(ctx.pageDir, ref.split("#")[0]));
}

/** Path prefix, under `/api/templates/<id>/`, of assets mirrored from the site a template was captured on. */
export const ORIGIN_ASSET_PREFIX = "_o";

/**
 * Assets that live on the template's source site are requested through our own
 * mirror route instead of hot-linked. That keeps them working if that site goes
 * away, lets its fonts load at all (fonts need CORS, which those sites do not
 * send), and stops shoppers' browsers from contacting a third party.
 */
function mirrorUrl(ctx: PageContext, url: URL): string {
  const origin = ctx.originPageUrl;
  if (!origin || url.hostname !== origin.hostname || !/^https?:$/.test(url.protocol)) return url.toString();
  return `/api/templates/${ctx.templateId}/${ORIGIN_ASSET_PREFIX}${url.pathname}${url.search}${url.hash}`;
}

/** Points an asset reference at our own copy when we have one, else at our mirror of the site it was captured from. */
function fixAssetUrl(ctx: PageContext, raw: string): string {
  const ref = raw.trim();
  if (!ref || NON_FETCHABLE.test(ref)) return raw;

  if (/^(https?:)?\/\//i.test(ref)) {
    try {
      return mirrorUrl(ctx, new URL(ref.startsWith("//") ? `https:${ref}` : ref));
    } catch {
      return raw;
    }
  }

  const local = localAssetUrl(ctx, ref);
  if (local) return local;
  if (!ctx.originPageUrl) return raw;

  try {
    // Undo wget's `file.js@ver=1` back to `file.js?ver=1` before going remote.
    return mirrorUrl(ctx, new URL(ref.replace(/(\.[a-z0-9]{2,5})@(?=[\w.-]+=)/i, "$1?"), ctx.originPageUrl));
  } catch {
    return raw;
  }
}

/** The source-site URL behind a mirror request, or `null` when the template has no source site. */
export function resolveOriginAssetUrl(templateId: string, pathAndQuery: string): URL | null {
  const origin = TEMPLATE_REGISTRY[templateId]?.originDomain;
  if (!origin) return null;
  try {
    const base = new URL(origin);
    const url = new URL(`/${pathAndQuery.replace(/^\/+/, "")}`, base);
    // `new URL` can be steered to another host by `//evil.example`; never follow it.
    return url.hostname === base.hostname && url.protocol === base.protocol ? url : null;
  } catch {
    return null;
  }
}

/** Rewrites absolute links to a template's source site inside a mirrored stylesheet so they stay on the mirror. */
export function rewriteMirroredCss(templateId: string, css: string): string {
  const origin = TEMPLATE_REGISTRY[templateId]?.originDomain;
  if (!origin) return css;
  const host = new URL(origin).hostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.replace(new RegExp(`(?:https?:)?//${host}/`, "gi"), `/api/templates/${templateId}/${ORIGIN_ASSET_PREFIX}/`);
}

function fixSrcset(ctx: PageContext, raw: string): string {
  return raw
    .split(",")
    .map((part) => {
      const [url, ...descriptor] = part.trim().split(/\s+/);
      return url ? [fixAssetUrl(ctx, url), ...descriptor].join(" ") : "";
    })
    .filter(Boolean)
    .join(", ");
}

function fixCssUrls(ctx: PageContext, css: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_m, q, url) => `url(${q}${fixAssetUrl(ctx, url)}${q})`);
}

type LinkTarget = { kind: "keep" } | { kind: "hash"; hash: string } | { kind: "page"; key: string } | { kind: "checkout" } | { kind: "dead" };

/** Decides where a template link should go once it lives on a merchant's store. */
function classifyLink(ctx: PageContext, raw: string): LinkTarget {
  const href = raw.trim();
  if (!href) return { kind: "keep" };
  if (href.startsWith("#")) return href.length > 1 ? { kind: "keep" } : { kind: "dead" };
  if (NON_FETCHABLE.test(href)) return { kind: "keep" };

  let url: URL;
  try {
    url = new URL(href.startsWith("//") ? `https:${href}` : href, ctx.originPageUrl ?? "https://template.invalid/");
  } catch {
    return { kind: "dead" };
  }

  const sameSite =
    !ctx.originPageUrl ||
    url.hostname === ctx.originPageUrl.hostname ||
    url.hostname === "template.invalid";
  if (!sameSite) return { kind: "keep" };

  const pagePath = ctx.originPageUrl?.pathname ?? "/";
  const pageBase = pagePath.slice(0, pagePath.lastIndexOf("/") + 1);
  const samePage = url.pathname === pagePath || url.pathname === pageBase;

  if (url.searchParams.has("add-to-cart")) return { kind: "checkout" };
  if (samePage) return url.hash.length > 1 ? { kind: "hash", hash: url.hash } : { kind: "page", key: "" };

  if (url.pathname.startsWith(pageBase)) {
    const key = normalizePageKey(decodeURIComponent(url.pathname.slice(pageBase.length)));
    if (key === "") return { kind: "page", key: "" };
    if (ctx.pages.has(key)) return { kind: "page", key };
  }
  if (url.pathname === "/" || url.pathname === "") return { kind: "page", key: "" };

  return COMMERCE_LINK.test(url.pathname + url.search) ? { kind: "checkout" } : { kind: "dead" };
}

const prepared = new Map<string, PreparedPage>();

function preparePage(templateId: string, pageKey: string): PreparedPage {
  const info = TEMPLATE_REGISTRY[templateId];
  const dir = getTemplateDir(templateId);
  const file = info && dir ? pageFile(info, dir, pageKey) : null;
  if (!info || !dir || !file) throw new Error(`Template page not found: ${templateId}/${pageKey || "index"}`);

  const cacheKey = `${templateId}:${pageKey}`;
  const mtimeMs = fs.statSync(file).mtimeMs;
  const cached = prepared.get(cacheKey);
  if (cached && cached.mtimeMs === mtimeMs) return cached;

  const ctx = buildPageContext(templateId, info, dir, file);
  const doc = parse(fs.readFileSync(file, "utf-8"));
  const head = find(doc, "head");
  const body = find(doc, "body");
  if (!head || !body) throw new Error(`Template page has no <head>/<body>: ${templateId}`);

  const nonce = randomBytes(6).toString("hex");
  const holes: Hole[] = [];
  const slots: TemplateSlot[] = [];
  const hole = (h: Hole): string => `⟦${nonce}:${holes.push(h) - 1}⟧`;
  const textNode = (value: string, parentNode: Node): Node => ({ nodeName: "#text", value, parentNode });

  // --- 1. Drop what must not ship: trackers, the source shop's plumbing, app bundles.
  walkElements(doc, (el) => {
    const tag = el.tagName;
    if (tag === "script") {
      const src = attr(el, "src") ?? "";
      const type = (attr(el, "type") ?? "").toLowerCase();
      const inline = src ? "" : textOf(el);
      // A captured app bundle would boot its router against our URL and blank the page.
      if (type === "module" || STRIP_SCRIPT.test(src) || (inline && STRIP_SCRIPT.test(inline))) detach(el);
    } else if (tag === "link") {
      const rel = (attr(el, "rel") ?? "").trim();
      if (STRIP_LINK_REL.test(rel) || /^(preload|prefetch)$/i.test(rel) && attr(el, "as") === "script") detach(el);
    } else if (tag === "base") {
      detach(el);
    } else if (tag === "meta") {
      const key = (attr(el, "name") ?? attr(el, "property") ?? attr(el, "http-equiv") ?? "").toLowerCase();
      if (/^(robots|generator|content-security-policy|refresh|og:url|msapplication-tileimage)$/.test(key)) detach(el);
    } else if (tag === "noscript" || tag === "iframe") {
      // Tracking pixels and third-party embeds from the source site.
      if (tag === "noscript" || !/youtube|vimeo|facebook\.com\/plugins\/video/i.test(attr(el, "src") ?? "")) detach(el);
    }
  });

  // --- 2. Assets, links and image slots.
  const imageSlot = (img: Node): string => {
    const existing = attr(img, "data-gc-i");
    if (existing) return existing;

    const lazyAttr = ["data-src", "data-lazy-src", "data-original"].find((n) => attr(img, n));
    const real = fixAssetUrl(ctx, (lazyAttr ? attr(img, lazyAttr) : attr(img, "src")) ?? "");
    const id = `i${slots.filter((s) => s.kind === "image").length}`;
    slots.push({ id, kind: "image", tag: "img", value: real });
    setAttr(img, "data-gc-i", id);

    if (lazyAttr) {
      setAttr(img, lazyAttr, hole({ type: "img", slot: id, orig: escapeAttr(real) }));
      const placeholder = attr(img, "src");
      if (placeholder !== undefined) {
        // Once replaced there is no lazy loader contract to honour: show it directly.
        setAttr(img, "src", hole({ type: "img", slot: id, orig: escapeAttr(fixAssetUrl(ctx, placeholder)) }));
      }
    } else {
      setAttr(img, "src", hole({ type: "img", slot: id, orig: escapeAttr(real) }));
    }
    for (const name of ["srcset", "data-srcset", "data-lazy-srcset", "sizes"]) {
      const value = attr(img, name);
      if (value === undefined) continue;
      const fixed = name === "sizes" ? value : fixSrcset(ctx, value);
      setAttr(img, name, hole({ type: "imgaux", slot: id, orig: escapeAttr(fixed) }));
    }
    return id;
  };

  walkElements(doc, (el) => {
    const tag = el.tagName;
    const style = attr(el, "style");
    if (style && /url\(/i.test(style)) setAttr(el, "style", fixCssUrls(ctx, style));

    if (tag === "style") {
      for (const child of el.childNodes) if (isText(child) && /url\(/i.test(child.value)) child.value = fixCssUrls(ctx, child.value);
    } else if (tag === "script" || tag === "video" || tag === "audio" || tag === "embed" || tag === "iframe") {
      for (const name of ["src", "poster"]) {
        const value = attr(el, name);
        if (value) setAttr(el, name, fixAssetUrl(ctx, value));
      }
    } else if (tag === "link") {
      const value = attr(el, "href");
      if (value) setAttr(el, "href", fixAssetUrl(ctx, value));
      removeAttr(el, "integrity");
    } else if (tag === "meta") {
      const key = (attr(el, "property") ?? attr(el, "name") ?? "").toLowerCase();
      const value = attr(el, "content");
      if (value && /image/.test(key)) setAttr(el, "content", fixAssetUrl(ctx, value));
    } else if (tag === "picture") {
      const img = find(el, "img");
      if (img) {
        const id = imageSlot(img);
        for (const source of el.childNodes.filter((c: Node) => c.tagName === "source")) {
          for (const name of ["srcset", "data-srcset"]) {
            const value = attr(source, name);
            if (value !== undefined) setAttr(source, name, hole({ type: "imgaux", slot: id, orig: escapeAttr(fixSrcset(ctx, value)) }));
          }
        }
      }
    } else if (tag === "source") {
      for (const name of ["src", "srcset"]) {
        const value = attr(el, name);
        // Sources inside <picture> already carry holes.
        if (value && !value.startsWith("⟦")) setAttr(el, name, name === "src" ? fixAssetUrl(ctx, value) : fixSrcset(ctx, value));
      }
    } else if (tag === "img") {
      imageSlot(el);
    } else if (tag === "a" || tag === "area") {
      const href = attr(el, "href");
      if (href !== undefined) {
        const target = classifyLink(ctx, href);
        if (target.kind === "hash") setAttr(el, "href", target.hash);
        else if (target.kind === "page") setAttr(el, "href", hole({ type: "page", key: target.key }));
        else if (target.kind === "checkout") {
          setAttr(el, "href", hole({ type: "checkout" }));
          setAttr(el, "data-gc-cta", "1");
        } else if (target.kind === "dead") setAttr(el, "href", "#");
        if (target.kind !== "keep") removeAttr(el, "target");
      }
    } else if (tag === "form") {
      // Forms post to the source site; the runtime script routes them instead.
      removeAttr(el, "action");
    }
  });

  // --- 3. Text slots.
  let textCount = 0;
  const newTextSlot = (el: Node, value: string): string => {
    const id = `t${textCount++}`;
    const clean = value.replace(/[ \t\r\f\v]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
    slots.push({ id, kind: "text", tag: el.tagName, value: clean, ...(clean.includes("\n") || clean.length > 80 ? { multiline: true } : {}) });
    const existing = attr(el, "data-gc");
    setAttr(el, "data-gc", existing ? `${existing} ${id}` : id);
    return id;
  };

  /** True when the element is nothing but text and emphasis — safe to edit as a single field. */
  const isPlainRun = (el: Node): boolean =>
    el.childNodes.length > 0 &&
    el.childNodes.every(
      (c: Node) =>
        isText(c) ||
        (isElement(c) && EMPHASIS_TAGS.has(c.tagName) && (c.tagName === "br" || (MEANINGFUL.test(textOf(c)) && isPlainRun(c))))
    );

  const collectText = (el: Node): void => {
    if (SKIP_TAGS.has(el.tagName)) return;

    const text = textOf(el);
    if (el.tagName !== "body" && isPlainRun(el) && MEANINGFUL.test(text) && text.length <= 3000) {
      const id = newTextSlot(el, text);
      const orig = serialize(el);
      el.childNodes = [textNode(hole({ type: "html", slot: id, orig }), el)];
      return;
    }

    for (const child of el.childNodes) {
      if (isText(child)) {
        if (!MEANINGFUL.test(child.value)) continue;
        const id = newTextSlot(el, child.value);
        // Keep the node's own leading/trailing whitespace: it separates inline neighbours.
        const [, lead, core, trail] = child.value.match(/^(\s*)([\s\S]*?)(\s*)$/) as RegExpMatchArray;
        child.value = `${lead}${hole({ type: "textnode", slot: id, orig: escapeHtml(core) })}${trail}`;
      } else if (isElement(child)) {
        collectText(child);
      }
    }
  };
  collectText(body);

  // --- 4. Document title, and our own scripts.
  let title = find(head, "title");
  if (!title) {
    title = { nodeName: "title", tagName: "title", attrs: [], childNodes: [], parentNode: head, namespaceURI: head.namespaceURI };
    head.childNodes.unshift(title);
  }
  const titleText = textOf(title).trim();
  slots.unshift({ id: "title", kind: "text", tag: "title", value: titleText });
  title.childNodes = [textNode(hole({ type: "title", slot: "title", orig: escapeHtml(titleText) }), title)];

  // parse5 serialises <script>/<style> text raw, so a text node placed in one is emitted verbatim.
  const scriptEl = (parentNode: Node, h: Hole): Node => {
    const el: Node = { nodeName: "script", tagName: "script", attrs: [], childNodes: [], parentNode, namespaceURI: parentNode.namespaceURI };
    el.childNodes.push(textNode(hole(h), el));
    return el;
  };
  head.childNodes.unshift(scriptEl(head, { type: "boot" }));
  body.childNodes.push(scriptEl(body, { type: "runtime" }));

  // --- 5. Freeze into chunks.
  const html = serialize(doc);
  const chunks: Array<string | number> = [];
  const pattern = new RegExp(`⟦${nonce}:(\\d+)⟧`, "g");
  let last = 0;
  for (let m = pattern.exec(html); m; m = pattern.exec(html)) {
    if (m.index > last) chunks.push(html.slice(last, m.index));
    chunks.push(Number(m[1]));
    last = m.index + m[0].length;
  }
  chunks.push(html.slice(last));

  const page: PreparedPage = { chunks, holes, slots, mtimeMs };
  prepared.set(cacheKey, page);
  return page;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** True when `page` exists for this template. */
export function hasTemplatePage(templateId: string, page?: string | null): boolean {
  const info = TEMPLATE_REGISTRY[templateId];
  const dir = getTemplateDir(templateId);
  return Boolean(info && dir && pageFile(info, dir, normalizePageKey(page)));
}

/** The editable texts and images of one template page, in document order. */
export function getTemplateSlots(templateId: string, page?: string | null): TemplateSlot[] {
  return preparePage(templateId, normalizePageKey(page)).slots;
}

/**
 * Drops overrides that no longer name a slot of this template (stale after a
 * template switch) or that carry an unusable value, so only meaningful edits
 * are stored and published.
 */
export function sanitizeTemplateOverrides(
  templateId: string,
  pages: unknown
): Record<string, Required<TemplatePageOverrides>> {
  const out: Record<string, Required<TemplatePageOverrides>> = {};
  if (!pages || typeof pages !== "object") return out;

  for (const [rawKey, raw] of Object.entries(pages as Record<string, any>)) {
    const key = normalizePageKey(rawKey);
    if (!hasTemplatePage(templateId, key)) continue;
    const known = new Map(getTemplateSlots(templateId, key).map((s) => [s.id, s]));
    const clean: Required<TemplatePageOverrides> = { text: {}, image: {} };

    for (const [id, value] of Object.entries(raw?.text ?? {})) {
      if (known.get(id)?.kind === "text" && typeof value === "string" && value.length <= 5000) clean.text[id] = value;
    }
    for (const [id, value] of Object.entries(raw?.image ?? {})) {
      if (known.get(id)?.kind === "image" && isSafeImageUrl(value)) clean.image[id] = value;
    }
    if (Object.keys(clean.text).length || Object.keys(clean.image).length) out[key || "index"] = clean;
  }
  return out;
}

/** Renders one template page for a store. Returns `null` when the page does not exist. */
export function renderTemplateHtml(templateId: string, opts: RenderTemplateOptions): string | null {
  const pageKey = normalizePageKey(opts.page);
  let page: PreparedPage;
  try {
    page = preparePage(templateId, pageKey);
  } catch {
    return null;
  }

  const text = opts.overrides?.text ?? {};
  const image = opts.overrides?.image ?? {};
  const imageFor = (slot: string): string | undefined => (isSafeImageUrl(image[slot]) ? image[slot] : undefined);
  const textFor = (slot: string): string | undefined => (typeof text[slot] === "string" ? text[slot] : undefined);

  const runtime: RuntimeConfig = { mode: opts.mode, checkoutUrl: opts.checkoutUrl };

  let out = "";
  for (const chunk of page.chunks) {
    if (typeof chunk === "string") {
      out += chunk;
      continue;
    }
    const h = page.holes[chunk];
    switch (h.type) {
      case "html": {
        const value = textFor(h.slot);
        out += value === undefined ? h.orig : escapeHtml(value).replace(/\r?\n/g, "<br>");
        break;
      }
      case "textnode": {
        const value = textFor(h.slot);
        out += value === undefined ? h.orig : escapeHtml(value).replace(/\r?\n/g, "<br>");
        break;
      }
      case "title":
        out += escapeHtml(textFor(h.slot) ?? (opts.mode === "live" && opts.storeName ? opts.storeName : h.orig));
        break;
      case "img": {
        const value = imageFor(h.slot);
        out += value === undefined ? h.orig : escapeAttr(value);
        break;
      }
      case "imgaux":
        out += imageFor(h.slot) === undefined ? h.orig : "";
        break;
      case "page":
        out += escapeAttr(opts.pageUrl(h.key));
        break;
      case "checkout":
        out += escapeAttr(opts.checkoutUrl);
        break;
      case "boot":
        out += buildBootScript();
        break;
      case "runtime":
        out += buildRuntimeScript(runtime);
        break;
    }
  }

  // Previews and drafts are working copies, never search results.
  return opts.mode === "live" ? out : out.replace(/<head([^>]*)>/i, '<head$1><meta name="robots" content="noindex, nofollow">');
}

/**
 * Response headers for a rendered template page.
 *
 * Template pages run scripts written by third parties, so the document is
 * sandboxed into an opaque origin: those scripts can render the page but cannot
 * read this site's cookies or storage, nor call its APIs as the visitor.
 */
export function templateCsp(frameAncestors: string): string {
  return [
    "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox",
    "object-src 'none'",
    "base-uri 'none'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}
