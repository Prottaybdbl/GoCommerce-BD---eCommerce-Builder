import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATE_REGISTRY,
  getTemplateCategory,
  getTemplateSlots,
  getTemplateSourceStatus,
  getTemplatesRoot,
  hasTemplatePage,
  isSafeImageUrl,
  listTemplatePages,
  renderTemplateHtml,
  resolveOriginAssetUrl,
  resolveTemplateAsset,
  rewriteMirroredCss,
  sanitizeTemplateOverrides,
  templateCsp,
} from "../src/html/index.js";

const render = (id: string, extra: Record<string, unknown> = {}) =>
  renderTemplateHtml(id, {
    mode: "live",
    checkoutUrl: "/myshop/checkout",
    pageUrl: (key) => (key ? `/myshop/${key}` : "/myshop"),
    storeName: "My Shop",
    ...extra,
  } as any);

describe("HTML template engine", () => {
  test("finds the templets directory from the working directory", () => {
    assert.ok(getTemplatesRoot(), "templets/ must be discoverable without TEMPLATES_DIR");
  });

  test("categorises templates into the three gallery tabs", () => {
    assert.equal(getTemplateCategory("honey"), "single-landing");
    assert.equal(getTemplateCategory("viral-funnel"), "single-landing");
    assert.equal(getTemplateCategory("amarshop"), "multi-landing");
    assert.equal(getTemplateCategory("organik"), "multi-landing");
    assert.equal(getTemplateCategory("borkashop"), "ecommerce");
  });

  test("every single and multi landing template on disk is either renderable or explicitly unsupported", () => {
    const ids = Object.keys(TEMPLATE_REGISTRY).filter((id) => /^[12]\./.test(TEMPLATE_REGISTRY[id].categoryDir ?? ""));
    assert.equal(ids.length, 40);

    const byStatus = { ok: [] as string[], unsupported: [] as string[], missing: [] as string[] };
    for (const id of ids) byStatus[getTemplateSourceStatus(id)].push(id);

    assert.deepEqual(byStatus.missing, [], "every landing template has its source folder");
    // App shells whose markup only exists after their own backend answers.
    assert.deepEqual(byStatus.unsupported.sort(), ["anjumanbd", "beautyglow", "dhakarhatt", "gardeningseeds"]);
    assert.equal(byStatus.ok.length, 36);

    for (const id of byStatus.ok) {
      const html = render(id);
      assert.ok(html && html.length > 5000, `${id} renders its page`);
      assert.ok(!html.includes("⟦"), `${id} leaves no unfilled placeholder`);
    }
  });

  test("section-engine archetypes and not-yet-added designs have no HTML source", () => {
    assert.equal(getTemplateSourceStatus("viral-funnel"), "missing");
    assert.equal(getTemplateSourceStatus("borkashop"), "missing");
    assert.equal(getTemplateSourceStatus("does-not-exist"), "missing");
    assert.equal(render("viral-funnel"), null);
  });

  test("templates render differently from one another", () => {
    const honey = render("honey")!;
    const headphone = render("headphone")!;
    assert.notEqual(honey, headphone);
    assert.ok(honey.includes("wp-content/uploads"), "honey keeps its own images");
  });

  test("exposes the page's texts and images as editable slots", () => {
    const slots = getTemplateSlots("honey");
    const texts = slots.filter((s) => s.kind === "text");
    const images = slots.filter((s) => s.kind === "image");

    assert.equal(slots[0].id, "title");
    assert.ok(texts.length > 30);
    assert.ok(images.length >= 3);
    assert.ok(images.every((s) => s.value.startsWith("/api/templates/honey/") || /^https?:/.test(s.value)));
    assert.equal(new Set(slots.map((s) => `${s.kind}:${s.id}`)).size, slots.length, "slot ids are unique");
  });

  test("applies a text override, escaped, and leaves the rest of the page untouched", () => {
    const slot = getTemplateSlots("honey").find((s) => s.kind === "text" && s.tag !== "title" && s.value.length > 8)!;
    const original = render("honey")!;
    const edited = render("honey", { overrides: { text: { [slot.id]: 'আমার <b>নতুন</b> লেখা & "more"' } } })!;

    assert.ok(edited.includes("আমার &lt;b&gt;নতুন&lt;/b&gt; লেখা &amp; \"more\""));
    assert.ok(!edited.includes("আমার <b>নতুন</b>"), "merchant text can never inject markup");
    assert.ok(Math.abs(edited.length - original.length) < 400, "only that one text changed");
  });

  test("multi-line text becomes line breaks", () => {
    const slot = getTemplateSlots("honey").find((s) => s.kind === "text" && s.tag === "h2")!;
    const edited = render("honey", { overrides: { text: { [slot.id]: "line one\nline two" } } })!;
    assert.ok(edited.includes("line one<br>line two"));
  });

  test("applies an image override and drops the template's responsive variants for it", () => {
    const slot = getTemplateSlots("amarshop").find((s) => s.kind === "image")!;
    const edited = render("amarshop", { overrides: { image: { [slot.id]: "https://cdn.example.com/mine.webp" } } })!;

    const tag = edited.match(new RegExp(`<img[^>]*data-gc-i="${slot.id}"[^>]*>`))![0];
    assert.ok(tag.includes('src="https://cdn.example.com/mine.webp"'));
    assert.ok(!/srcset="[^"]+"/.test(tag), "the old srcset must not win over the new image");
  });

  test("ignores an unsafe image override", () => {
    const slot = getTemplateSlots("honey").find((s) => s.kind === "image")!;
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>1</script>", '"><script>alert(1)</script>', "//evil.example/x.png"]) {
      const html = render("honey", { overrides: { image: { [slot.id]: bad } } })!;
      assert.equal(html, render("honey"), `rejected: ${bad}`);
      assert.equal(isSafeImageUrl(bad), false);
    }
    assert.equal(isSafeImageUrl("https://cdn.example.com/a.png"), true);
    assert.equal(isSafeImageUrl("/uploads/a.png"), true);
  });

  test("uses the store name as the page title until the merchant sets one", () => {
    assert.ok(render("honey")!.includes("<title>My Shop</title>"));
    assert.ok(render("honey", { overrides: { text: { title: "Pure Honey BD" } } })!.includes("<title>Pure Honey BD</title>"));
  });

  test("strips trackers and the source shop's checkout plumbing", () => {
    for (const id of ["honey", "amarshop", "gorgeous", "pmartbd"]) {
      const html = render(id)!;
      assert.ok(!/googletagmanager\.com|connect\.facebook\.net|fbq\(/.test(html), `${id}: no third-party trackers`);
      assert.ok(!/<form[^>]*\saction=/.test(html), `${id}: no form posts to the source site`);
      assert.ok(!/<base\b/i.test(html), `${id}: no <base>`);
    }
  });

  test("routes commerce links to the store's checkout and never to the source site", () => {
    const html = render("amarshop")!;
    assert.ok(html.includes('href="/myshop/checkout"'));
    assert.ok(html.includes('data-gc-cta="1"'));
    assert.ok(!/href="https?:\/\/amarshop\.borbila\.net/.test(html), "no link leaves for the source shop");
  });

  test("serves assets from our own copy or mirror, not by hot-linking the source site", () => {
    const html = render("honey")!;
    assert.ok(html.includes("/api/templates/honey/_o/wp-content/"));
    assert.ok(!/(src|href)="https?:\/\/lp\.webersayaf\.com\/wp-(content|includes)/.test(html));
    // wget's `file.js@ver=1` naming is restored to a real query string.
    assert.ok(!/\.js@ver=/.test(html));
  });

  test("links the pages of a multi-page template to each other under the store", () => {
    assert.deepEqual(listTemplatePages("organik"), ["about", "cart", "contact", "delivery-and-exchange", "search", "shop"]);
    assert.equal(hasTemplatePage("organik", "about"), true);
    assert.equal(hasTemplatePage("organik", "admin/login"), false, "captured admin pages are never served");
    assert.equal(hasTemplatePage("organik", "../honey/index"), false);

    const home = render("organik")!;
    assert.ok(home.includes('href="/myshop/about"'));
    const about = render("organik", { page: "about" })!;
    assert.ok(about.includes('href="/myshop"'));
    assert.equal(render("organik", { page: "nope" }), null);
  });

  test("preview and draft are marked noindex; live is not", () => {
    assert.ok(render("honey", { mode: "preview" })!.includes('name="robots" content="noindex, nofollow"'));
    assert.ok(render("honey", { mode: "draft" })!.includes('"mode":"draft"'));
    assert.ok(!render("honey")!.includes('name="robots"'));
  });

  test("sanitizeTemplateOverrides keeps only real slots with usable values", () => {
    const slots = getTemplateSlots("honey");
    const text = slots.find((s) => s.kind === "text" && s.id !== "title")!;
    const image = slots.find((s) => s.kind === "image")!;

    const clean = sanitizeTemplateOverrides("honey", {
      index: {
        text: { [text.id]: "hello", t99999: "stale", [image.id]: "wrong kind" },
        image: { [image.id]: "https://cdn.example.com/a.png", i99999: "https://cdn.example.com/b.png" },
      },
      "": { image: { [image.id]: "javascript:alert(1)" } },
      about: { text: { t1: "no such page on this template" } },
      "../../etc": { text: { t1: "x" } },
    });

    assert.deepEqual(Object.keys(clean), ["index"]);
    assert.deepEqual(clean.index.text, { [text.id]: "hello" });
    assert.deepEqual(clean.index.image, { [image.id]: "https://cdn.example.com/a.png" });
    assert.deepEqual(sanitizeTemplateOverrides("honey", null), {});
    assert.deepEqual(sanitizeTemplateOverrides("viral-funnel", { index: { text: { t1: "x" } } }), {});
  });

  test("template assets cannot escape the template folder", () => {
    assert.ok(resolveTemplateAsset("organik", "assets/styles-DmgeGJ2G.css"));
    assert.equal(resolveTemplateAsset("organik", "../../../package.json"), null);
    assert.equal(resolveTemplateAsset("organik", "..%2F..%2F..%2Fpackage.json"), null);
    assert.equal(resolveTemplateAsset("viral-funnel", "anything.css"), null);
  });

  test("the asset mirror only ever targets the template's own source host", () => {
    assert.equal(resolveOriginAssetUrl("honey", "wp-content/a.css?ver=1")?.toString(), "https://lp.webersayaf.com/wp-content/a.css?ver=1");
    assert.equal(resolveOriginAssetUrl("honey", "/evil.example/x.js")?.hostname, "lp.webersayaf.com");
    assert.equal(resolveOriginAssetUrl("honey", "\\\\evil.example/x.js")?.hostname ?? "lp.webersayaf.com", "lp.webersayaf.com");
    assert.equal(resolveOriginAssetUrl("viral-funnel", "a.css"), null);
    assert.equal(
      rewriteMirroredCss("honey", "@font-face{src:url(https://lp.webersayaf.com/wp-content/f.woff2)}"),
      "@font-face{src:url(/api/templates/honey/_o/wp-content/f.woff2)}"
    );
  });

  test("template pages are sandboxed away from the origin that serves them", () => {
    const csp = templateCsp("'self'");
    assert.match(csp, /^sandbox /);
    assert.ok(!csp.includes("allow-same-origin"), "third-party template scripts must not get this origin");
    assert.ok(csp.includes("frame-ancestors 'self'"));
  });
});
