import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  text: z
    .string()
    .max(160)
    .default("সারা দেশে ফ্রি হোম ডেলিভারি এবং ক্যাশ অন ডেলিভারি সুবিধা!")
    .meta(ui({ control: "text", label: "Announcement text", banglaLabel: "ঘোষণার লেখা", group: "Content", order: 1 })),

  badge: z
    .string()
    .max(40)
    .default("সীমিত সময়ের অফার")
    .meta(ui({ control: "text", label: "Badge", banglaLabel: "ব্যাজ", group: "Content", order: 2 })),

  highlightEmoji: z
    .string()
    .max(8)
    .default("🔥")
    .meta(ui({ control: "text", label: "Emoji", banglaLabel: "ইমোজি", group: "Content", order: 3 })),

  endsAt: z
    .string()
    .max(40)
    .optional()
    .meta(ui({ control: "date", label: "Offer ends at", banglaLabel: "অফার শেষ", group: "Content", order: 4, help: "Leave empty for no countdown." })),
});

export type Settings = z.infer<typeof schema>;
