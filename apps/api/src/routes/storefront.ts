import { Hono } from "hono";
import { createTenantRepository, stores } from "@gocom/db";
import { getStorefrontCacheHeaders } from "../services/cloudflare-cache.js";

export const storefrontRouter = new Hono<{
  Variables: {
    store?: typeof stores.$inferSelect;
  };
}>();

// Invariant #8: Storefront responses must never set cookies
storefrontRouter.use("*", async (c, next) => {
  await next();
  // Strip any accidental Set-Cookie header on public storefront responses
  c.header("Set-Cookie", undefined);
});

// Get active store configuration for theme rendering
storefrontRouter.get("/config", async (c) => {
  const store = c.get("store");
  if (!store) {
    return c.json({ error: "Store not found for this domain" }, 404);
  }

  const cacheHeaders = getStorefrontCacheHeaders(store.id, { tags: ["config"] });
  for (const [key, value] of Object.entries(cacheHeaders)) {
    c.header(key, value);
  }

  // Task 2.2 (V-09): Whitelist public config — never expose tokens, payment
  // numbers, or marketing credentials on the public storefront endpoint.
  const settings = (store.settings || {}) as Record<string, any>;
  const safeSettings = {
    deliveryChargeInsideDhaka: settings.deliveryChargeInsideDhaka,
    deliveryChargeSubDhaka: settings.deliveryChargeSubDhaka,
    deliveryChargeOutsideDhaka: settings.deliveryChargeOutsideDhaka,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    advanceDeliveryRequiredOutsideDhaka: settings.advanceDeliveryRequiredOutsideDhaka,
    advanceDeliveryAmount: settings.advanceDeliveryAmount,
    tagline: settings.tagline,
    supportPhone: settings.supportPhone,
    supportWhatsapp: settings.supportWhatsapp,
    // Pixel IDs are public (they appear in the rendered HTML anyway)
    facebookPixelId: settings.facebookPixelId,
    tiktokPixelId: settings.tiktokPixelId,
    themeArchetype: settings.themeArchetype,
    themeConfig: settings.themeConfig,
  };

  return c.json({
    id: store.id,
    name: store.name,
    subdomain: store.subdomain,
    phone: store.phone,
    logoUrl: store.logoUrl,
    themeArchetype: store.themeArchetype,
    themeConfig: store.themeConfig,
    settings: safeSettings,
  });
});

// Get catalog products for the storefront
storefrontRouter.get("/products", async (c) => {
  const store = c.get("store");
  if (!store) {
    return c.json({ error: "Store not found" }, 404);
  }

  const cacheHeaders = getStorefrontCacheHeaders(store.id, { tags: ["products", "catalog"] });
  for (const [key, value] of Object.entries(cacheHeaders)) {
    c.header(key, value);
  }

  const repo = createTenantRepository(store.id);
  const products = await repo.getProducts({ activeOnly: true, limit: 100 });

  return c.json({
    data: products,
  });
});

// Get single product by slug
storefrontRouter.get("/products/:slug", async (c) => {
  const store = c.get("store");
  if (!store) {
    return c.json({ error: "Store not found" }, 404);
  }

  const slug = c.req.param("slug");
  const repo = createTenantRepository(store.id);
  const product = await repo.getProductBySlug(slug);

  if (!product) {
    return c.json({ error: "Product not found" }, 404);
  }

  const cacheHeaders = getStorefrontCacheHeaders(store.id, { tags: ["products", `product:${product.id}`] });
  for (const [key, value] of Object.entries(cacheHeaders)) {
    c.header(key, value);
  }

  return c.json({
    data: product,
  });
});
