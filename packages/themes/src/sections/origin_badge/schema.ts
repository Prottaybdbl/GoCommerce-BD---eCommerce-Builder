import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  origin: z
    .string()
    .max(200)
    .default("সুন্দরবন ও স্থানীয় জৈব খামার")
    .meta(ui({ control: "text", label: "Origin", banglaLabel: "উৎস", group: "Content", order: 1 })),

  guarantee: z
    .string()
    .max(200)
    .default("শতভাগ খাঁটি, রাসায়নিক ও ভেজালমুক্ত")
    .meta(ui({ control: "text", label: "Purity guarantee", banglaLabel: "বিশুদ্ধতার নিশ্চয়তা", group: "Content", order: 2 })),

  harvestDate: z
    .string()
    .max(60)
    .optional()
    .meta(ui({ control: "text", label: "Harvest date", banglaLabel: "সংগ্রহের তারিখ", group: "Content", order: 3 })),
});

export type Settings = z.infer<typeof schema>;
