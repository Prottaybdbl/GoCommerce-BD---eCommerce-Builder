import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  showRatingBadge: z
    .boolean()
    .default(true)
    .meta(ui({ control: "toggle", label: "Show rating badge", banglaLabel: "রেটিং ব্যাজ", group: "Badges", order: 1 })),

  ratingScore: z
    .string()
    .max(16)
    .default("৪.৯/৫")
    .meta(ui({ control: "text", label: "Rating score", banglaLabel: "রেটিং স্কোর", group: "Badges", order: 2, showIf: { field: "showRatingBadge", equals: true } })),

  showStockBadge: z
    .boolean()
    .default(true)
    .meta(ui({ control: "toggle", label: "Show stock badge", banglaLabel: "স্টক ব্যাজ", group: "Badges", order: 3 })),

  stockText: z
    .string()
    .max(40)
    .default("ইন-স্টক")
    .meta(ui({ control: "text", label: "Stock text", banglaLabel: "স্টক লেখা", group: "Badges", order: 4, showIf: { field: "showStockBadge", equals: true } })),

  showDiscountBadge: z
    .boolean()
    .default(true)
    .meta(ui({ control: "toggle", label: "Show discount badge", banglaLabel: "ছাড়ের ব্যাজ", group: "Badges", order: 5 })),

  discountText: z
    .string()
    .max(40)
    .default("স্পেশাল ছাড়")
    .meta(ui({ control: "text", label: "Discount text", banglaLabel: "ছাড়ের লেখা", group: "Badges", order: 6, showIf: { field: "showDiscountBadge", equals: true } })),

  primaryCtaText: z
    .string()
    .max(80)
    .default("অর্ডার করতে এখানে ক্লিক করুন 👉")
    .meta(ui({ control: "text", label: "Button text", banglaLabel: "বাটনের লেখা", group: "Content", order: 1 })),
});

export type Settings = z.infer<typeof schema>;
