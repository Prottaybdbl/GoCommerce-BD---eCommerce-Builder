import { z, ui } from "../../schema-kit.js";

const ICON_OPTIONS = [
  { value: "truck", label: "Delivery truck", banglaLabel: "ডেলিভারি" },
  { value: "shield", label: "Shield", banglaLabel: "গ্যারান্টি" },
  { value: "refresh", label: "Return", banglaLabel: "রিটার্ন" },
];

export const schema = z.object({
  badges: z
    .array(
      z.object({
        icon: z
          .enum(["truck", "shield", "refresh"])
          .default("truck")
          .meta(ui({ control: "icon_select", label: "Icon", banglaLabel: "আইকন", options: ICON_OPTIONS })),
        title: z.string().max(60).default("").meta(ui({ control: "text", label: "Title", banglaLabel: "শিরোনাম" })),
        desc: z.string().max(90).default("").meta(ui({ control: "text", label: "Subtitle", banglaLabel: "বিবরণ" })),
      })
    )
    .max(6)
    .default([])
    .meta(ui({
      control: "repeater",
      label: "Trust badges",
      banglaLabel: "ট্রাস্ট ব্যাজ",
      group: "Content",
      order: 1,
      minItems: 0,
      maxItems: 6,
    })),
});

export type Settings = z.infer<typeof schema>;
