import path from "node:path";
import { getManifest } from "@gocom/themes";
import {
  TEMPLATE_REGISTRY,
  getTemplateDir,
  getTemplateSourceStatus,
  renderTemplateHtml,
  resolveTemplateAsset,
} from "@gocom/themes/html";

export { TEMPLATE_REGISTRY };
export type { TemplateDiskInfo } from "@gocom/themes/html";

/**
 * Helper to get MIME type from file extension
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html": return "text/html; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    case ".ico": return "image/x-icon";
    case ".woff": return "font/woff";
    case ".woff2": return "font/woff2";
    case ".ttf": return "font/ttf";
    default: return "application/octet-stream";
  }
}

/**

/**
 * Renders the preview HTML for the 5 core dynamic archetypes
 */
function renderCoreArchetypePreview(templateId: string): string {
  const manifest = getManifest(templateId);
  const accent = manifest?.gallery?.accent || "#2563eb";
  const name = manifest?.name || "Premium Storefront";
  const bnName = manifest?.banglaName || name;
  const description = manifest?.banglaDescription || manifest?.description || "সেরা কোয়ালিটির প্রোডাক্ট কিনুন সারা দেশে ক্যাশ অন ডেলিভারিতে!";

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${bnName} — প্রিভিউ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${accent};
      --primary-light: ${accent}15;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Hind Siliguri', 'Inter', sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.5; }
    .announcement { background: var(--primary); color: #fff; text-align: center; padding: 8px 16px; font-size: 13px; font-weight: 600; }
    .header { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; max-width: 1000px; margin: 0 auto; }
    .logo { font-size: 20px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }
    .logo-badge { background: var(--primary); color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 9999px; }
    .header-btn { background: var(--primary); color: #fff; border: 0; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
    .container { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
    .hero { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px 24px; text-align: center; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); margin-bottom: 24px; }
    .badge { display: inline-block; background: var(--primary-light); color: var(--primary); font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; margin-bottom: 12px; }
    .hero-title { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 10px; line-height: 1.3; }
    .hero-sub { font-size: 15px; color: #64748b; max-width: 600px; margin: 0 auto 24px; }
    .hero-img-box { position: relative; border-radius: 12px; overflow: hidden; background: #f1f5f9; aspect-ratio: 16/9; max-width: 680px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    .hero-img-box img { width: 100%; height: 100%; object-fit: cover; }
    .price-tag { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
    .current-price { font-size: 32px; font-weight: 800; color: var(--primary); }
    .regular-price { font-size: 18px; color: #94a3b8; text-decoration: line-through; }
    .save-badge { background: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
    .cta-btn { display: inline-block; width: 100%; max-width: 480px; background: var(--primary); color: #fff; font-size: 18px; font-weight: 800; text-align: center; padding: 14px 28px; border-radius: 12px; text-decoration: none; cursor: pointer; border: 0; box-shadow: 0 10px 25px -5px ${accent}40; transition: transform .15s; }
    .cta-btn:hover { transform: translateY(-2px); }
    .trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; text-align: center; }
    .trust-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .trust-icon { font-size: 22px; margin-bottom: 4px; }
    .trust-title { font-size: 13px; font-weight: 700; color: #1e293b; }
    .features-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; margin-bottom: 24px; }
    .features-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 16px; text-align: center; }
    .features-list { list-style: none; display: grid; grid-template-columns: 1fr; gap: 10px; }
    .features-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #334155; }
    .features-item::before { content: "✓"; display: inline-flex; width: 22px; height: 22px; background: #dcfce7; color: #16a34a; border-radius: 50%; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .checkout-mock { background: #fff; border-radius: 16px; border: 2px solid var(--primary); padding: 28px; margin-bottom: 32px; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06); }
    .checkout-mock h3 { font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 16px; color: #0f172a; }
    .input-mock { width: 100%; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; margin-bottom: 12px; font-family: inherit; }
  </style>
</head>
<body>
  <div class="announcement">🔥 সারা দেশে ফ্রি হোম ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা! সীমিত সময়ের অফার</div>
  <header class="header">
    <div class="logo">
      <span>${bnName}</span>
      <span class="logo-badge">অফিসিয়াল স্টোর</span>
    </div>
    <button class="header-btn" onclick="document.getElementById('checkout-form').scrollIntoView({behavior:'smooth'})">অর্ডার করুন</button>
  </header>

  <main class="container">
    <section class="hero">
      <span class="badge">১০০% খাঁটি ও অরিজিনাল পণ্য</span>
      <h1 class="hero-title">${bnName} — প্রিমিয়াম কোয়ালিটি</h1>
      <p class="hero-sub">${description}</p>

      <div class="hero-img-box">
        <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&q=80" alt="${name}">
      </div>

      <div class="price-tag">
        <span class="current-price">৳১,০৫০</span>
        <span class="regular-price">৳১,৪৫০</span>
        <span class="save-badge">৳৪০০ ছাড়</span>
      </div>

      <button class="cta-btn" onclick="document.getElementById('checkout-form').scrollIntoView({behavior:'smooth'})">
        অর্ডার করতে এখানে ক্লিক করুন 👉
      </button>

      <div class="trust-grid">
        <div class="trust-card">
          <div class="trust-icon">🚚</div>
          <div class="trust-title">দ্রুত হোম ডেলিভারি</div>
        </div>
        <div class="trust-card">
          <div class="trust-icon">💵</div>
          <div class="trust-title">ক্যাশ অন ডেলিভারি</div>
        </div>
        <div class="trust-card">
          <div class="trust-icon">🛡️</div>
          <div class="trust-title">১০০% মানিব্যাক গ্যারান্টি</div>
        </div>
      </div>
    </section>

    <section class="features-card">
      <h2 class="features-title">কেন আমাদের থেকে নিবেন?</h2>
      <ul class="features-list">
        <li class="features-item">শতভাগ অথেনটিক ও গ্যারান্টিযুক্ত উপাদান</li>
        <li class="features-item">পণ্য হাতে পেয়ে পরীক্ষা করে মূল্য পরিশোধের সুযোগ</li>
        <li class="features-item">২৪ ঘণ্টা ডেডিকেটেড গ্রাহক সেবা ও পরামর্শ</li>
        <li class="features-item">সারা দেশে ৩-৫ কার্যদিবসে দ্রুততম সময়ে ডেলিভারি</li>
      </ul>
    </section>

    <section class="checkout-mock" id="checkout-form">
      <h3>অর্ডার কনফার্ম করতে নিচের তথ্যগুলো দিন</h3>
      <input type="text" class="input-mock" placeholder="আপনার নাম লিখুন..." disabled value="মোঃ আব্দুল্লাহ">
      <input type="text" class="input-mock" placeholder="মোবাইল নম্বর লিখুন..." disabled value="০১৭১১২২৩৩৪৪">
      <input type="text" class="input-mock" placeholder="সম্পূর্ণ ঠিকানা লিখুন..." disabled value="ধানমন্ডি, ঢাকা">
      <button class="cta-btn" style="width:100%;max-width:none" onclick="alert('এটি ডেমো প্রিভিউ। লাইভ ওয়েবসাইটে কাস্টমারদের আসল অর্ডার নেওয়া হবে।')">
        অর্ডার কনফার্ম করুন (৳১,০৫০)
      </button>
    </section>
  </main>
</body>
</html>`;
}

/**
 * Loads, optimizes, and transforms template HTML for live preview inside dashboard iframe

/**
 * A template the gallery lists but whose design we cannot show yet: either its
 * source has not been added to `templets/`, or it is an app shell with no
 * markup of its own. Saying so beats rendering a generic page that looks like
 * every other template.
 */
function renderUnavailablePreview(templateId: string): string {
  const info = TEMPLATE_REGISTRY[templateId];
  const name = (info?.banglaName || info?.name || templateId).replace(/[<>&"]/g, "");
  return `<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${name}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;text-align:center;padding:24px}div{max-width:420px}h1{font-size:18px;margin:0 0 8px}p{font-size:14px;line-height:1.6;color:#64748b;margin:0}</style></head><body><div><h1>${name}</h1><p>এই ডিজাইনটির লাইভ প্রিভিউ এখনো প্রস্তুত হয়নি। শীঘ্রই যুক্ত করা হবে।</p></div></body></html>`;
}

export interface TemplatePreview {
  html: string;
  /** True when this is the template's own markup and must be served sandboxed. */
  isTemplateMarkup: boolean;
}

/**
 * The gallery preview of a template: its original page, untouched, exactly as
 * the merchant's store will look before they change anything.
 */
export function getTemplatePreview(templateId: string, page?: string): TemplatePreview | null {
  const info = TEMPLATE_REGISTRY[templateId];
  if (!info) return null;

  const status = getTemplateSourceStatus(templateId);

  // Section-engine designs — the five archetypes, and shop templates whose own
  // pages are not in `templets/` yet — are previewed as the sections they render.
  if (status === "missing" && (!info.categoryDir || info.tier === "shop")) {
    return { html: renderCoreArchetypePreview(templateId), isTemplateMarkup: false };
  }

  if (status !== "ok") {
    return { html: renderUnavailablePreview(templateId), isTemplateMarkup: false };
  }

  const base = `/api/templates/${templateId}/preview`;
  const html = renderTemplateHtml(templateId, {
    page,
    mode: "preview",
    checkoutUrl: "#",
    pageUrl: (key) => (key ? `${base}?page=${encodeURIComponent(key)}` : base),
  });
  return html ? { html, isTemplateMarkup: true } : null;
}

/** Returns the folder on disk for a given template ID. */
export function getTemplateDiskDirectory(templateId: string): string | null {
  return getTemplateDir(templateId);
}

/** Resolves a static asset inside a template's own folder. */
export function resolveTemplateAssetPath(templateId: string, subPath: string): { localPath?: string } {
  const localPath = resolveTemplateAsset(templateId, subPath);
  return localPath ? { localPath } : {};
}
