import type { SectionMeta } from "../../section-meta.js";

export const meta: SectionMeta = {
  type: "announcement_bar",
  name: "Announcement Bar",
  banglaName: "ঘোষণা বার",
  description: "Sticky promo strip at the very top of the page.",
  category: "promo",
  fullWidth: true,
  variants: ["solid", "gradient", "outline"],
  defaultVariant: "solid",
  maxPerPage: 1,
  pinned: "top",
};
