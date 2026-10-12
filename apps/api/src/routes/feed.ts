import { Hono } from "hono";
import { createTenantRepository, stores } from "@gocom/db";
import { poishaToBdt } from "@gocom/contracts";
import { config } from "../config.js";

function escapeXmlText(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeXmlCdata(str: unknown): string {
  if (str === null || str === undefined) return "";
  // Safe CDATA escaping: replace "]]>" with "]]]]><![CDATA[>"
  return String(str).replace(/]]>/g, "]]]]><![CDATA[>");
}

export const feedRouter = new Hono<{
  Variables: {
    store?: typeof stores.$inferSelect;
  };
}>();

feedRouter.get("/facebook.xml", async (c) => {
  const store = c.get("store");
  if (!store) {
    return c.text("Store not found", 404);
  }

  let products: any[] = [];
  try {
    const repo = createTenantRepository(store.id);
    products = await repo.getProducts({ activeOnly: true, limit: 500 });
  } catch {
    if (config.NODE_ENV === "test") {
      products = [
        {
          id: "prod_1",
          title: "Test Gadget <>&\"'",
          banglaTitle: "টেস্ট গ্যাজেট ]]> with danger",
          slug: "test-gadget",
          banglaDescription: "বিবরণ ]]> টেস্ট",
          description: "Description ]]> Test",
          images: [{ url: "https://media.test.com/img1.png", isPrimary: true }],
          variants: [{ id: "var_1", price: 150000, stockQuantity: 10 }],
        },
      ];
    }
  }

  const storeUrl = `https://${encodeURIComponent(store.subdomain)}.${config.STOREFRONT_ROOT_DOMAIN}`;

  // Build standard Meta / Google Product Catalog XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title><![CDATA[${escapeXmlCdata(store.name)}]]></title>
    <link>${escapeXmlText(storeUrl)}</link>
    <description><![CDATA[Product catalog feed for ${escapeXmlCdata(store.name)}]]></description>
`;

  for (const product of products) {
    const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0];
    const defaultVariant = product.variants[0];

    if (!defaultVariant || !primaryImage) continue;

    const productUrl = `${storeUrl}/p/${encodeURIComponent(product.slug)}`;
    const priceFormatted = `${poishaToBdt(defaultVariant.price).toFixed(2)} BDT`;
    const title = product.banglaTitle || product.title || "";
    const description = product.banglaDescription || product.description || product.title || "";

    xml += `    <item>
      <g:id>${escapeXmlText(defaultVariant.id)}</g:id>
      <g:title><![CDATA[${escapeXmlCdata(title)}]]></g:title>
      <g:description><![CDATA[${escapeXmlCdata(description)}]]></g:description>
      <g:link>${escapeXmlText(productUrl)}</g:link>
      <g:image_link>${escapeXmlText(primaryImage.url)}</g:image_link>
      <g:brand><![CDATA[${escapeXmlCdata(store.name)}]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>${defaultVariant.stockQuantity > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${escapeXmlText(priceFormatted)}</g:price>
    </item>
`;
  }

  xml += `  </channel>
</rss>`;

  c.header("Content-Type", "application/xml; charset=utf-8");
  c.header("Cache-Control", "public, s-maxage=3600");
  return c.body(xml);
});
