import type { SectionMeta } from "../../section-meta.js";

export const meta: SectionMeta = {
  type: "banner_carousel",
  name: "Banner Carousel",
  banglaName: "ব্যানার ক্যারোসেল",
  description: "Swipeable hero banners with headline, subtext and a call-to-action.",
  category: "hero",
  fullWidth: false,
  variants: ["cover", "split", "minimal"],
  defaultVariant: "cover",
  maxPerPage: 1,
};
