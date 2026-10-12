import fs from "node:fs";
import path from "node:path";

interface TemplateInfo {
  category: string;
  folderName: string;
  title: string;
  headings: string[];
  bannerCount: number;
  images: string[];
  hasOtherPages: boolean;
  sampleCopy: string;
}

const BASE_PATH = "D:\\templets";

function inspectDirectory() {
  const categories = [
    { dir: "1. single landing page", tier: "landing", type: "single" },
    { dir: "2. multi page landing page", tier: "landing", type: "multi" },
    { dir: "3. e commerce", tier: "shop", type: "ecommerce" }
  ];

  const results: TemplateInfo[] = [];

  for (const cat of categories) {
    const catPath = path.join(BASE_PATH, cat.dir);
    if (!fs.existsSync(catPath)) continue;

    const subfolders = fs.readdirSync(catPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const folder of subfolders) {
      const folderPath = path.join(catPath, folder);
      const files = fs.readdirSync(folderPath);
      const htmlFiles = files.filter(f => f.endsWith(".html"));

      let title = folder;
      const headings: string[] = [];
      let sampleCopy = "";
      let bannerCount = 0;

      const indexPath = path.join(folderPath, "index.html");
      if (fs.existsSync(indexPath)) {
        try {
          const content = fs.readFileSync(indexPath, "utf8");
          const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();

          const h1Matches = content.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi);
          for (const m of h1Matches) {
            const clean = m[1].replace(/&[a-z0-9]+;/gi, " ").trim();
            if (clean && clean.length > 3 && clean.length < 80 && headings.length < 5) {
              headings.push(clean);
            }
          }

          // Count carousel/banner indicators
          const sliderMatches = content.match(/swiper-slide|carousel-item|slick-slide|banner-slide|slider-item/gi);
          if (sliderMatches) {
            bannerCount = Math.min(Math.max(sliderMatches.length, 1), 6);
          } else {
            bannerCount = 1;
          }

          // Sample Bengali copy
          const bengaliText = content.match(/[\u0980-\u09FF\s।,!?]{10,80}/g);
          if (bengaliText && bengaliText.length > 0) {
            sampleCopy = bengaliText.slice(0, 3).map(s => s.trim()).filter(Boolean).join(" | ");
          }
        } catch (e) {
          // ignore read error
        }
      }

      results.push({
        category: cat.dir,
        folderName: folder,
        title,
        headings,
        bannerCount,
        images: files.filter(f => /\.(png|jpe?g|webp|svg)$/i.test(f)),
        hasOtherPages: htmlFiles.length > 1,
        sampleCopy: sampleCopy.slice(0, 150)
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

inspectDirectory();
