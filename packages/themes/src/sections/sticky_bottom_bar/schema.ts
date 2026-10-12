import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  buttonText: z
    .string()
    .max(50)
    .default("অর্ডার করতে ক্লিক করুন")
    .meta(ui({ control: "text", label: "Button text", banglaLabel: "বাটনের লেখা", group: "Content", order: 1 })),
  ctaLabel: z
    .string()
    .max(50)
    .optional()
    .meta(ui({ control: "text", label: "CTA label", banglaLabel: "সিঁটিএ লেবেল", group: "Content", order: 2 })),
});

export type Settings = z.infer<typeof schema>;
