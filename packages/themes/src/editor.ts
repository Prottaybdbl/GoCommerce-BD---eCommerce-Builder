/**
 * Editor vocabulary — the single module the dashboard and the API both import so
 * that the form a merchant sees and the validation the server applies can never
 * drift apart.
 *
 * The dashboard renders `buildSectionForm()`; the API validates with
 * `validateDraft()`. Both read the same section schemas out of SECTION_REGISTRY.
 */
import type { TemplateManifest } from "@gocom/contracts";
import { SECTION_REGISTRY, getSectionMeta, getSectionSchema, type SectionType } from "./registry.js";
import { toUiSchema, applyConstraints, type UiField, type UiSpec } from "./schema-kit.js";
import type { SectionMeta } from "./section-meta.js";
import type { SectionInstance } from "./types.js";

/** Draft page as stored in `store_themes.draft.pages[key]`. */
export interface DraftPage {
  kind: string;
  title: string;
  shell?: string;
  sections: SectionInstance[];
}

/** The canonical editable tree. `resolveTheme()` reads exactly this shape. */
export interface ThemeDraft {
  templateId: string;
  templateVersion: number;
  pages: Record<string, DraftPage>;
}

export interface DraftValidationError {
  page: string;
  sectionId?: string;
  sectionType?: string;
  field?: string;
  message: string;
}

function newId(prefix: string): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

/**
 * Manifests express field constraints with the narrow
 * `{ min, max, hidden, readOnly }` vocabulary of `fieldConstraintSchema`
 * (packages/contracts/src/template.ts), while `applyConstraints` speaks the
 * richer UiSpec one. Translate per control so that a template pinning
 * `{ slides: { min: 3, max: 3 } }` really does yield exactly three slide slots.
 */
function toUiConstraints(
  fields: UiField[],
  constraints?: Record<string, any> | null
): Record<string, Partial<UiSpec>> | null {
  if (!constraints) return null;

  const byName = new Map(fields.map((f) => [f.name, f]));
  const out: Record<string, Partial<UiSpec>> = {};

  for (const [name, raw] of Object.entries(constraints)) {
    if (!raw || typeof raw !== "object") continue;
    const spec: Partial<UiSpec> = {};
    const control = byName.get(name)?.control;

    if (raw.hidden === true) {
      spec.control = "hidden";
    } else {
      if (control === "repeater" || control === "image_list" || control === "multiselect") {
        if (typeof raw.min === "number") spec.minItems = raw.min;
        if (typeof raw.max === "number") spec.maxItems = raw.max;
      } else {
        if (typeof raw.min === "number") spec.min = raw.min;
        if (typeof raw.max === "number") spec.max = raw.max;
      }
      // Pass through any UiSpec keys a template author wrote directly.
      if (typeof raw.minItems === "number") spec.minItems = raw.minItems;
      if (typeof raw.maxItems === "number") spec.maxItems = raw.maxItems;
      if (raw.readOnly === true) spec.readOnly = true;
      if (typeof raw.label === "string") spec.label = raw.label;
      if (typeof raw.banglaLabel === "string") spec.banglaLabel = raw.banglaLabel;
    }

    out[name] = spec;
  }

  return out;
}

/** Drops fields the dashboard must not render, at every nesting level. */
function stripHidden(fields: UiField[]): UiField[] {
  return fields
    .filter((f) => f.control !== "hidden")
    .map((f) => (f.itemFields ? { ...f, itemFields: stripHidden(f.itemFields) } : f));
}

/**
 * The ordered field descriptors the dashboard renders for one section instance,
 * already narrowed by that instance's template constraints.
 */
export function buildSectionForm(
  type: string,
  constraints?: Record<string, any> | null
): UiField[] {
  const schema = getSectionSchema(type);
  if (!schema) return [];
  const base = toUiSchema(schema);
  return stripHidden(applyConstraints(base, toUiConstraints(base, constraints)));
}

/** Every setting of a section at its schema-declared defaults. */
export function defaultSectionSettings(type: string): Record<string, any> {
  const schema = getSectionSchema(type);
  if (!schema || typeof schema.safeParse !== "function") return {};
  const parsed = schema.safeParse({});
  return parsed.success ? (parsed.data as Record<string, any>) : {};
}

/** A fresh, valid section ready to be appended to a page. */
export function createSectionInstance(
  type: string,
  overrides: Partial<SectionInstance> = {}
): SectionInstance {
  const meta = getSectionMeta(type) as SectionMeta | undefined;
  return {
    id: newId(`sec-${type.replace(/_/g, "-")}`),
    type: type as SectionType,
    variant: meta?.defaultVariant,
    enabled: true,
    settings: defaultSectionSettings(type),
    ...overrides,
  };
}

/**
 * Seeds the editable draft from a template manifest. Settings are schema
 * defaults with the manifest's authored values layered on top, so a merchant
 * starts from a complete, renderable page rather than a sparse object.
 */
export function buildDraftFromManifest(manifest: TemplateManifest): ThemeDraft {
  const pages: Record<string, DraftPage> = {};

  for (const [key, page] of Object.entries(manifest.pages)) {
    pages[key] = {
      kind: page.kind,
      title: page.title,
      shell: page.shell ?? manifest.shell,
      sections: (page.sections ?? []).map((sec) => ({
        id: sec.id,
        type: sec.type as SectionType,
        variant: sec.variant ?? (getSectionMeta(sec.type) as SectionMeta | undefined)?.defaultVariant,
        enabled: sec.enabled ?? true,
        locks: sec.locks,
        constraints: sec.constraints as SectionInstance["constraints"],
        requiresFeature: sec.requiresFeature,
        whenMissing: sec.whenMissing,
        downgradeTo: sec.downgradeTo,
        settings: {
          ...defaultSectionSettings(sec.type),
          ...((sec.settings as Record<string, any>) ?? {}),
        },
      })),
    };
  }

  return { templateId: manifest.id, templateVersion: manifest.version, pages };
}

/** Validates one section's settings against its registry schema. */
export function validateSectionSettings(
  type: string,
  settings: unknown
):
  | { ok: true; data: Record<string, any> }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const schema = getSectionSchema(type);
  if (!schema || typeof schema.safeParse !== "function") {
    return { ok: false, errors: [{ field: "", message: `Unknown section type '${type}'.` }] };
  }

  const parsed = schema.safeParse(settings ?? {});
  if (parsed.success) return { ok: true, data: parsed.data as Record<string, any> };

  return {
    ok: false,
    errors: (parsed.error.issues ?? []).map((issue: any) => ({
      field: (issue.path ?? []).join("."),
      message: issue.message,
    })),
  };
}

/** The section catalogue a merchant may add to a page, gated by entitlements. */
export function listAddableSections(features?: string[] | null): SectionMeta[] {
  const featureSet = features ? new Set(features) : null;
  const unlocked = (required?: string) => {
    if (!required) return true;
    if (!featureSet) return true;
    return featureSet.has(required) || featureSet.has("all") || featureSet.has("*");
  };

  return Object.keys(SECTION_REGISTRY)
    .map((type) => getSectionMeta(type) as SectionMeta)
    .filter((meta): meta is SectionMeta => Boolean(meta) && unlocked(meta.requiredFeature))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

/**
 * Full draft validation — what the API rejects a save with. Checks section
 * types exist, settings parse, entitlements cover each section, per-page
 * instance caps hold, and that no section the template marked non-removable
 * has been dropped.
 */
export function validateDraft(
  draft: unknown,
  opts: { manifest?: TemplateManifest | null; features?: string[] | null } = {}
): DraftValidationError[] {
  const errors: DraftValidationError[] = [];
  const featureSet = opts.features ? new Set(opts.features) : null;
  const hasFeature = (f: string) =>
    !featureSet || featureSet.has(f) || featureSet.has("all") || featureSet.has("*");

  const raw = (draft ?? {}) as any;
  const pages: Record<string, any> = raw.pages ?? {
    main: { sections: Array.isArray(raw.sections) ? raw.sections : Array.isArray(raw) ? raw : [] },
  };

  for (const [pageKey, page] of Object.entries(pages)) {
    const sections = Array.isArray(page?.sections) ? page.sections : [];
    const countByType = new Map<string, number>();

    for (const sec of sections) {
      if (!sec || typeof sec.type !== "string") {
        errors.push({ page: pageKey, message: "Section is missing a 'type'." });
        continue;
      }

      const meta = getSectionMeta(sec.type) as SectionMeta | undefined;
      if (!meta) {
        errors.push({
          page: pageKey,
          sectionId: sec.id,
          sectionType: sec.type,
          message: `Unknown section type '${sec.type}'.`,
        });
        continue;
      }

      if (meta.requiredFeature && !hasFeature(meta.requiredFeature)) {
        errors.push({
          page: pageKey,
          sectionId: sec.id,
          sectionType: sec.type,
          message: `Section '${sec.type}' requires the '${meta.requiredFeature}' entitlement.`,
        });
      }

      if (sec.variant && meta.variants.length > 0 && !meta.variants.includes(sec.variant)) {
        errors.push({
          page: pageKey,
          sectionId: sec.id,
          sectionType: sec.type,
          message: `Variant '${sec.variant}' is not available for '${sec.type}'.`,
        });
      }

      const next = (countByType.get(sec.type) ?? 0) + 1;
      countByType.set(sec.type, next);
      if (next > meta.maxPerPage) {
        errors.push({
          page: pageKey,
          sectionId: sec.id,
          sectionType: sec.type,
          message: `'${sec.type}' may appear at most ${meta.maxPerPage} time(s) per page.`,
        });
      }

      const result = validateSectionSettings(sec.type, sec.settings);
      if (!result.ok) {
        for (const err of result.errors) {
          errors.push({
            page: pageKey,
            sectionId: sec.id,
            sectionType: sec.type,
            field: err.field,
            message: err.message,
          });
        }
      }
    }

    // Sections the template author pinned must survive every edit.
    const manifestPage = opts.manifest?.pages?.[pageKey];
    if (manifestPage) {
      const presentTypes = new Set(sections.map((s: any) => s?.type));
      for (const sec of manifestPage.sections ?? []) {
        if (sec.locks?.removable === false && !presentTypes.has(sec.type)) {
          errors.push({
            page: pageKey,
            sectionType: sec.type,
            message: `Section '${sec.type}' cannot be removed from this template.`,
          });
        }
      }
    }
  }

  return errors;
}
