import type { ThemeArchetype } from "@gocom/contracts";
import { getManifest, getAllManifests, manifestToLegacyTemplate } from "./manifests.js";
import type { DesignPreset, ThemeTemplate } from "./types.js";
export * from "./resolve.js";

export function getTemplateForArchetype(archetype?: ThemeArchetype | null): ThemeTemplate {
  const manifest = getManifest(archetype);
  return manifestToLegacyTemplate(manifest);
}

export function listTemplates(): ThemeTemplate[] {
  return getAllManifests().map((m) => manifestToLegacyTemplate(m));
}
