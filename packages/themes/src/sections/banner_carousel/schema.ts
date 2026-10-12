import { z, ui } from "../../schema-kit.js";

const ASPECT_OPTIONS = [
  { value: "16:9", label: "16:9 — wide", banglaLabel: "১৬:৯ (চওড়া)" },
  { value: "21:9", label: "21:9 — cinematic", banglaLabel: "২১:৯ (সিনেমাটিক)" },
  { value: "4:3", label: "4:3 — classic", banglaLabel: "৪:৩ (ক্লাসিক)" },
  { value: "1:1", label: "1:1 — square", banglaLabel: "১:১ (স্কয়ার)" },
];

export const schema = z.object({
  slides: z
    .array(
      z.object({
        id: z.string().max(40).default("").meta(ui({ control: "hidden", label: "Slide id" })),
        imageUrl: z
          .string()
          .max(2048)
          .default("")
          .meta(ui({
            control: "image",
            label: "Banner image",
            banglaLabel: "ব্যানারের ছবি",
            aspectRatio: "16:9",
            recommendedWidth: 1080,
            help: "Resized in the browser to 360/720/1080 px before upload.",
            banglaHelp: "ব্রাউজারেই ৩৬০/৭২০/১০৮০ পিক্সেলে রিসাইজ হয়ে আপলোড হবে।",
          })),
        headline: z
          .string()
          .max(90)
          .default("")
          .meta(ui({ control: "text", label: "Headline", banglaLabel: "শিরোনাম" })),
        subtext: z
          .string()
          .max(160)
          .default("")
          .meta(ui({ control: "text", label: "Subtext", banglaLabel: "সাবটেক্সট" })),
        ctaLabel: z
          .string()
          .max(40)
          .default("অর্ডার করুন")
          .meta(ui({ control: "text", label: "Button text", banglaLabel: "বাটনের লেখা" })),
        ctaLink: z
          .string()
          .max(2048)
          .default("#sec-checkout")
          .meta(ui({ control: "text", label: "Button link", banglaLabel: "বাটনের লিঙ্ক" })),
      })
    )
    .max(8)
    .default([])
    .meta(ui({
      control: "repeater",
      label: "Banner slides",
      banglaLabel: "ব্যানার স্লাইড",
      group: "Content",
      order: 1,
      minItems: 1,
      maxItems: 8,
    })),

  autoplay: z
    .boolean()
    .default(true)
    .meta(ui({ control: "toggle", label: "Autoplay", banglaLabel: "অটো-স্লাইড", group: "Behaviour", order: 1 })),

  aspectRatio: z
    .enum(["16:9", "21:9", "4:3", "1:1"])
    .default("16:9")
    .meta(ui({
      control: "select",
      label: "Aspect ratio",
      banglaLabel: "অনুপাত",
      group: "Style",
      order: 1,
      options: ASPECT_OPTIONS,
    })),
});

export type Settings = z.infer<typeof schema>;
