import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  title: z
    .string()
    .max(120)
    .default("টেকনিক্যাল স্পেসিফিকেশন")
    .meta(ui({ control: "text", label: "Title", banglaLabel: "শিরোনাম", group: "Content", order: 1 })),

  warranty: z
    .string()
    .max(160)
    .default("১ বছরের অফিসিয়াল ব্র্যান্ড ওয়ারেন্টি")
    .meta(ui({ control: "text", label: "Warranty", banglaLabel: "ওয়ারেন্টি", group: "Content", order: 2 })),

  replacement: z
    .string()
    .max(160)
    .default("৭ দিনের ইনস্ট্যান্ট রিপ্লেসমেন্ট গ্যারান্টি")
    .meta(ui({ control: "text", label: "Replacement policy", banglaLabel: "রিপ্লেসমেন্ট", group: "Content", order: 3 })),

  specs: z
    .array(
      z.object({
        label: z.string().max(80).default("").meta(ui({ control: "text", label: "Label", banglaLabel: "শিরোনাম" })),
        value: z.string().max(240).default("").meta(ui({ control: "text", label: "Value", banglaLabel: "বিবরণ" })),
      })
    )
    .max(20)
    .default([])
    .meta(ui({
      control: "repeater",
      label: "Spec rows",
      banglaLabel: "স্পেসিফিকেশন",
      group: "Content",
      order: 4,
      minItems: 0,
      maxItems: 20,
      help: "Leave empty to auto-generate rows from the product.",
    })),
});

export type Settings = z.infer<typeof schema>;
