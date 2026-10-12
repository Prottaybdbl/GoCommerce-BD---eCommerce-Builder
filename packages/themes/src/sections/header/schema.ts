import { z, ui } from "../../schema-kit.js";

export const schema = z.object({
  showLogo: z
    .boolean()
    .default(true)
    .meta(ui({ control: "toggle", label: "Show logo", banglaLabel: "লোগো দেখান", group: "Layout", order: 1 })),

  showPhoneCall: z
    .boolean()
    .default(true)
    .meta(ui({ control: "toggle", label: "Show call button", banglaLabel: "কল বাটন দেখান", group: "Layout", order: 2 })),
});

export type Settings = z.infer<typeof schema>;
