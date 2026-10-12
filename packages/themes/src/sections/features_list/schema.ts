import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  title: z
    .string()
    .max(120)
    .default("কেন এই প্রোডাক্টটি আপনার জন্য সেরা?")
    .meta(ui({ control: "text", label: "Title", banglaLabel: "শিরোনাম", group: "Content", order: 1 })),

  bulletPoints: z
    .array(z.string().max(200))
    .max(12)
    .default([])
    .meta(ui({
      control: "repeater",
      label: "Bullet points",
      banglaLabel: "ফিচার তালিকা",
      group: "Content",
      order: 2,
      minItems: 0,
      maxItems: 12,
      help: "Leave empty to fall back to the product's own feature list.",
    })),
});

export type Settings = z.infer<typeof schema>;
