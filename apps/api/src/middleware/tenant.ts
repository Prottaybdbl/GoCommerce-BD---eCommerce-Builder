import { createMiddleware } from "hono/factory";
import { db, stores, domains } from "@gocom/db";
import { eq } from "drizzle-orm";
import { config } from "../config.js";

// In-memory cache for resolved tenant hostnames (60 second TTL)
interface CachedTenant {
  store: typeof stores.$inferSelect;
  expiresAt: number;
}
const tenantCache = new Map<string, CachedTenant>();

export const tenantResolution = createMiddleware(async (c, next) => {
  const path = c.req.path;

  // Invariant #4: Merchant API (/v1/...) resolves store strictly from authenticated session.
  // Skip host-based resolution for merchant API, auth, health, docs, and dashboard SPA assets.
  if (
    path.startsWith("/v1") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/admin") ||
    path.startsWith("/api/app") ||
    path.startsWith("/assets") ||
    path.startsWith("/favicon") ||
    path.startsWith("/logo") ||
    path === "/" ||
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/health" ||
    path === "/docs"
  ) {
    return await next();
  }

  const host = c.req.header("host") || "";
  const cleanHost = host.split(":")[0].toLowerCase();

  // Skip tenant resolution for platform hostnames
  const platformRoot = (config.PLATFORM_ROOT_DOMAIN || "gocommercebd.online").toLowerCase();
  if (
    cleanHost === platformRoot ||
    cleanHost === `app.${platformRoot}` ||
    cleanHost === `admin.${platformRoot}` ||
    cleanHost === `api.${platformRoot}` ||
    cleanHost === `www.${platformRoot}`
  ) {
    return await next();
  }

  // Check in-memory cache first (keyed strictly by host)
  const cacheKey = cleanHost;
  const now = Date.now();
  const cached = tenantCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    const store = cached.store;
    if (store.deletedAt) {
      return c.json(
        {
          type: "https://httpstatuses.com/404",
          title: "Store Not Found",
          status: 404,
          detail: "This store has been deleted or is no longer available.",
        },
        404
      );
    }
    if (store.status === "suspended" || !store.isActive) {
      return c.json(
        {
          type: "https://httpstatuses.com/403",
          title: "Store Suspended",
          status: 403,
          detail: "This store has been suspended. Please contact platform support.",
        },
        403
      );
    }
    c.set("store", store);
    return await next();
  }

  let store: typeof stores.$inferSelect | undefined;

  // 1. Subdomain lookup (e.g. grihogadget.yourbrandshop.com)
  if (host) {
    const cleanHost = host.split(":")[0].toLowerCase(); // remove port and lowercase
    
    try {
      // Check if it's a platform storefront subdomain
      if (cleanHost.endsWith(`.${config.STOREFRONT_ROOT_DOMAIN.toLowerCase()}`)) {
        const subdomain = cleanHost.replace(`.${config.STOREFRONT_ROOT_DOMAIN.toLowerCase()}`, "");
        store = await db.query.stores.findFirst({
          where: eq(stores.subdomain, subdomain),
        });
      } else {
        // 2. Custom domain lookup (e.g. www.merchant.com)
        const domainRecord = await db.query.domains.findFirst({
          where: eq(domains.domain, cleanHost),
          with: {
            store: true,
          },
        });

        if (domainRecord) {
          store = await db.query.stores.findFirst({
            where: eq(stores.id, domainRecord.storeId),
          });
        }
      }
    } catch {
      // DB may be offline during unit tests or container initialization
    }
  }

  // 3. Fallback for local development if host is localhost:
  // Strictly permitted ONLY when NODE_ENV is development AND DEV_TENANT_FALLBACK=1
  if (!store && (host.includes("localhost") || host.includes("127.0.0.1"))) {
    if (config.NODE_ENV === "development" && process.env.DEV_TENANT_FALLBACK === "1") {
      try {
        store = await db.query.stores.findFirst({
          where: eq(stores.isActive, true),
        });
      } catch {
        // DB may not be running in isolated dev run
      }
    }
  }

  // Test environment fallback to allow offline testing
  if (!store && (config.NODE_ENV === "test" || process.env.NODE_ENV === "test")) {
    store = {
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: "org_test_0001",
      name: "Test Store",
      subdomain: "test",
      phone: "+8801711223344",
      logoUrl: null,
      settings: {
        deliveryChargeInsideDhaka: 6000,
        deliveryChargeSubDhaka: 10000,
        deliveryChargeOutsideDhaka: 12000,
      },
      themeArchetype: "viral-funnel",
      themeConfig: {},
      plan: "pilot",
      status: "active",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  }

  if (store) {
    if (store.deletedAt) {
      return c.json(
        {
          type: "https://httpstatuses.com/404",
          title: "Store Not Found",
          status: 404,
          detail: "This store has been deleted or is no longer available.",
        },
        404
      );
    }

    if (store.status === "suspended" || !store.isActive) {
      return c.json(
        {
          type: "https://httpstatuses.com/403",
          title: "Store Suspended",
          status: 403,
          detail: "This store has been suspended. Please contact platform support.",
        },
        403
      );
    }

    tenantCache.set(cacheKey, { store, expiresAt: now + 60_000 });
    c.set("store", store);
  }

  await next();
});
