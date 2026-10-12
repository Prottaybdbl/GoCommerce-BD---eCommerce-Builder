import type { SectionMeta } from "../../section-meta.js";

export const meta: SectionMeta = {
  type: "specs_table",
  name: "Specs Table",
  banglaName: "স্পেসিফিকেশন টেবিল",
  description: "Technical specification and warranty table.",
  category: "content",
  fullWidth: false,
  variants: ["striped", "bordered", "compact"],
  defaultVariant: "striped",
  maxPerPage: 2,
};
