import { z } from "zod";

export const sectionLocksSchema = z
  .object({
    removable: z.boolean().default(true),
    movable: z.boolean().default(true),
    duplicable: z.boolean().default(false),
    variantLocked: z.boolean().default(false),
  })
  .default({});

export const fieldConstraintSchema = z.object({
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  hidden: z.boolean().optional(),
  readOnly: z.boolean().optional(),
});

export const sectionInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  variant: z.string().optional(),
  enabled: z.boolean().default(true),
  settings: z.record(z.string(), z.unknown()).default({}),
  locks: sectionLocksSchema,
  constraints: z.record(z.string(), fieldConstraintSchema).default({}),
  requiresFeature: z.array(z.string()).default([]),
  whenMissing: z.enum(["hide", "downgrade", "upsell"]).default("hide"),
  downgradeTo: z.string().optional(),
});

export const pageDefinitionSchema = z.object({
  kind: z.enum(["landing", "home", "product", "collection", "cart", "custom"]).default("landing"),
  title: z.string(),
  shell: z.string().optional(),
  variants: z
    .record(
      z.string(),
      z.object({
        label: z.string(),
        sectionIds: z.array(z.string()),
      })
    )
    .optional(),
  sections: z.array(sectionInstanceSchema).default([]),
});

export const templateGallerySchema = z.object({
  thumb: z.string(),
  thumb2x: z.string().optional(),
  accent: z.string(),
  aspect: z.string().default("9/16"),
});

export const templateManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive().default(1),
  tier: z.enum(["landing", "shop"]).default("landing"),
  archetype: z.string(),
  status: z.enum(["draft", "published", "deprecated"]).default("draft"),
  name: z.string(),
  banglaName: z.string(),
  description: z.string(),
  banglaDescription: z.string().optional().default(""),
  tags: z.array(z.string()).default([]),
  bestFor: z.array(z.string()).default([]),
  gallery: templateGallerySchema.optional(),
  shell: z.string().default("single-column"),
  defaultPreset: z.string(),
  allowedPresets: z.array(z.string()).optional(),
  requiresFeature: z.array(z.string()).default([]),
  pages: z.record(z.string(), pageDefinitionSchema),
});

export type SectionLocks = z.infer<typeof sectionLocksSchema>;
export type FieldConstraint = z.infer<typeof fieldConstraintSchema>;
export type SectionInstanceSpec = z.infer<typeof sectionInstanceSchema>;
export type PageDefinitionSpec = z.infer<typeof pageDefinitionSchema>;
export type TemplateGallery = z.infer<typeof templateGallerySchema>;
export type TemplateManifest = z.infer<typeof templateManifestSchema>;
export type TemplateManifestInput = z.input<typeof templateManifestSchema>;
