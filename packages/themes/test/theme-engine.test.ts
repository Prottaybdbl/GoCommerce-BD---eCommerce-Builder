import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveTheme,
  generateThemeCssVariables,
  getPreset,
  listPresets,
  getTemplateForArchetype,
  listTemplates,
  getAllManifests,
  getShell,
  DESIGN_PRESETS,
  STARTER_TEMPLATES,
  SECTION_REGISTRY,
  defaultSectionSettings,
  buildSectionForm,
  buildDraftFromManifest,
} from "../src/index.js";
import type { ThemeArchetype } from "@gocom/contracts";

test("Theme Engine: Default resolution", () => {
  const resolved = resolveTheme(null);
  assert.equal(resolved.archetype, "viral-funnel");
  assert.equal(resolved.preset.id, "rose-bold");
  assert.ok(resolved.sections.length > 0);
  assert.ok(resolved.sections.some((s) => s.type === "inline_checkout"));
});

test("Theme Engine: All 5 Archetypes resolve with valid starter templates", () => {
  const archetypes: ThemeArchetype[] = [
    "viral-funnel",
    "fashion-store",
    "tech-gadget",
    "organic-food",
    "multi-campaign",
  ];

  for (const arch of archetypes) {
    const template = getTemplateForArchetype(arch);
    assert.equal(template.archetype, arch);
    assert.ok(template.sections.length >= 4, `${arch} should have at least 4 sections`);

    const resolved = resolveTheme({ themeArchetype: arch });
    assert.equal(resolved.archetype, arch);
    assert.ok(resolved.sections.length > 0);
  }
});

test("Theme Engine: All 6 Design Presets are defined and valid", () => {
  const presets = listPresets();
  assert.equal(presets.length, 6);

  const expectedPresets = [
    "rose-bold",
    "emerald-organic",
    "midnight-tech",
    "royal-fashion",
    "amber-warm",
    "ocean-clean",
  ];

  for (const id of expectedPresets) {
    const preset = getPreset(id);
    assert.equal(preset.id, id);
    assert.ok(preset.primaryColor.startsWith("#"));
    assert.ok(preset.backgroundColor.startsWith("#"));
    assert.ok(preset.borderRadius);
  }
});

test("Theme Engine: Custom Preset selection via themeConfig.presetId", () => {
  const resolved = resolveTheme({
    themeArchetype: "tech-gadget",
    themeConfig: { presetId: "midnight-tech" },
  });
  assert.equal(resolved.preset.id, "midnight-tech");
  assert.equal(resolved.preset.primaryColor, "#2563EB");
});

test("Theme Engine: Preview preset override takes precedence for live customizer", () => {
  const resolved = resolveTheme(
    {
      themeArchetype: "organic-food",
      themeConfig: { presetId: "emerald-organic" },
    },
    { previewPreset: "ocean-clean" }
  );
  assert.equal(resolved.preset.id, "ocean-clean");
});

test("Theme Engine: Custom store config merges into section settings", () => {
  const resolved = resolveTheme({
    themeArchetype: "tech-gadget",
    themeConfig: {
      announcementBarText: "বিশেষ গ্যাজেট ছাড় আজ রাত ১২টা পর্যন্ত!",
      warrantyPeriod: "২ বছরের অফিশিয়াল রিপ্লেসমেন্ট ওয়ারেন্টি",
    },
  });

  const announcement = resolved.sections.find((s) => s.type === "announcement_bar");
  assert.ok(announcement);
  assert.equal(announcement?.settings.text, "বিশেষ গ্যাজেট ছাড় আজ রাত ১২টা পর্যন্ত!");

  const specs = resolved.sections.find((s) => s.type === "specs_table");
  assert.ok(specs);
  assert.equal(specs?.settings.warranty, "২ বছরের অফিশিয়াল রিপ্লেসমেন্ট ওয়ারেন্টি");
});

test("Theme Engine: Custom themeTokens override base preset values", () => {
  const resolved = resolveTheme({
    themeArchetype: "viral-funnel",
    themeTokens: {
      primaryColor: "#FF0055",
      borderRadius: "2rem",
    },
  });

  assert.equal(resolved.preset.primaryColor, "#FF0055");
  assert.equal(resolved.preset.borderRadius, "2rem");
  // Secondary color should still be preserved from base preset
  assert.equal(resolved.preset.secondaryColor, DESIGN_PRESETS["rose-bold"].secondaryColor);
});

test("Theme Engine: generateThemeCssVariables outputs valid CSS custom properties", () => {
  const preset = getPreset("emerald-organic");
  const css = generateThemeCssVariables(preset);

  assert.ok(css.includes(":root {"));
  assert.ok(css.includes(`--gocom-primary: ${preset.primaryColor}`));
  assert.ok(css.includes(`--gocom-bg: ${preset.backgroundColor}`));
  assert.ok(css.includes(`--gocom-radius: ${preset.borderRadius}`));
});

test("Template System: Manifest registry and all starter manifests validate", () => {
  const manifests = getAllManifests();
  assert.ok(manifests.length >= 5, "Should have registered all template manifests");

  for (const m of manifests) {
    assert.ok(m.id);
    assert.ok(m.name);
    assert.ok(m.banglaName);
    assert.ok(m.shell);
    assert.ok(m.pages.main);
    assert.ok(m.pages.main.sections.length >= 4);
    assert.ok(m.defaultPreset);
  }
});

test("Template System: Page shells resolution", () => {
  const shell = getShell("narrow-funnel");
  assert.equal(shell.id, "narrow-funnel");
  assert.equal(shell.maxWidth, "34rem");

  const defaultShell = getShell("unknown-shell");
  assert.equal(defaultShell.id, "single-column");
  assert.equal(defaultShell.maxWidth, "48rem");
});

test("Template System: Section feature gating hides or downgrades when missing feature", () => {
  const customSections = [
    {
      id: "sec-1",
      type: "announcement_bar",
      enabled: true,
      requiresFeature: ["landing"],
      settings: {},
    },
    {
      id: "sec-2",
      type: "features_list",
      enabled: true,
      requiresFeature: ["shop_pro"],
      whenMissing: "hide" as const,
      settings: {},
    },
    {
      id: "sec-3",
      type: "hero_product",
      enabled: true,
      requiresFeature: ["shop_pro"],
      whenMissing: "downgrade" as const,
      downgradeTo: "features_list",
      settings: {},
    },
  ];

  // Store with only 'landing' feature
  const resolved = resolveTheme(
    {
      templateId: "viral-funnel",
      features: ["landing"],
    },
    {
      previewSections: customSections as any,
      isEditor: false,
    }
  );

  // sec-1 is retained
  assert.ok(resolved.sections.some((s) => s.id === "sec-1"));
  // sec-2 is hidden
  assert.ok(!resolved.sections.some((s) => s.id === "sec-2"));
  // sec-3 is downgraded to features_list
  const sec3 = resolved.sections.find((s) => s.id === "sec-3");
  assert.ok(sec3);
  assert.equal(sec3?.type, "features_list");
});

test("Theme Engine: banner_carousel defaults parse successfully", () => {
  const defaults = defaultSectionSettings("banner_carousel");
  assert.equal(defaults.autoplay, true);
  assert.equal(defaults.aspectRatio, "16:9");
  assert.ok(Array.isArray(defaults.slides));
  assert.equal(defaults.slides.length, 0);

  const entry = (SECTION_REGISTRY as any).banner_carousel;
  assert.ok(entry, "banner_carousel must exist in registry");
  const parsed = entry.schema.parse({});
  assert.equal(parsed.autoplay, true);
  assert.equal(parsed.aspectRatio, "16:9");
  assert.deepEqual(parsed.slides, []);
});

test("Theme Engine: buildSectionForm narrows a 1–8 slide repeater to exactly 3", () => {
  const fields = buildSectionForm("banner_carousel", { slides: { min: 3, max: 3 } });
  const slidesField = fields.find((f) => f.name === "slides");
  assert.ok(slidesField, "slides field should exist");
  assert.equal(slidesField.control, "repeater");
  assert.equal(slidesField.minItems, 3);
  assert.equal(slidesField.maxItems, 3);
});

test("Theme Engine: buildDraftFromManifest produces valid tree for all 71 manifests", () => {
  const manifests = getAllManifests();
  assert.equal(manifests.length, 71, "Should have 71 template manifests");

  for (const m of manifests) {
    const draft = buildDraftFromManifest(m);
    assert.equal(draft.templateId, m.id);
    assert.ok(draft.pages.main, `Manifest ${m.id} must have main page in draft`);

    for (const [pageKey, draftPage] of Object.entries(draft.pages)) {
      assert.ok(draftPage.sections.length > 0, `Page ${pageKey} in ${m.id} must have sections`);
      const resolved = resolveTheme(
        { templateId: m.id, draft },
        { page: pageKey, isEditor: true }
      );
      assert.ok(resolved.sections.length > 0, `Resolved ${m.id}:${pageKey} must have sections`);
      assert.ok(resolved.shell, `Resolved ${m.id}:${pageKey} must have shell`);
    }
  }
});

test("Theme Engine: isEditor draft wins over published", () => {
  const publishedSections = [
    {
      id: "pub-1",
      type: "announcement_bar",
      enabled: true,
      settings: { text: "Published Announcement" },
    },
  ];
  const draftSections = [
    {
      id: "draft-1",
      type: "announcement_bar",
      enabled: true,
      settings: { text: "Draft Announcement Under Edit" },
    },
  ];

  // When isEditor is true, draft wins
  const editorResolved = resolveTheme(
    {
      templateId: "viral-funnel",
      published: { pages: { main: { sections: publishedSections } } },
      draft: { pages: { main: { sections: draftSections } } },
    },
    { page: "main", isEditor: true }
  );
  assert.equal(editorResolved.sections[0].settings.text, "Draft Announcement Under Edit");

  // When isEditor is false, published wins
  const liveResolved = resolveTheme(
    {
      templateId: "viral-funnel",
      published: { pages: { main: { sections: publishedSections } } },
      draft: { pages: { main: { sections: draftSections } } },
    },
    { page: "main", isEditor: false }
  );
  assert.equal(liveResolved.sections[0].settings.text, "Published Announcement");
});
