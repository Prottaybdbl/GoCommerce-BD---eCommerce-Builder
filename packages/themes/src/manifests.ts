import { templateManifestSchema, type TemplateManifest } from "@gocom/contracts";
import { BUILTIN_LANDING_MANIFESTS } from "./manifests-data.js";
import type { ThemeTemplate, SectionInstance } from "./types.js";
import type { SectionType } from "./registry.js";

const MANIFEST_REGISTRY = new Map<string, TemplateManifest>();

// Initialize builtin manifests validated against schema
for (const manifest of BUILTIN_LANDING_MANIFESTS) {
  const parsed = templateManifestSchema.parse(manifest);
  MANIFEST_REGISTRY.set(parsed.id, parsed);
  if (parsed.archetype && !MANIFEST_REGISTRY.has(parsed.archetype)) {
    MANIFEST_REGISTRY.set(parsed.archetype, parsed);
  }
}

/**
 * Returns all registered template manifests.
 */
export function getAllManifests(): TemplateManifest[] {
  // Return unique manifests by ID
  const unique = new Map<string, TemplateManifest>();
  for (const m of MANIFEST_REGISTRY.values()) {
    unique.set(m.id, m);
  }
  return Array.from(unique.values());
}

/**
 * Gets a template manifest by ID or legacy archetype.
 */
export function getManifest(idOrArchetype?: string | null): TemplateManifest {
  if (idOrArchetype && MANIFEST_REGISTRY.has(idOrArchetype)) {
    return MANIFEST_REGISTRY.get(idOrArchetype)!;
  }
  return MANIFEST_REGISTRY.get("viral-funnel")!;
}

/**
 * Registers an additional or updated template manifest in memory.
 */
export function registerManifest(manifest: TemplateManifest): void {
  const parsed = templateManifestSchema.parse(manifest);
  MANIFEST_REGISTRY.set(parsed.id, parsed);
}

/**
 * Converts a TemplateManifest to legacy ThemeTemplate format
 * for full backward compatibility with existing code.
 */
export function manifestToLegacyTemplate(manifest: TemplateManifest, pageKey = "main"): ThemeTemplate {
  const page = manifest.pages[pageKey] || Object.values(manifest.pages)[0];
  const sections: SectionInstance[] = (page?.sections ?? []).map((sec) => ({
    id: sec.id,
    type: sec.type as SectionType,
    variant: sec.variant,
    enabled: sec.enabled ?? true,
    locks: sec.locks,
    constraints: sec.constraints,
    requiresFeature: sec.requiresFeature,
    whenMissing: sec.whenMissing,
    downgradeTo: sec.downgradeTo,
    settings: (sec.settings as Record<string, any>) ?? {},
  }));

  return {
    id: manifest.id,
    archetype: manifest.archetype as any,
    name: manifest.name,
    banglaName: manifest.banglaName,
    description: manifest.description,
    defaultPreset: manifest.defaultPreset,
    sections,
  };
}
