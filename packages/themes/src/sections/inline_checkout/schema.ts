import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  title: z
    .string()
    .max(140)
    .default("অর্ডার কনফার্ম করতে নিচের ফর্মটি পূরণ করুন")
    .meta(ui({ control: "text", label: "Form title", banglaLabel: "ফর্মের শিরোনাম", group: "Content", order: 1 })),
});

export type Settings = z.infer<typeof schema>;
