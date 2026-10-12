/**
 * Schema Kit — the shared vocabulary every section schema is written in.
 *
 * Report §3.6 / §5. A section declares its settings ONCE as a Zod schema
 * annotated with `.meta(ui({...}))`. Three consumers read that single source:
 *
 *   1. the API, to validate merchant input before it is stored;
 *   2. the dashboard, to DERIVE the settings form (no hand-written forms);
 *   3. the storefront, to fill defaults for settings a merchant never touched.
 *
 * Zod note: we import from the `zod/v4` subpath. The installed zod@3.25.x ships
 * the complete Zod 4 API there — `.meta()` and `z.toJSONSchema()` — so we get
 * the report's mechanism without the breaking major bump that would force
 * `@hono/zod-openapi` 0.19 → 1.0 across the whole API surface.
 */
import { z } from "zod/v4";

export { z };

// ===========================================================================
// Control vocabulary (report §5.1) — 17 controls, closed set.
// A control the dashboard does not know how to render is a bug, not a
// fallback: keeping this closed is what makes derived forms safe.
// ===========================================================================
export const UI_CONTROLS = [
  "text",
  "textarea",
  "richtext",
  "number",
  "slider",
  "toggle",
  "select",
  "multiselect",
  "color",
  "image",
  "image_list",
  "video",
  "link",
  "icon_select",
  "repeater",
  "date",
  "hidden",
] as const;

export type UiControl = (typeof UI_CONTROLS)[number];

export interface UiSpec {
  control: UiControl;
  /** English label shown in the dashboard. */
  label?: string;
  /** Bangla label — the dashboard prefers this when the merchant's locale is bn. */
  banglaLabel?: string;
  help?: string;
  banglaHelp?: string;
  /** Group settings into collapsible panels, e.g. "Content", "Style". */
  group?: string;
  /** Lower sorts first within a group. */
  order?: number;
  placeholder?: string;
  /** For select / multiselect / icon_select. */
  options?: Array<{ value: string; label: string; banglaLabel?: string }>;
  /** For number / slider. */
  min?: number;
  max?: number;
  step?: number;
  /** For repeater / image_list — how many entries the merchant may add. */
  minItems?: number;
  maxItems?: number;
  /** Image guidance; purely advisory, enforced client-side before upload. */
  aspectRatio?: string;
  recommendedWidth?: number;
  /** Hide this control unless another setting holds a given value. */
  showIf?: { field: string; equals: string | number | boolean };
  /** Merchant cannot edit it; the template author fixed the value. */
  readOnly?: boolean;
}

/** Wraps a UiSpec for `.meta()`. Exists so the `ui` key is never misspelt. */
export function ui(spec: UiSpec): { ui: UiSpec } {
  return { ui: spec };
}

// ===========================================================================
// Reusable field shapes
// ===========================================================================

/**
 * A reference to an uploaded image. Stores the `media.uploadId` plus the
 * resolved URLs so the storefront never needs a join to render.
 *
 * Invariant #3: the server performs ZERO image processing — widths are
 * produced by the client before upload, and recorded here.
 */
export const imageRefSchema = z.object({
  uploadId: z.string().uuid().optional(),
  url: z.string().max(2048).default(""),
  /** width → URL, e.g. { "360": "...", "720": "...", "1080": "..." } */
  srcset: z.record(z.string(), z.string().max(2048)).default({}),
  alt: z.string().max(255).default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type ImageRef = z.infer<typeof imageRefSchema>;

export function imageRef(spec: Omit<UiSpec, "control"> = {}) {
  return imageRefSchema.default({ url: "", srcset: {}, alt: "" }).meta(
    ui({ control: "image", ...spec })
  );
}

export const linkSchema = z.object({
  label: z.string().max(120).default(""),
  href: z.string().max(2048).default("#"),
  newTab: z.boolean().default(false),
});

export type LinkValue = z.infer<typeof linkSchema>;

export function link(spec: Omit<UiSpec, "control"> = {}) {
  return linkSchema.default({ label: "", href: "#", newTab: false }).meta(
    ui({ control: "link", ...spec })
  );
}

// ===========================================================================
// Derived-form extraction
// ===========================================================================

export interface UiField extends UiSpec {
  /** Dot path into the settings object, e.g. `badges.0.title` uses `badges`. */
  name: string;
  required: boolean;
  /** Present when the schema declares one. */
  defaultValue?: unknown;
  /** For repeater / image_list: the per-item field descriptors. */
  itemFields?: UiField[];
}

function unwrap(schema: unknown): { inner: any; required: boolean; defaultValue?: unknown } {
  let node: any = schema;
  let required = true;
  let defaultValue: unknown;

  // Peel optional/nullable/default wrappers to reach the annotated core.
  for (let depth = 0; depth < 12; depth += 1) {
    const def = node?._zod?.def ?? node?._def;
    const typeName: string | undefined = def?.type ?? def?.typeName;
    if (typeName === "optional" || typeName === "nullable" || typeName === "ZodOptional" || typeName === "ZodNullable") {
      required = false;
      node = def.innerType;
      continue;
    }
    if (typeName === "default" || typeName === "ZodDefault" || typeName === "prefault") {
      required = false;
      if (defaultValue === undefined) {
        const dv = def.defaultValue;
        defaultValue = typeof dv === "function" ? dv() : dv;
      }
      node = def.innerType;
      continue;
    }
    break;
  }

  return { inner: node, required, defaultValue };
}

function readMeta(schema: any): UiSpec | undefined {
  // `.meta()` lives on the outermost wrapper in some authoring styles and on
  // the core in others, so check both before giving up.
  const candidates = [schema, unwrap(schema).inner];
  for (const c of candidates) {
    const m = typeof c?.meta === "function" ? c.meta() : undefined;
    if (m && typeof m === "object" && "ui" in m) return (m as { ui: UiSpec }).ui;
  }
  return undefined;
}

function objectShape(schema: any): Record<string, any> | null {
  const def = schema?._zod?.def ?? schema?._def;
  if (!def) return null;
  const type: string | undefined = def.type ?? def.typeName;
  if (type !== "object" && type !== "ZodObject") return null;
  const shape = typeof def.shape === "function" ? def.shape() : def.shape;
  return shape ?? null;
}

function arrayElement(schema: any): any | null {
  const def = schema?._zod?.def ?? schema?._def;
  if (!def) return null;
  const type: string | undefined = def.type ?? def.typeName;
  if (type !== "array" && type !== "ZodArray") return null;
  return def.element ?? def.type ?? null;
}

/**
 * Converts a section settings schema into the ordered field descriptors the
 * dashboard renders. A field with no `.meta(ui(...))` annotation is skipped —
 * that is how a template author keeps an internal setting out of the UI.
 */
export function toUiSchema(schema: unknown): UiField[] {
  const shape = objectShape(schema);
  if (!shape) return [];

  const fields: UiField[] = [];

  for (const [name, raw] of Object.entries(shape)) {
    const spec = readMeta(raw);
    if (!spec) continue;

    const { inner, required, defaultValue } = unwrap(raw);
    const field: UiField = { ...spec, name, required, defaultValue };

    if (spec.control === "repeater") {
      const element = arrayElement(inner);
      if (element) field.itemFields = toUiSchema(element);
    }

    fields.push(field);
  }

  return fields.sort((a, b) => {
    const ga = a.group ?? "";
    const gb = b.group ?? "";
    if (ga !== gb) return ga.localeCompare(gb);
    return (a.order ?? 100) - (b.order ?? 100);
  });
}

/**
 * Narrows a schema's UI descriptors with a template instance's `constraints`.
 *
 * This is the "template 5 has exactly 3 banners" mechanism (report §5.3):
 * the section schema allows 1..8 slides, the template instance pins
 * `{ slides: { minItems: 3, maxItems: 3 } }`, and the derived form then shows
 * exactly three banner uploads.
 */
export function applyConstraints(
  fields: UiField[],
  constraints?: Record<string, Partial<UiSpec>> | null
): UiField[] {
  if (!constraints) return fields;
  return fields
    .map((f) => {
      const c = constraints[f.name];
      if (!c) return f;
      // `control: "hidden"` is how a template removes a field from its form.
      return { ...f, ...c } as UiField;
    })
    .filter((f) => f.control !== "hidden");
}
