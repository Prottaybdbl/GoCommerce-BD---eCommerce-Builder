import { useState, useEffect, useRef, useCallback } from "react";
import {
  buildDraftFromManifest,
  createSectionInstance,
  getManifest,
  getAllManifests,
  type ThemeDraft,
  type SectionMeta,
} from "@gocom/themes";
import type { TemplateManifest } from "@gocom/contracts";
import { apiFetch, apiPost, type ApiError } from "../lib/api.js";

export interface TemplateSwitchQuota {
  period: string;
  used: number;
  allowed: number;
  remaining: number;
}

/** Where a template's design comes from, and whether it can be used yet. */
export interface TemplateSource {
  category: "single-landing" | "multi-landing" | "ecommerce";
  /** "html": the template's own page is served and its texts/images are editable. */
  renderMode: "html" | "sections";
  isAvailable: boolean;
  /** Sub-pages of a multi-page HTML template (the home page is always present). */
  htmlPages: string[];
  previewUrl: string;
}

export type GalleryTemplate = TemplateManifest &
  Partial<TemplateSource> & { isUnlocked?: boolean; requiredPlanLabel?: string; canPreview?: boolean };

/** Merchant replacements for one page of an HTML template, keyed by slot id. */
export interface HtmlPageOverrides {
  text: Record<string, string>;
  image: Record<string, string>;
}

export interface ThemeStoreInfo {
  name: string;
  subdomain: string;
  /** Public storefront URL, e.g. `https://gocommercebd.online/myshop`. */
  liveUrl: string;
}

export interface UseThemeEditorReturn {
  draft: ThemeDraft | null;
  activePage: string;
  setActivePage: (page: string) => void;
  selectedSectionIndex: number | null;
  setSelectedSectionIndex: (index: number | null) => void;
  presetId: string;
  tokenOverrides: Record<string, any>;
  manifest: TemplateManifest | null;
  templates: GalleryTemplate[];
  /** Source facts for the template currently being edited. */
  templateSource: TemplateSource | null;
  /** Bumped whenever the preview iframe must reload to show a change. */
  previewVersion: number;
  addableSections: SectionMeta[];
  features: string[];
  templateSwitches: TemplateSwitchQuota | null;
  store: ThemeStoreInfo | null;
  /** Public storefront URL the merchant can open after publishing. */
  liveUrl: string | null;
  loading: boolean;
  saving: boolean;
  isDirty: boolean;
  publishedVersion: number;
  draftRevision: number;
  lastSavedAt: Date | null;
  previewUrl: string | null;
  previewToken: string | null;
  error: string | null;
  setError: (err: string | null) => void;

  // Section mutations
  moveSection: (pageKey: string, fromIndex: number, toIndex: number) => void;
  toggleSection: (pageKey: string, index: number, enabled?: boolean) => void;
  addSection: (pageKey: string, type: string, index?: number) => void;
  removeSection: (pageKey: string, index: number) => void;
  duplicateSection: (pageKey: string, index: number) => void;
  patchSectionSettings: (pageKey: string, index: number, patch: Record<string, any>) => void;
  setSectionVariant: (pageKey: string, index: number, variant: string) => void;

  // HTML template content (texts and images of the template's own page)
  getHtmlOverrides: (pageKey: string) => HtmlPageOverrides;
  setHtmlOverride: (pageKey: string, kind: "text" | "image", id: string, value: string | undefined) => void;

  // Template & Design mutations
  switchTemplate: (manifest: TemplateManifest, options?: { keepColors?: boolean }) => Promise<void>;
  setPresetId: (id: string) => void;
  setTokenOverride: (name: string, value: string | undefined) => void;
  resetTokenOverrides: () => void;

  // Persistence & actions
  saveDraftNow: () => Promise<void>;
  publish: () => Promise<void>;
  rollback: (version: number) => Promise<void>;
  discardDraft: () => Promise<void>;
  fetchPreviewToken: () => Promise<string | null>;
  reload: () => Promise<void>;
}

export function useThemeEditor(): UseThemeEditorReturn {
  const [draft, setDraft] = useState<ThemeDraft | null>(null);
  const [activePage, setActivePage] = useState<string>("main");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [presetId, setPresetIdState] = useState<string>("rose-bold");
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, any>>({});
  const [globalSections, setGlobalSections] = useState<Record<string, any>>({});
  const [manifest, setManifest] = useState<TemplateManifest | null>(null);
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [templateSource, setTemplateSource] = useState<TemplateSource | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  // HTML-template edits are painted into the preview as they are typed, so
  // saving them must not reload the frame (and lose the merchant's scroll position).
  const skipPreviewReloadRef = useRef(false);
  const [addableSections, setAddableSections] = useState<SectionMeta[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [templateSwitches, setTemplateSwitches] = useState<TemplateSwitchQuota | null>(null);
  const [store, setStore] = useState<ThemeStoreInfo | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [draftRevision, setDraftRevision] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latestRef = useRef({ draft, presetId, tokenOverrides });
  latestRef.current = { draft, presetId, tokenOverrides };

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Fetch preview token
  const fetchPreviewToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await apiPost<{ success: boolean; token: string; previewUrl: string; liveUrl?: string }>(
        "/v1/theme/preview-token",
        {}
      );
      if (res?.success) {
        setPreviewToken(res.token);
        setPreviewUrl(res.previewUrl);
        if (res.liveUrl) setLiveUrl(res.liveUrl);
        return res.previewUrl;
      }
      return null;
    } catch (err) {
      console.warn("Failed to fetch preview token:", err);
      return null;
    }
  }, []);

  // Main loader for theme state & templates
  const loadThemeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [themeRes, templatesRes] = await Promise.allSettled([
        apiFetch("/v1/theme"),
        apiFetch("/v1/templates"),
      ]);

      if (themeRes.status === "fulfilled" && themeRes.value?.success) {
        const tData = themeRes.value;
        const themeRow = tData.theme;
        const currentManifest = tData.manifest || getManifest(themeRow.templateId || "viral-funnel");

        setDraft(themeRow.draft);
        setPresetIdState(themeRow.presetId || currentManifest.defaultPreset || "rose-bold");
        setTokenOverrides(themeRow.tokenOverrides || {});
        setGlobalSections(themeRow.globalSections || {});
        setPublishedVersion(themeRow.publishedVersion || 0);
        setDraftRevision(themeRow.draftRevision || 0);
        setManifest(currentManifest);
        setTemplateSource(tData.templateSource || null);
        setPreviewVersion((v) => v + 1);
        setFeatures(tData.features || []);
        setAddableSections(tData.addableSections || []);
        if (tData.templateSwitches) {
          setTemplateSwitches(tData.templateSwitches);
        }
        if (tData.store) {
          setStore(tData.store);
          if (tData.store.liveUrl) setLiveUrl(tData.store.liveUrl);
        }

        // Set active page to first available page
        const pages = Object.keys(themeRow.draft?.pages || currentManifest.pages || { main: {} });
        if (pages.length > 0 && !pages.includes(activePage)) {
          setActivePage(pages[0]);
        }
      }

      if (templatesRes.status === "fulfilled" && templatesRes.value?.success) {
        setTemplates(templatesRes.value.templates || []);
      } else {
        // Fallback to bundled manifests
        setTemplates(getAllManifests().map((m) => ({ ...m, isUnlocked: true, canPreview: true })));
      }

      await fetchPreviewToken();
    } catch (err: any) {
      setError(err?.message || "Failed to load theme data");
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  }, [activePage, fetchPreviewToken]);

  useEffect(() => {
    loadThemeData();
  }, []);

  // Persist draft to backend. Resolves to the error message when the save was rejected.
  const persistDraft = useCallback(
    async (
      targetDraft: ThemeDraft,
      targetPreset: string,
      targetTokens: Record<string, any>,
      targetGlobals: Record<string, any>
    ): Promise<string | null> => {
      setSaving(true);
      setError(null);
      try {
        const res = await apiPost("/v1/theme/draft", {
          templateId: targetDraft.templateId,
          templateVersion: targetDraft.templateVersion,
          presetId: targetPreset,
          tokenOverrides: targetTokens,
          globalSections: targetGlobals,
          draft: targetDraft,
        });

        if (res?.success) {
          // Edits made while this request was in flight are not saved yet; clearing
          // the dirty flag here would cancel their pending autosave and lose them.
          const latest = latestRef.current;
          if (latest.draft === targetDraft && latest.presetId === targetPreset && latest.tokenOverrides === targetTokens) {
            setIsDirty(false);
          }
          setDraftRevision(res.data?.draftRevision ?? (draftRevision + 1));
          setLastSavedAt(new Date());
          if (!skipPreviewReloadRef.current) setPreviewVersion((v) => v + 1);
          skipPreviewReloadRef.current = false;
          if (res.templateSwitches) {
            setTemplateSwitches(res.templateSwitches);
          }
          // Refresh preview URL if token might expire
          await fetchPreviewToken();
        }
        return null;
      } catch (err: any) {
        const apiErr = err as ApiError;
        const msg = apiErr.problem?.detail || apiErr.message || "Failed to save draft";
        setError(msg);
        return msg;
      } finally {
        setSaving(false);
      }
    },
    [draftRevision, fetchPreviewToken]
  );

  // Debounced autosave effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isDirty || !draft) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistDraft(draft, presetId, tokenOverrides, globalSections);
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [draft, presetId, tokenOverrides, globalSections, isDirty, persistDraft]);

  const saveDraftNow = useCallback(async () => {
    if (!draft) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    await persistDraft(draft, presetId, tokenOverrides, globalSections);
  }, [draft, presetId, tokenOverrides, globalSections, persistDraft]);

  // Section mutations
  const moveSection = useCallback(
    (pageKey: string, fromIndex: number, toIndex: number) => {
      if (!draft?.pages?.[pageKey]) return;
      const sections = [...draft.pages[pageKey].sections];
      if (fromIndex < 0 || fromIndex >= sections.length) return;
      if (toIndex < 0 || toIndex >= sections.length) return;

      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, moved);

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: {
              ...prev.pages[pageKey],
              sections,
            },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
      if (selectedSectionIndex === fromIndex) {
        setSelectedSectionIndex(toIndex);
      }
    },
    [draft, selectedSectionIndex]
  );

  const toggleSection = useCallback(
    (pageKey: string, index: number, enabled?: boolean) => {
      if (!draft?.pages?.[pageKey]?.sections?.[index]) return;
      const target = draft.pages[pageKey].sections[index];
      const nextEnabled = enabled !== undefined ? enabled : !target.enabled;

      const updated = [...draft.pages[pageKey].sections];
      updated[index] = { ...target, enabled: nextEnabled };

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: { ...prev.pages[pageKey], sections: updated },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
    },
    [draft]
  );

  const addSection = useCallback(
    (pageKey: string, type: string, atIndex?: number) => {
      if (!draft?.pages?.[pageKey]) return;
      const newSec = createSectionInstance(type);
      const sections = [...draft.pages[pageKey].sections];

      const insertPos = atIndex !== undefined && atIndex >= 0 ? atIndex : sections.length;
      sections.splice(insertPos, 0, newSec);

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: { ...prev.pages[pageKey], sections },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
      setSelectedSectionIndex(insertPos);
    },
    [draft]
  );

  const removeSection = useCallback(
    (pageKey: string, index: number) => {
      if (!draft?.pages?.[pageKey]?.sections?.[index]) return;
      const sec = draft.pages[pageKey].sections[index];
      if (sec.locks?.removable === false) return;

      const sections = draft.pages[pageKey].sections.filter((_, i) => i !== index);

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: { ...prev.pages[pageKey], sections },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
      if (selectedSectionIndex === index) {
        setSelectedSectionIndex(null);
      } else if (selectedSectionIndex !== null && selectedSectionIndex > index) {
        setSelectedSectionIndex(selectedSectionIndex - 1);
      }
    },
    [draft, selectedSectionIndex]
  );

  const duplicateSection = useCallback(
    (pageKey: string, index: number) => {
      if (!draft?.pages?.[pageKey]?.sections?.[index]) return;
      const original = draft.pages[pageKey].sections[index];
      if (original.locks?.duplicable === false) return;

      const clone = createSectionInstance(original.type, {
        variant: original.variant,
        settings: JSON.parse(JSON.stringify(original.settings || {})),
      });

      const sections = [...draft.pages[pageKey].sections];
      sections.splice(index + 1, 0, clone);

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: { ...prev.pages[pageKey], sections },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
      setSelectedSectionIndex(index + 1);
    },
    [draft]
  );

  const patchSectionSettings = useCallback(
    (pageKey: string, index: number, patch: Record<string, any>) => {
      if (!draft?.pages?.[pageKey]?.sections?.[index]) return;
      const current = draft.pages[pageKey].sections[index];
      const merged = { ...(current.settings || {}), ...patch };

      const sections = [...draft.pages[pageKey].sections];
      sections[index] = { ...current, settings: merged };

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: { ...prev.pages[pageKey], sections },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
    },
    [draft]
  );

  const setSectionVariant = useCallback(
    (pageKey: string, index: number, variant: string) => {
      if (!draft?.pages?.[pageKey]?.sections?.[index]) return;
      const current = draft.pages[pageKey].sections[index];
      const sections = [...draft.pages[pageKey].sections];
      sections[index] = { ...current, variant };

      setDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [pageKey]: { ...prev.pages[pageKey], sections },
          },
        };
      });
      skipPreviewReloadRef.current = false;
      setIsDirty(true);
    },
    [draft]
  );

  // HTML template content
  const getHtmlOverrides = useCallback(
    (pageKey: string): HtmlPageOverrides => {
      const page = (draft as any)?.html?.pages?.[pageKey || "index"];
      return { text: page?.text ?? {}, image: page?.image ?? {} };
    },
    [draft]
  );

  const setHtmlOverride = useCallback(
    (pageKey: string, kind: "text" | "image", id: string, value: string | undefined) => {
      const key = pageKey || "index";
      setDraft((prev) => {
        if (!prev) return null;
        const html = (prev as any).html ?? { pages: {} };
        const page = html.pages?.[key] ?? { text: {}, image: {} };
        const bucket = { ...(page[kind] ?? {}) };
        if (value === undefined) delete bucket[id];
        else bucket[id] = value;
        return {
          ...prev,
          html: { ...html, pages: { ...html.pages, [key]: { text: {}, image: {}, ...page, [kind]: bucket } } },
        } as ThemeDraft;
      });
      // An edit is painted into the preview as it is typed, so its save needs no
      // reload — unless something else is also waiting to be saved. Restoring the
      // template's own value does need one: only the server has the original markup.
      skipPreviewReloadRef.current = value !== undefined && (!isDirty || skipPreviewReloadRef.current);
      setIsDirty(true);
    },
    [isDirty]
  );

  // Template switch
  const switchTemplate = useCallback(
    async (newManifest: TemplateManifest, options: { keepColors?: boolean } = {}) => {
      const newDraft = buildDraftFromManifest(newManifest);
      const nextPreset =
        options.keepColors && newManifest.allowedPresets?.includes(presetId)
          ? presetId
          : newManifest.defaultPreset;
      const nextTokens = options.keepColors ? tokenOverrides : {};

      setDraft(newDraft);
      setPresetIdState(nextPreset);
      setTokenOverrides(nextTokens);
      setManifest(newManifest);
      const picked = newManifest as GalleryTemplate;
      setTemplateSource(
        picked.renderMode
          ? {
              category: picked.category ?? "single-landing",
              renderMode: picked.renderMode,
              isAvailable: picked.isAvailable !== false,
              htmlPages: picked.htmlPages ?? [],
              previewUrl: picked.previewUrl ?? `/api/templates/${newManifest.id}/preview`,
            }
          : null
      );
      skipPreviewReloadRef.current = false;

      const availablePages = Object.keys(newDraft.pages);
      if (availablePages.length > 0 && !availablePages.includes(activePage)) {
        setActivePage(availablePages[0]);
      }
      setSelectedSectionIndex(null);
      skipPreviewReloadRef.current = false;
      setIsDirty(true);

      // Autosave immediately on template switch
      const failure = await persistDraft(newDraft, nextPreset, nextTokens, globalSections);
      if (failure) {
        // The server kept the previous design (plan limit, unavailable template…):
        // show that again rather than an editor for a design that was not applied.
        await loadThemeData();
        setError(failure);
        throw new Error(failure);
      }
    },
    [presetId, tokenOverrides, globalSections, activePage, persistDraft, loadThemeData]
  );

  const setPresetId = useCallback((id: string) => {
    setPresetIdState(id);
    skipPreviewReloadRef.current = false;
    setIsDirty(true);
  }, []);

  const setTokenOverride = useCallback((name: string, value: string | undefined) => {
    setTokenOverrides((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[name];
      } else {
        next[name] = value;
      }
      return next;
    });
    skipPreviewReloadRef.current = false;
    setIsDirty(true);
  }, []);

  const resetTokenOverrides = useCallback(() => {
    setTokenOverrides({});
    skipPreviewReloadRef.current = false;
    setIsDirty(true);
  }, []);

  // Publish
  const publish = useCallback(async () => {
    if (isDirty && draft) {
      await saveDraftNow();
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost("/v1/theme/publish", {});
      if (res?.success) {
        setPublishedVersion(res.publishedVersion);
        if (res.liveUrl) setLiveUrl(res.liveUrl);
        setIsDirty(false);
        await fetchPreviewToken();
      }
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.problem?.detail || apiErr.message || "Failed to publish theme");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [isDirty, draft, saveDraftNow, fetchPreviewToken]);

  // Rollback
  const rollback = useCallback(
    async (version: number) => {
      setSaving(true);
      setError(null);
      try {
        const res = await apiPost("/v1/theme/rollback", { version });
        if (res?.success) {
          setPublishedVersion(res.publishedVersion);
          await loadThemeData();
        }
      } catch (err: any) {
        const apiErr = err as ApiError;
        setError(apiErr.problem?.detail || apiErr.message || "Failed to rollback theme");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [loadThemeData]
  );

  // Discard draft
  const discardDraft = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost("/v1/theme/discard-draft", {});
      if (res?.success) {
        await loadThemeData();
      }
    } catch (err: any) {
      const apiErr = err as ApiError;
      setError(apiErr.problem?.detail || apiErr.message || "Failed to discard draft");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [loadThemeData]);

  return {
    draft,
    activePage,
    setActivePage,
    selectedSectionIndex,
    setSelectedSectionIndex,
    presetId,
    tokenOverrides,
    manifest,
    templates,
    templateSource,
    previewVersion,
    addableSections,
    features,
    templateSwitches,
    store,
    liveUrl,
    loading,
    saving,
    isDirty,
    publishedVersion,
    draftRevision,
    lastSavedAt,
    previewUrl,
    previewToken,
    error,
    setError,

    moveSection,
    toggleSection,
    addSection,
    removeSection,
    duplicateSection,
    patchSectionSettings,
    setSectionVariant,

    getHtmlOverrides,
    setHtmlOverride,

    switchTemplate,
    setPresetId,
    setTokenOverride,
    resetTokenOverrides,

    saveDraftNow,
    publish,
    rollback,
    discardDraft,
    fetchPreviewToken,
    reload: loadThemeData,
  };
}
