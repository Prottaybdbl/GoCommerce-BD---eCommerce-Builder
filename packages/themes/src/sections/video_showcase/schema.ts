import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  title: z
    .string()
    .max(120)
    .default("প্রোডাক্টের রিয়েল ভিডিও রিভিউ")
    .meta(ui({ control: "text", label: "Title", banglaLabel: "শিরোনাম", group: "Content", order: 1 })),

  videoUrl: z
    .string()
    .max(2048)
    .default("")
    .meta(ui({ control: "video", label: "Video embed URL", banglaLabel: "ভিডিও লিংক", group: "Content", order: 2, help: "YouTube or Facebook embed URL. Section hides itself when empty." })),
});

export type Settings = z.infer<typeof schema>;
