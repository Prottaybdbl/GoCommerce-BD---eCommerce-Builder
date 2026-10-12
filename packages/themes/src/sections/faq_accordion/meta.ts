import type { SectionMeta } from "../../section-meta.js";

export const meta: SectionMeta = {
  type: "faq_accordion",
  name: "FAQ Accordion",
  banglaName: "সাধারণ জিজ্ঞাসা (FAQ)",
  description: "Expandable questions and answers with zero JS requirements.",
  category: "content",
  fullWidth: false,
  variants: ["bordered", "cards", "plain"],
  defaultVariant: "bordered",
  maxPerPage: 2,
};
