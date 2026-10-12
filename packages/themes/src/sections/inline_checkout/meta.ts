import type { SectionMeta } from "../../section-meta.js";

export const meta: SectionMeta = {
  type: "inline_checkout",
  name: "Inline Checkout",
  banglaName: "ইনলাইন চেকআউট",
  description: "Guest cash-on-delivery order form rendered directly on the page.",
  category: "commerce",
  fullWidth: false,
  variants: ["card", "bare"],
  defaultVariant: "card",
  maxPerPage: 1,
  requiredFeature: "guest_cod",
};
