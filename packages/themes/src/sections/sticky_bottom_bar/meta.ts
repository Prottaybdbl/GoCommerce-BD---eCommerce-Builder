import type { SectionMeta } from "../../section-meta.js";

export const meta: SectionMeta = {
  type: "sticky_bottom_bar",
  name: "Sticky Bottom Bar",
  banglaName: "স্টিকি অর্ডার বার",
  description: "Floating mobile bottom bar with price and instant checkout trigger.",
  category: "commerce",
  fullWidth: true,
  variants: ["price-cta", "minimal"],
  defaultVariant: "price-cta",
  maxPerPage: 1,
  pinned: "bottom",
};
