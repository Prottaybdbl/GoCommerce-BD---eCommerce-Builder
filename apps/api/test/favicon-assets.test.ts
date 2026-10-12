import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

describe("Phase 9: Favicon Assets & Multi-Page Linkage Tests", () => {
  const storefrontPublic = path.join(repoRoot, "apps/storefront/public");
  const dashboardPublic = path.join(repoRoot, "apps/dashboard/public");

  const requiredAssets = [
    "favicon.ico",
    "favicon.png",
    "favicon.svg",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "apple-touch-icon.png",
  ];

  test("Storefront Public: contains all standard favicon formats and sizes", () => {
    for (const asset of requiredAssets) {
      const p = path.join(storefrontPublic, asset);
      assert.ok(fs.existsSync(p), `Missing storefront asset: ${asset}`);
      const stat = fs.statSync(p);
      assert.ok(stat.size > 100, `Asset ${asset} too small (${stat.size} bytes)`);
    }
  });

  test("Dashboard Public: contains all standard favicon formats and sizes", () => {
    for (const asset of requiredAssets) {
      const p = path.join(dashboardPublic, asset);
      assert.ok(fs.existsSync(p), `Missing dashboard asset: ${asset}`);
      const stat = fs.statSync(p);
      assert.ok(stat.size > 100, `Asset ${asset} too small (${stat.size} bytes)`);
    }
  });

  test("Favicon SVG: contains valid scalable SVG with embedded high-resolution graphic", () => {
    const storefrontSvg = fs.readFileSync(path.join(storefrontPublic, "favicon.svg"), "utf-8");
    const dashboardSvg = fs.readFileSync(path.join(dashboardPublic, "favicon.svg"), "utf-8");

    assert.ok(storefrontSvg.includes("<svg"), "Storefront favicon.svg must be an SVG tag");
    assert.ok(storefrontSvg.includes("data:image/png;base64,"), "Storefront favicon.svg must embed image data");
    assert.ok(dashboardSvg.includes("<svg"), "Dashboard favicon.svg must be an SVG tag");
    assert.ok(dashboardSvg.includes("data:image/png;base64,"), "Dashboard favicon.svg must embed image data");
  });

  test("Dashboard index.html: contains comprehensive favicon and touch-icon tags", () => {
    const html = fs.readFileSync(path.join(repoRoot, "apps/dashboard/index.html"), "utf-8");
    assert.ok(html.includes('href="/favicon-32x32.png"'), "Missing 32x32 PNG favicon link");
    assert.ok(html.includes('href="/favicon-16x16.png"'), "Missing 16x16 PNG favicon link");
    assert.ok(html.includes('href="/favicon.svg"'), "Missing SVG favicon link");
    assert.ok(html.includes('href="/favicon.ico"'), "Missing ICO fallback link");
    assert.ok(html.includes('href="/apple-touch-icon.png"'), "Missing apple-touch-icon link");
  });

  test("Storefront Templates & Auth: all user-facing web pages include favicon tags", () => {
    const homeHtml = fs.readFileSync(path.join(repoRoot, "apps/storefront/src/templates/home.html"), "utf-8");
    assert.ok(homeHtml.includes('href="/favicon-32x32.png"'), "Home template missing 32x32 favicon link");
    assert.ok(homeHtml.includes('href="/favicon.svg"'), "Home template missing SVG favicon link");

    const authLayout = fs.readFileSync(path.join(repoRoot, "apps/storefront/src/components/AuthLayout.astro"), "utf-8");
    assert.ok(authLayout.includes('href="/favicon-32x32.png"'), "AuthLayout missing 32x32 favicon link");
    assert.ok(authLayout.includes('href="/favicon.svg"'), "AuthLayout missing SVG favicon link");

    const storeHome = fs.readFileSync(path.join(repoRoot, "apps/storefront/src/pages/[store]/index.astro"), "utf-8");
    assert.ok(storeHome.includes('href="/favicon-32x32.png"'), "Store home missing 32x32 favicon link");

    const storeProduct = fs.readFileSync(path.join(repoRoot, "apps/storefront/src/pages/[store]/p/[slug].astro"), "utf-8");
    assert.ok(storeProduct.includes('href="/favicon-32x32.png"'), "Store product page missing favicon link");

    const standaloneProduct = fs.readFileSync(path.join(repoRoot, "apps/storefront/src/pages/p/[slug].astro"), "utf-8");
    assert.ok(standaloneProduct.includes('href="/favicon-32x32.png"'), "Standalone product page missing favicon link");
  });
});
