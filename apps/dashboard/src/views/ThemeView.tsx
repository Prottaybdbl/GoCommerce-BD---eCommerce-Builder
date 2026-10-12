import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Eye,
  Search,
  Smartphone,
  Tablet,
  Monitor,
  X,
  Lock,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Send,
  AlertCircle,
  Globe,
} from "lucide-react";
import { getManifest } from "@gocom/themes";
import type { TemplateManifest } from "@gocom/contracts";
import { useThemeEditor } from "../hooks/useThemeEditor.js";
import { useLanguage } from "../context/LanguageContext.js";
import { SectionList } from "../components/theme/SectionList.js";
import { SectionSettingsForm } from "../components/theme/SectionSettingsForm.js";
import { DesignPanel } from "../components/theme/DesignPanel.js";
import { PreviewPane, type PreviewPaneHandle, type PreviewBridgeMessage } from "../components/theme/PreviewPane.js";
import { HtmlContentEditor } from "../components/theme/HtmlContentEditor.js";
import { TemplateThumbnail } from "../components/theme/TemplateThumbnail.js";
import type { GalleryTemplate } from "../hooks/useThemeEditor.js";
import { HistoryPanel } from "../components/theme/HistoryPanel.js";

type TemplateCategory = "single-landing" | "multi-landing" | "ecommerce";

const CATEGORY_LABELS: Record<TemplateCategory, { bn: string; en: string }> = {
  "single-landing": { bn: "সিঙ্গেল ল্যান্ডিং পেজ", en: "Single Landing Page" },
  "multi-landing": { bn: "মাল্টিপল ল্যান্ডিং পেজ", en: "Multiple Landing Page" },
  ecommerce: { bn: "ই-কমার্স ওয়েবসাইট", en: "E-commerce Website" },
};

/** Gallery tab of a template; older API responses without `category` fall back on the tier. */
function categoryOf(tpl: GalleryTemplate): TemplateCategory {
  return tpl.category ?? (tpl.tier === "shop" ? "ecommerce" : "single-landing");
}

/** A design is usable once its real page (or a section-engine archetype) can be rendered. */
function isComingSoon(tpl: GalleryTemplate): boolean {
  return tpl.isAvailable === false;
}

/** Whether a typed value is complete enough to show in the preview as an image. */
function looksLikeImageUrl(value: string): boolean {
  return /^(https?:\/\/\S+\.\S+|\/\S+)$/i.test(value);
}

export interface ThemeConfig {
  themeArchetype: string;
  themeConfig: Record<string, any>;
  settings: Record<string, any>;
}

/**
 * Merchant theme studio.
 *
 * Every control here is backed by the real merchant API — `GET /v1/theme`,
 * `POST /v1/theme/draft`, `POST /v1/theme/publish`, `/v1/theme/revisions` and
 * `/v1/theme/rollback` — through `useThemeEditor`. Section settings forms are
 * derived from each section type's own Zod schema (`buildSectionForm`), so a
 * newly added template needs no change in this file.
 */
export const ThemeView: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const editor = useThemeEditor();
  const {
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
    templateSwitches,
    liveUrl,
    loading,
    saving,
    isDirty,
    publishedVersion,
    previewUrl,
    error,
    setError,
  } = editor;

  const [activeTab, setActiveTab] = useState<"templates" | "customizer" | "history">("templates");
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory>("single-landing");

  // HTML templates: which of the template's pages is being edited, and the
  // field last clicked in the preview.
  const [htmlPage, setHtmlPage] = useState("");
  const [focusField, setFocusField] = useState<{ kind: "text" | "image"; id: string; at: number } | null>(null);
  const previewRef = useRef<PreviewPaneHandle>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Template live-demo modal
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [publishedNotice, setPublishedNotice] = useState<string | null>(null);
  const [upgradeTemplate, setUpgradeTemplate] = useState<any | null>(null);

  const selectedTemplateId = draft?.templateId || manifest?.id || "viral-funnel";
  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || manifest || getManifest(selectedTemplateId);

  const isHtmlTemplate = templateSource?.renderMode === "html";
  const activeCategory = templateSource?.category ?? categoryOf(activeTemplate as GalleryTemplate);
  const categoryCount = (category: TemplateCategory) => templates.filter((t) => categoryOf(t) === category).length;

  // A different template has different pages; start again from its home page.
  useEffect(() => {
    setHtmlPage("");
    setFocusField(null);
  }, [selectedTemplateId]);

  // The frame's address. It only moves when the frame genuinely has to reload —
  // a new preview token is minted on every autosave, and following each one
  // would reload the page under the merchant while they type.
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const latestPreviewUrl = useRef(previewUrl);
  latestPreviewUrl.current = previewUrl;

  const pagePreviewUrl = (base: string | null): string | null => {
    if (!base || !isHtmlTemplate || !htmlPage) return base;
    const [path, query = ""] = base.split("?");
    return `${path.replace(/\/$/, "")}/${htmlPage}${query ? `?${query}` : ""}`;
  };

  useEffect(() => {
    setFrameUrl(pagePreviewUrl(latestPreviewUrl.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewVersion, htmlPage, isHtmlTemplate]);

  useEffect(() => {
    if (!frameUrl && previewUrl) setFrameUrl(pagePreviewUrl(previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const handleHtmlChange = (kind: "text" | "image", id: string, value: string | undefined) => {
    editor.setHtmlOverride(htmlPage, kind, id, value);

    // Restoring the template's own value is shown by the reload that follows its save.
    if (value !== undefined && (kind === "text" || looksLikeImageUrl(value))) {
      previewRef.current?.post({ type: "apply", kind, id, value });
    }
  };

  const handleBridgeMessage = (message: PreviewBridgeMessage) => {
    if (message.type === "select" && message.kind && message.id) {
      setFocusField({ kind: message.kind, id: message.id, at: Date.now() });
    }
  };

  const sections = draft?.pages?.[activePage]?.sections ?? [];
  const availablePages = Object.keys(draft?.pages ?? {});
  const selectedSection =
    selectedSectionIndex !== null ? sections[selectedSectionIndex] : undefined;

  const filteredTemplates = templates.filter((tpl) => {
    if (categoryOf(tpl) !== categoryFilter) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return Boolean(
      tpl.name?.toLowerCase().includes(q) ||
        tpl.banglaName?.includes(searchQuery.trim()) ||
        tpl.description?.toLowerCase().includes(q) ||
        tpl.banglaDescription?.includes(searchQuery.trim()) ||
        tpl.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
        tpl.bestFor?.some((b: string) => b.toLowerCase().includes(q) || b.includes(searchQuery.trim())) ||
        tpl.shell?.toLowerCase().includes(q)
    );
  });

  /** Persists the template switch, then drops the merchant into the customizer. */
  const handleSelectTemplate = async (tpl: any) => {
    if (tpl.id === selectedTemplateId) {
      setActiveTab("customizer");
      return;
    }

    if (isComingSoon(tpl)) return;

    if (tpl.isUnlocked === false) {
      setUpgradeTemplate(tpl);
      return;
    }

    setSwitchingTo(tpl.id);
    setPublishedNotice(null);
    try {
      await editor.switchTemplate(tpl as TemplateManifest, { keepColors: false });
      setPreviewTemplate(null);
      setActiveTab("customizer");
    } catch {
      // The switch was refused; the hook restored the previous design and set `error`.
      setPreviewTemplate(null);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handlePublish = async () => {
    setPublishedNotice(null);
    try {
      await editor.publish();
      setPublishedNotice(
        isBn
          ? "✓ ডিজাইন লাইভ ওয়েবসাইটে পাবলিশ হয়েছে।"
          : "✓ Your design is now live on your storefront."
      );
    } catch {
      // `error` from the hook already carries the server's message.
    }
  };

  const handleDiscard = async () => {
    const confirmed = window.confirm(
      isBn
        ? "আপনি কি ড্রাফট বাতিল করে বর্তমানে লাইভ ডিজাইনে ফিরে যেতে চান?"
        : "Discard unpublished edits and restore the design that is currently live?"
    );
    if (!confirmed) return;
    setPublishedNotice(null);
    await editor.discardDraft();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-3">
        <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-gray-500">
          {isBn ? "থিম স্টুডিও লোড হচ্ছে..." : "Loading theme studio..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ======================= TOP BAR ======================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: active template + switch quota */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm border border-blue-100/50">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {activeTemplate?.name || selectedTemplateId}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                {CATEGORY_LABELS[activeCategory][isBn ? "bn" : "en"]}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {isBn ? "টেমপ্লেট পরিবর্তন বাকি" : "Switches left"}:{" "}
              <span className="font-bold text-gray-700">
                {templateSwitches
                  ? templateSwitches.allowed < 0
                    ? isBn
                      ? "সীমাহীন"
                      : "Unlimited"
                    : `${templateSwitches.remaining}/${templateSwitches.allowed}`
                  : "—"}
              </span>
              {publishedVersion > 0 && (
                <>
                  {" · "}
                  {isBn ? "লাইভ ভার্সন" : "Live version"}{" "}
                  <span className="font-bold text-gray-700">v{publishedVersion}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Center: tabs */}
        <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 self-center">
          {([
            ["templates", isBn ? "টেমপ্লেট" : "Templates"],
            ["customizer", isBn ? "কাস্টমাইজার ও প্রিভিউ" : "Customizer & Preview"],
            ["history", isBn ? "হিস্ট্রি" : "History"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-2.5 justify-end flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1">
            {saving ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-600">{isBn ? "সেভ হচ্ছে..." : "Saving..."}</span>
              </>
            ) : isDirty ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-600">{isBn ? "অপ্রকাশিত পরিবর্তন" : "Unsaved changes"}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-600">{isBn ? "ড্রাফট সেভ হয়েছে" : "Draft saved"}</span>
              </>
            )}
          </div>

          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              title={liveUrl}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              {isBn ? "লাইভ স্টোর দেখুন" : "View live store"}
            </a>
          )}

          <button
            onClick={handleDiscard}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isBn ? "বাতিল" : "Discard"}
          </button>

          <button
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white shadow-sm shadow-blue-200 transition-all"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {isBn ? "পাবলিশ হচ্ছে..." : "Publishing..."}
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                {isBn ? "লাইভ করুন" : "Publish to Live"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error / success banners straight from the API */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-800 font-medium flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {publishedNotice && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800 font-semibold flex-1">{publishedNotice}</p>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
            >
              {liveUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* ======================= TAB 1: TEMPLATES ======================= */}
      {activeTab === "templates" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/60 w-full sm:w-auto">
              {(Object.keys(CATEGORY_LABELS) as TemplateCategory[])
                .map((key) => [key, `${CATEGORY_LABELS[key][isBn ? "bn" : "en"]} (${categoryCount(key)})`] as const)
                .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    categoryFilter === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? "নাম বা ক্যাটাগরি দিয়ে খুঁজুন..." : "Search by name or category..."}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              const isLocked = tpl.isUnlocked === false;
              const comingSoon = isComingSoon(tpl);
              const accent = tpl.gallery?.accent || "#3B82F6";
              const tagCategory = tpl.bestFor?.[0] || tpl.tags?.[0] || (isBn ? "গ্যাজেট" : "General");

              return (
                <div
                  key={tpl.id}
                  className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? "ring-2 ring-blue-600 border-blue-600 shadow-md shadow-blue-100"
                      : "border-gray-200/80 hover:border-gray-300 hover:shadow-md"
                  }`}
                >
                  {/* Thumbnail: the template's real page, scaled down */}
                  <div
                    onClick={() => {
                      setPreviewTemplate(tpl);
                      setIsPreviewLoading(true);
                    }}
                    className="h-48 relative cursor-pointer overflow-hidden border-b border-gray-100"
                    style={{ background: `linear-gradient(135deg, ${accent}18, ${accent}08)` }}
                  >
                    {comingSoon ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                        <h4 className="text-sm font-bold text-gray-800 tracking-tight leading-snug line-clamp-1">
                          {tpl.name}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">{tagCategory}</p>
                      </div>
                    ) : (
                      <TemplateThumbnail
                        previewUrl={tpl.previewUrl || `/api/templates/${tpl.id}/preview`}
                        title={tpl.name}
                        accent={accent}
                      />
                    )}

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      {comingSoon ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-900/80 text-white">
                          {isBn ? "শীঘ্রই আসছে" : "Coming soon"}
                        </span>
                      ) : (tpl.htmlPages?.length ?? 0) > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/90 text-gray-700 border border-white shadow-sm">
                          {(tpl.htmlPages?.length ?? 0) + 1} {isBn ? "টি পেজ" : "pages"}
                        </span>
                      ) : (
                        <span />
                      )}
                      {isLocked && !comingSoon && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          <Lock className="w-3 h-3" />
                          {isBn ? "লকড" : "Locked"}
                        </span>
                      )}
                    </div>

                    {!comingSoon && (
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-gray-800 text-xs font-semibold shadow-sm">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          {isBn ? "লাইভ প্রিভিউ দেখুন" : "Live preview"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{tpl.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                        {isBn ? tpl.banglaDescription || tpl.description : tpl.description || tpl.banglaDescription}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(tpl.bestFor || tpl.tags || []).slice(0, 3).map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-medium bg-gray-50 text-gray-600 rounded-md border border-gray-200/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <button
                        onClick={() => handleSelectTemplate(tpl)}
                        disabled={switchingTo !== null || (comingSoon && !isSelected)}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                          comingSoon && !isSelected
                            ? "bg-gray-100 text-gray-500 border border-gray-200"
                            : isSelected
                            ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                            : isLocked
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"
                        }`}
                      >
                        {switchingTo === tpl.id ? (
                          <span className="inline-flex items-center gap-1 justify-center">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            {isBn ? "প্রয়োগ হচ্ছে..." : "Applying..."}
                          </span>
                        ) : isSelected ? (
                          <span className="inline-flex items-center gap-1 justify-center">
                            <Check className="w-3.5 h-3.5" />
                            {isBn ? "বর্তমান ডিজাইন" : "Current Design"}
                          </span>
                        ) : comingSoon ? (
                          isBn ? "শীঘ্রই আসছে" : "Coming soon"
                        ) : isLocked ? (
                          <span className="inline-flex items-center gap-1 justify-center">
                            <Lock className="w-3.5 h-3.5" />
                            {isBn ? "আপগ্রেড প্রয়োজন" : "Upgrade"}
                          </span>
                        ) : isBn ? (
                          "এই ডিজাইন নিন"
                        ) : (
                          "Use Design"
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setPreviewTemplate(tpl);
                          setIsPreviewLoading(true);
                        }}
                        title={isBn ? "লাইভ টেমপ্লেট প্রিভিউ" : "Live template preview"}
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <p className="text-center text-xs text-gray-500 py-10">
              {isBn ? "কোনো টেমপ্লেট পাওয়া যায়নি।" : "No templates matched your search."}
            </p>
          )}
        </div>
      )}

      {/* ======================= TAB 2: CUSTOMIZER & PREVIEW ======================= */}
      {activeTab === "customizer" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left: schema-driven controls */}
          <div className="xl:col-span-5 space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                  {isBn ? "সক্রিয় টেমপ্লেট" : "Active template"}
                </span>
                <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2 mt-0.5">
                  {activeTemplate?.name || selectedTemplateId}
                  <span className="text-[10px] bg-white text-blue-700 px-2 py-0.5 rounded font-semibold border border-blue-200">
                    {CATEGORY_LABELS[activeCategory][isBn ? "bn" : "en"]}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setActiveTab("templates")}
                className="text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors whitespace-nowrap"
              >
                {isBn ? "ডিজাইন পরিবর্তন →" : "Change design →"}
              </button>
            </div>

            {isHtmlTemplate ? (
              <HtmlContentEditor
                templateId={selectedTemplateId}
                pages={templateSource?.htmlPages ?? []}
                activePage={htmlPage}
                onSelectPage={(page) => {
                  setHtmlPage(page);
                  setFocusField(null);
                }}
                overrides={editor.getHtmlOverrides(htmlPage)}
                onChange={handleHtmlChange}
                focusField={focusField}
                onFocusField={(kind, id) => previewRef.current?.post({ type: "focus", kind, id })}
                language={language}
              />
            ) : (
              <>
                <SectionList
                  sections={sections}
                  availablePages={availablePages}
                  activePage={activePage}
                  onSelectPage={(page) => {
                    setActivePage(page);
                    setSelectedSectionIndex(null);
                  }}
                  selectedIndex={selectedSectionIndex}
                  onSelectSection={setSelectedSectionIndex}
                  onMoveSection={(from, to) => editor.moveSection(activePage, from, to)}
                  onToggleSection={(index) => editor.toggleSection(activePage, index)}
                  onRemoveSection={(index) => editor.removeSection(activePage, index)}
                  onDuplicateSection={(index) => editor.duplicateSection(activePage, index)}
                  onAddSection={(type) => editor.addSection(activePage, type)}
                  addableSections={addableSections}
                  language={language}
                />

                {selectedSection ? (
                  <SectionSettingsForm
                    key={`${activePage}-${selectedSectionIndex}-${selectedSection.id}`}
                    section={selectedSection}
                    onPatchSettings={(patch) =>
                      editor.patchSectionSettings(activePage, selectedSectionIndex as number, patch)
                    }
                    onSetVariant={(variant) =>
                      editor.setSectionVariant(activePage, selectedSectionIndex as number, variant)
                    }
                    language={language}
                  />
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                    <p className="text-xs text-gray-500 font-medium">
                      {isBn
                        ? "কোনো সেকশনের কনটেন্ট বদলাতে উপরের তালিকা থেকে সেটি বেছে নিন।"
                        : "Pick a section above to edit its content and layout."}
                    </p>
                  </div>
                )}

                <DesignPanel
                  manifest={manifest}
                  presetId={presetId}
                  onSelectPreset={editor.setPresetId}
                  tokenOverrides={tokenOverrides}
                  onSetTokenOverride={editor.setTokenOverride}
                  onResetTokenOverrides={editor.resetTokenOverrides}
                  language={language}
                />
              </>
            )}
          </div>

          {/* Right: real storefront draft preview */}
          <div className="xl:col-span-7">
            <div className="h-[860px] sticky top-4">
              <PreviewPane
                ref={previewRef}
                previewUrl={frameUrl}
                onRefresh={() => {
                  void editor.fetchPreviewToken().then((fresh) => setFrameUrl(pagePreviewUrl(fresh)));
                }}
                reloadKey={previewVersion}
                isSaving={saving}
                onBridgeMessage={handleBridgeMessage}
                language={language}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 3: HISTORY ======================= */}
      {activeTab === "history" && (
        <HistoryPanel
          currentPublishedVersion={publishedVersion}
          onRollback={editor.rollback}
          language={language}
        />
      )}

      {/* ======================= TEMPLATE DEMO MODAL ======================= */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
            <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-white gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate">
                    {previewTemplate.name}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {previewTemplate.banglaName} ·{" "}
                    {CATEGORY_LABELS[categoryOf(previewTemplate)][isBn ? "bn" : "en"]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                {([
                  ["mobile", Smartphone],
                  ["tablet", Tablet],
                  ["desktop", Monitor],
                ] as const).map(([key, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setPreviewDevice(key)}
                    className={`p-2 rounded-lg transition-all ${
                      previewDevice === key
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
                <a
                  href={`/api/templates/${previewTemplate.id}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-500 hover:text-blue-600 transition-colors ml-1 border-l border-gray-200"
                  title={isBn ? "নতুন ট্যাবে খুলুন" : "Open in new tab"}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-900 p-4 sm:p-6 flex items-center justify-center overflow-auto relative">
              {isPreviewLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm text-white">
                  <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mb-3" />
                  <span className="text-xs font-semibold text-slate-300">
                    {isBn ? "টেমপ্লেট প্রিভিউ লোড হচ্ছে..." : "Loading template preview..."}
                  </span>
                </div>
              )}

              <div
                className={`bg-white transition-all duration-300 overflow-hidden shadow-2xl ${
                  previewDevice === "mobile"
                    ? "w-[375px] h-[720px] rounded-[32px] ring-8 ring-slate-800"
                    : previewDevice === "tablet"
                    ? "w-[768px] h-[720px] rounded-2xl ring-4 ring-slate-800"
                    : "w-full h-full max-w-5xl rounded-xl"
                }`}
              >
                <iframe
                  src={`/api/templates/${previewTemplate.id}/preview`}
                  // The preview response sandboxes itself (CSP), isolating the
                  // template's own scripts from the dashboard session.
                  className="w-full h-full border-0"
                  title={previewTemplate.name}
                  onLoad={() => setIsPreviewLoading(false)}
                />
              </div>
            </div>

            <div className="p-4 px-6 border-t border-gray-100 flex items-center justify-between bg-white gap-3">
              <div className="text-xs text-gray-500 font-medium truncate">
                {isBn ? "আইডি" : "ID"}:{" "}
                <span className="font-mono font-bold text-gray-800">{previewTemplate.id}</span>
                {previewTemplate.isUnlocked === false && (
                  <span className="ml-2 text-amber-600 font-semibold">
                    · {previewTemplate.requiredPlanLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {isBn ? "বন্ধ করুন" : "Close"}
                </button>

                <button
                  onClick={() => handleSelectTemplate(previewTemplate)}
                  disabled={switchingTo !== null || isComingSoon(previewTemplate)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-200 transition-all"
                >
                  {switchingTo === previewTemplate.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : previewTemplate.isUnlocked === false ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {previewTemplate.isUnlocked === false
                    ? isBn
                      ? "আপগ্রেড প্রয়োজন"
                      : "Upgrade required"
                    : isBn
                    ? "এই ডিজাইন বেছে নিন"
                    : "Use this design"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= PLAN UPGRADE MODAL ======================= */}
      {upgradeTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">
                {isBn ? "এই ডিজাইনটি আপনার প্যাকেজে নেই" : "This design needs a higher plan"}
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-900">{upgradeTemplate.name}</span>{" "}
              {isBn ? "ব্যবহার করতে প্রয়োজন:" : "requires:"}{" "}
              <span className="font-bold text-blue-700">{upgradeTemplate.requiredPlanLabel}</span>
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUpgradeTemplate(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {isBn ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
