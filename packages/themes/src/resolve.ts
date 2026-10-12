import type { ThemeArchetype, ThemeTokens, TemplateManifest } from "@gocom/contracts";
import { DESIGN_PRESETS, DEFAULT_PRESET } from "./presets.js";
import { getManifest, manifestToLegacyTemplate } from "./manifests.js";
import { SECTION_REGISTRY, type SectionType } from "./registry.js";
import { getShell, type PageShell } from "./shells.js";
import type { DesignPreset, SectionInstance, ThemeTemplate, ResolvedTheme } from "./types.js";

export function getPreset(presetId?: string | null): DesignPreset {
  if (presetId && DESIGN_PRESETS[presetId]) {
    return DESIGN_PRESETS[presetId];
  }
  return DEFAULT_PRESET;
}

export function listPresets(): DesignPreset[] {
  return Object.values(DESIGN_PRESETS);
}

export interface ResolveThemeInput {
  templateId?: string | null;
  templateVersion?: number | null;
  themeArchetype?: ThemeArchetype | string | null;
  presetId?: string | null;
  tokenOverrides?: Record<string, any> | null;
  globalSections?: Record<string, any> | null;
  themeConfig?: Record<string, any> | null;
  themeTokens?: Partial<ThemeTokens> | null;
  published?: any;
  draft?: any;
  features?: string[] | null;
}

export interface ResolveThemeOptions {
  page?: string;
  variant?: string;
  previewPreset?: string | null;
  previewSections?: SectionInstance[] | null;
  isEditor?: boolean;
}

/**
 * Resolves full theme structure, active design preset, dynamic sections, and page shell.
 * Type-agnostic, schema-driven, with feature gating and backward compatibility for legacy configs.
 */
export function resolveTheme(
  store?: ResolveThemeInput | null,
  options?: ResolveThemeOptions
): ResolvedTheme {
  const pageKey = options?.page || "main";
  const idOrArchetype = store?.templateId || store?.themeArchetype || "viral-funnel";
  const manifest = getManifest(idOrArchetype);

  // 1. Resolve design preset
  let presetKey = options?.previewPreset || store?.presetId || (store?.themeConfig?.presetId as string) || manifest.defaultPreset;
  if (manifest.allowedPresets && manifest.allowedPresets.length > 0 && !manifest.allowedPresets.includes(presetKey)) {
    presetKey = manifest.defaultPreset;
  }
  const basePreset = getPreset(presetKey);

  // Apply custom theme tokens / tokenOverrides
  const tokenOverrides = store?.tokenOverrides || {};
  const themeTokens = store?.themeTokens || {};
  const preset: DesignPreset = {
    ...basePreset,
    primaryColor: (tokenOverrides.primary || themeTokens.primaryColor || basePreset.primaryColor) as string,
    accentColor: (tokenOverrides.accent || themeTokens.accentColor || basePreset.accentColor) as string,
    backgroundColor: (tokenOverrides.background || themeTokens.backgroundColor || basePreset.backgroundColor) as string,
    textColor: (tokenOverrides.text || themeTokens.textColor || basePreset.textColor) as string,
    borderRadius: (tokenOverrides.radius || themeTokens.borderRadius || basePreset.borderRadius) as string,
    fontFamily: (tokenOverrides.fontFamily || basePreset.fontFamily) as string,
  };

  // 2. Resolve page shell — an edited draft or a published snapshot may have
  // chosen a different shell than the manifest ships with.
  const pageDef = manifest.pages[pageKey] || Object.values(manifest.pages)[0];
  const overriddenShell =
    (options?.isEditor ? store?.draft?.pages?.[pageKey]?.shell : undefined) ||
    store?.published?.pages?.[pageKey]?.shell ||
    store?.published?.shell?.id;
  const shellKey = overriddenShell || pageDef?.shell || manifest.shell || "single-column";
  const shell = getShell(shellKey);

  // 3. Resolve sections
  // Precedence: explicit preview sections → the editor's unpublished draft →
  // the published snapshot → legacy themeConfig → the manifest's own defaults.
  // The draft must outrank `published`, otherwise a store that has published
  // once could never preview its next change.
  let rawSections: any[] = [];
  if (options?.previewSections && Array.isArray(options.previewSections)) {
    rawSections = options.previewSections;
  } else if (options?.isEditor && store?.draft) {
    if (Array.isArray(store.draft)) {
      rawSections = store.draft;
    } else if (store.draft.pages?.[pageKey]?.sections) {
      rawSections = store.draft.pages[pageKey].sections;
    } else if (Array.isArray(store.draft.sections)) {
      rawSections = store.draft.sections;
    }
  } else if (store?.published) {
    if (Array.isArray(store.published)) {
      rawSections = store.published;
    } else if (store.published.pages?.[pageKey]?.sections) {
      rawSections = store.published.pages[pageKey].sections;
    } else if (Array.isArray(store.published.sections)) {
      rawSections = store.published.sections;
    }
  } else if (store?.themeConfig?.sections && Array.isArray(store.themeConfig.sections)) {
    rawSections = store.themeConfig.sections;
  } else if (pageDef?.sections) {
    rawSections = pageDef.sections;
  }

  // A draft or snapshot that holds no sections for this page falls back to the
  // manifest so the merchant never faces a blank storefront.
  if (rawSections.length === 0 && pageDef?.sections?.length) {
    rawSections = pageDef.sections;
  }

  // 4. Feature gating & resolution
  const featuresSet = store?.features ? new Set(store.features) : null;
  const sections: SectionInstance[] = [];

  for (const sec of rawSections) {
    let activeType = sec.type;
    const requiresFeature = sec.requiresFeature as string[] | undefined;

    if (featuresSet && requiresFeature && requiresFeature.length > 0) {
      const hasAll = requiresFeature.every((f) => featuresSet.has(f));
      if (!hasAll) {
        const whenMissing = sec.whenMissing || "hide";
        if (whenMissing === "hide") {
          continue;
        } else if (whenMissing === "downgrade" && sec.downgradeTo) {
          activeType = sec.downgradeTo;
        } else if (whenMissing === "upsell") {
          if (!options?.isEditor) {
            // Live page never renders upsell card
            continue;
          }
        }
      }
    }

    // Default settings from registry schema if known
    let defaultSettings: Record<string, any> = {};
    const registryEntry = SECTION_REGISTRY[activeType as SectionType] as any;
    const schemaObj = registryEntry?.schema || registryEntry?.settingsSchema;
    if (schemaObj && typeof schemaObj.safeParse === "function") {
      const parsedDefaults = schemaObj.safeParse({});
      if (parsedDefaults.success) {
        defaultSettings = parsedDefaults.data as Record<string, any>;
      }
    }

    const mergedSettings = {
      ...defaultSettings,
      ...(sec.settings || {}),
    };

    // Legacy backwards compatibility for store.themeConfig fields
    if (store?.themeConfig) {
      if (activeType === "announcement_bar" && store.themeConfig.announcementBarText) {
        mergedSettings.text = store.themeConfig.announcementBarText;
      }
      if (activeType === "features_list" && store.themeConfig.bulletPoints) {
        mergedSettings.bulletPoints = store.themeConfig.bulletPoints;
      }
      if (activeType === "video_showcase" && store.themeConfig.heroVideoUrl) {
        mergedSettings.videoUrl = store.themeConfig.heroVideoUrl;
      }
      if (activeType === "origin_badge" && store.themeConfig.originLocation) {
        mergedSettings.origin = store.themeConfig.originLocation;
        mergedSettings.guarantee = store.themeConfig.freshnessGuarantee;
      }
      if (activeType === "specs_table" && store.themeConfig.warrantyPeriod) {
        mergedSettings.warranty = store.themeConfig.warrantyPeriod;
      }
      if (activeType === "banner_carousel" && store.themeConfig.bannerSlides) {
        mergedSettings.slides = store.themeConfig.bannerSlides;
      }
    }

    sections.push({
      id: sec.id,
      type: activeType,
      variant: sec.variant,
      enabled: sec.enabled ?? true,
      locks: sec.locks,
      constraints: sec.constraints,
      requiresFeature: sec.requiresFeature,
      whenMissing: sec.whenMissing,
      downgradeTo: sec.downgradeTo,
      settings: mergedSettings,
    });
  }

  const legacyTemplate = manifestToLegacyTemplate(manifest, pageKey);

  return {
    templateId: manifest.id,
    templateVersion: manifest.version,
    archetype: manifest.archetype,
    tier: manifest.tier,
    manifest,
    preset,
    shell,
    sections,
    page: pageKey,
    template: legacyTemplate,
  };
}

/**
 * Generates inlined CSS custom properties for server rendering.
 * Keeps critical CSS tiny (≤ 15 KB budget).
 */
export function generateThemeCssVariables(preset: DesignPreset): string {
  return `
:root {
  --gocom-primary: ${preset.primaryColor};
  --gocom-secondary: ${preset.secondaryColor};
  --gocom-accent: ${preset.accentColor};
  --gocom-bg: ${preset.backgroundColor};
  --gocom-surface: ${preset.surfaceColor};
  --gocom-text: ${preset.textColor};
  --gocom-muted: ${preset.mutedTextColor};
  --gocom-border: ${preset.borderColor};
  --gocom-radius: ${preset.borderRadius};
  --gocom-font: ${preset.fontFamily};
}
`.trim();
}
