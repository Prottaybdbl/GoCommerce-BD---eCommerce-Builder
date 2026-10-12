/**
 * Stores served by path — `https://<root>/<subdomain>` — rather than by host.
 * The first path segment is the tenant identity here, exactly as the `Host`
 * header is for subdomain and custom-domain storefronts.
 */
import { db, stores } from "@gocom/db";
import { eq } from "drizzle-orm";

export type StoreRow = typeof stores.$inferSelect;

/** First path segments that belong to the platform itself and can never be a store. */
const RESERVED = new Set([
  "api", "assets", "favicon.ico", "logo.png", "robots.txt", "dashboard", "login", "signup",
  "create-store", "register", "health", "p", "privacy", "terms", "refund", "app", "admin", "www", "v1", "feeds",
]);

export function isReservedSlug(slug?: string | null): boolean {
  return !slug || RESERVED.has(slug.toLowerCase());
}

/** The active store at `/<slug>`, or `undefined`. */
export async function findPathStore(slug?: string | null): Promise<StoreRow | undefined> {
  if (isReservedSlug(slug)) return undefined;
  const key = (slug as string).toLowerCase();

  let store: StoreRow | undefined;
  try {
    store = await db.query.stores.findFirst({ where: eq(stores.subdomain, key) });
  } catch (dbErr) {
    console.warn("Path store lookup note:", dbErr);
  }

  // Demo store so the storefront still renders when the database is offline in development.
  if (!store && process.env.NODE_ENV !== "production" && (key === "grihogadget" || key === "demo")) {
    store = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "গৃহগ্যাজেট (Grihogadget)",
      subdomain: "grihogadget",
      phone: "+8801711223344",
      themeArchetype: "viral-funnel",
      themeConfig: {},
      settings: {},
      isActive: true,
      plan: "pilot",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as StoreRow;
  }

  if (!store || store.deletedAt || store.isActive === false || store.status === "suspended") return undefined;
  return store;
}

export function storeNotFoundResponse(slug: string): Response {
  const safe = slug.replace(/[^a-z0-9_-]/gi, "").slice(0, 60);
  return new Response(
    `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>দোকান খুঁজে পাওয়া যায়নি — GoCommerce BD</title><link rel="icon" type="image/svg+xml" href="/favicon.svg"><style>body{font-family:system-ui,sans-serif;background:#0b0c16;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}.box{max-width:480px;padding:32px;background:#141522;border-radius:16px;border:1px solid rgba(255,255,255,.08)}h1{font-size:24px;color:#f87171;margin:0 0 12px}p{font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 24px}a{display:inline-block;background:#155dfc;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px}</style></head><body><div class="box"><h1>দোকানটি পাওয়া যায়নি</h1><p><strong>/${safe}</strong> ঠিকানায় কোনো সক্রিয় স্টোর খুঁজে পাওয়া যায়নি। আপনি কি নিজের স্টোর শুরু করতে চান?</p><a href="/">ফ্রি-তে স্টোর তৈরি করুন</a></div></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
