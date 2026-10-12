import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Type, Image as ImageIcon, RotateCcw, Upload, Loader2, MousePointerClick } from "lucide-react";
import { apiFetch } from "../../lib/api.js";
import { uploadResizedImageToR2 } from "../../lib/image-compress.js";
import type { HtmlPageOverrides } from "../../hooks/useThemeEditor.js";

/** One replaceable text or image of a template page (`GET /api/templates/:id/fields`). */
export interface TemplateField {
  id: string;
  kind: "text" | "image";
  tag: string;
  value: string;
  multiline?: boolean;
}

interface HtmlContentEditorProps {
  templateId: string;
  /** Sub-pages of the template; the home page ("") is always offered first. */
  pages: string[];
  activePage: string;
  onSelectPage: (page: string) => void;
  overrides: HtmlPageOverrides;
  /** `undefined` restores the template's own value. */
  onChange: (kind: "text" | "image", id: string, value: string | undefined) => void;
  /** Field the merchant clicked in the preview; scrolled into view and highlighted. */
  focusField?: { kind: "text" | "image"; id: string; at: number } | null;
  /** Called when a field gains focus here, so the preview can show where it is. */
  onFocusField?: (kind: "text" | "image", id: string) => void;
  language?: "bn" | "en";
}

const PAGE_SIZE = 40;

const TAG_LABELS: Record<string, { bn: string; en: string }> = {
  title: { bn: "ব্রাউজার ট্যাবের শিরোনাম", en: "Browser tab title" },
  h1: { bn: "প্রধান শিরোনাম", en: "Main heading" },
  h2: { bn: "শিরোনাম", en: "Heading" },
  h3: { bn: "উপ-শিরোনাম", en: "Subheading" },
  h4: { bn: "উপ-শিরোনাম", en: "Subheading" },
  h5: { bn: "উপ-শিরোনাম", en: "Subheading" },
  h6: { bn: "উপ-শিরোনাম", en: "Subheading" },
  p: { bn: "অনুচ্ছেদ", en: "Paragraph" },
  a: { bn: "লিংক / বাটন", en: "Link / button" },
  button: { bn: "বাটন", en: "Button" },
  li: { bn: "তালিকার আইটেম", en: "List item" },
  label: { bn: "লেবেল", en: "Label" },
  img: { bn: "ছবি", en: "Image" },
};

function pageLabel(page: string, isBn: boolean): string {
  if (!page) return isBn ? "হোম পেজ" : "Home page";
  return page.replace(/[-_/]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Content editor for templates that are served from their own page.
 *
 * The design is fixed — it is the template the merchant chose — so what is
 * editable is its content: every text and every image on the page, listed in
 * the order they appear. Clicking something in the preview jumps to its field.
 */
export const HtmlContentEditor: React.FC<HtmlContentEditorProps> = ({
  templateId,
  pages,
  activePage,
  onSelectPage,
  overrides,
  onChange,
  focusField,
  onFocusField,
  language = "bn",
}) => {
  const isBn = language === "bn";
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "text" | "image" | "edited">("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setVisible(PAGE_SIZE);

    apiFetch(`/api/templates/${encodeURIComponent(templateId)}/fields?page=${encodeURIComponent(activePage)}`)
      .then((res) => {
        if (!cancelled) setFields(res?.fields ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setFields([]);
          setLoadError(err?.message || "Failed to load template fields");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [templateId, activePage]);

  const isEdited = (f: TemplateField) =>
    f.kind === "text" ? overrides.text[f.id] !== undefined : overrides.image[f.id] !== undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => {
      if (filter === "text" && f.kind !== "text") return false;
      if (filter === "image" && f.kind !== "image") return false;
      if (filter === "edited" && !isEdited(f)) return false;
      if (!q) return true;
      const current = f.kind === "text" ? overrides.text[f.id] ?? f.value : overrides.image[f.id] ?? f.value;
      return f.value.toLowerCase().includes(q) || current.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, filter, query, overrides]);

  // A click in the preview: reveal that field even if a filter or paging hid it.
  useEffect(() => {
    if (!focusField) return;
    const key = `${focusField.kind}:${focusField.id}`;
    const index = fields.findIndex((f) => f.kind === focusField.kind && f.id === focusField.id);
    if (index < 0) return;

    setQuery("");
    setFilter("all");
    setVisible((v) => Math.max(v, index + 5));
    setHighlight(key);

    const scroll = window.setTimeout(() => {
      const row = rowRefs.current.get(key);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
      row?.querySelector<HTMLElement>("input[type=text],textarea")?.focus({ preventScroll: true });
    }, 60);
    const clear = window.setTimeout(() => setHighlight(null), 2200);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(clear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusField?.at]);

  const handleUpload = async (field: TemplateField, file?: File) => {
    if (!file) return;
    setUploadingId(field.id);
    try {
      const result = await uploadResizedImageToR2(file, "/v1", () => {}, "themes");
      onChange("image", field.id, result.primaryUrl);
    } catch (err: any) {
      alert((isBn ? "ছবি আপলোড ব্যর্থ হয়েছে: " : "Image upload failed: ") + (err?.message || ""));
    } finally {
      setUploadingId(null);
    }
  };

  const editedCount = fields.filter(isEdited).length;
  const allPages = ["", ...pages];
  const shown = filtered.slice(0, visible);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {isBn ? "পেজের লেখা ও ছবি" : "Page texts & images"}
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
              <MousePointerClick className="w-3 h-3" />
              {isBn
                ? "প্রিভিউতে যেকোনো লেখা বা ছবিতে ক্লিক করলে সেটি এখানে খুলবে।"
                : "Click any text or image in the preview to edit it here."}
            </p>
          </div>
          {editedCount > 0 && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              {editedCount} {isBn ? "টি পরিবর্তন" : "edited"}
            </span>
          )}
        </div>

        {allPages.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {allPages.map((page) => (
              <button
                key={page || "index"}
                type="button"
                onClick={() => onSelectPage(page)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  activePage === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {pageLabel(page, isBn)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder={isBn ? "লেখা দিয়ে খুঁজুন..." : "Search the page text..."}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex bg-gray-100 p-0.5 rounded-lg">
            {([
              ["all", isBn ? "সব" : "All"],
              ["text", isBn ? "লেখা" : "Text"],
              ["image", isBn ? "ছবি" : "Images"],
              ["edited", isBn ? "পরিবর্তিত" : "Edited"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setFilter(key);
                  setVisible(PAGE_SIZE);
                }}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  filter === key ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-100">
        {loading && (
          <div className="p-8 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!loading && loadError && <p className="p-6 text-xs text-red-600 text-center">{loadError}</p>}

        {!loading && !loadError && shown.length === 0 && (
          <p className="p-6 text-xs text-gray-500 text-center">
            {isBn ? "কিছু পাওয়া যায়নি।" : "Nothing matched."}
          </p>
        )}

        {!loading &&
          shown.map((field) => {
            const key = `${field.kind}:${field.id}`;
            const edited = isEdited(field);
            const tagLabel = TAG_LABELS[field.tag]?.[isBn ? "bn" : "en"] ?? (isBn ? "লেখা" : "Text");
            const inputId = `gc-field-${key}`;

            return (
              <div
                key={key}
                ref={(el) => {
                  if (el) rowRefs.current.set(key, el);
                  else rowRefs.current.delete(key);
                }}
                className={`p-3 space-y-1.5 transition-colors ${highlight === key ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={inputId} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                    {field.kind === "image" ? (
                      <ImageIcon className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Type className="w-3 h-3 text-gray-400" />
                    )}
                    {tagLabel}
                    {edited && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </label>
                  {edited && (
                    <button
                      type="button"
                      onClick={() => onChange(field.kind, field.id, undefined)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-gray-900"
                      title={isBn ? "টেমপ্লেটের মূল মান ফিরিয়ে আনুন" : "Restore the template's original"}
                    >
                      <RotateCcw className="w-3 h-3" />
                      {isBn ? "রিসেট" : "Reset"}
                    </button>
                  )}
                </div>

                {field.kind === "text" ? (
                  field.multiline ? (
                    <textarea
                      id={inputId}
                      rows={3}
                      value={overrides.text[field.id] ?? field.value}
                      onFocus={() => onFocusField?.("text", field.id)}
                      onChange={(e) => onChange("text", field.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-y"
                    />
                  ) : (
                    <input
                      id={inputId}
                      type="text"
                      value={overrides.text[field.id] ?? field.value}
                      onFocus={() => onFocusField?.("text", field.id)}
                      onChange={(e) => onChange("text", field.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  )
                ) : (
                  <div className="flex items-center gap-2.5">
                    <img
                      src={overrides.image[field.id] ?? field.value}
                      alt=""
                      loading="lazy"
                      onClick={() => onFocusField?.("image", field.id)}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-gray-50 flex-shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        id={inputId}
                        type="text"
                        inputMode="url"
                        placeholder="https://"
                        value={overrides.image[field.id] ?? ""}
                        onFocus={() => onFocusField?.("image", field.id)}
                        onChange={(e) => {
                          const next = e.target.value.trim();
                          onChange("image", field.id, next === "" ? undefined : next);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer">
                        {uploadingId === field.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        {isBn ? "নিজের ছবি আপলোড" : "Upload your image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingId !== null}
                          onChange={(e) => {
                            void handleUpload(field, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {!loading && filtered.length > visible && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            {isBn
              ? `আরও দেখুন (${filtered.length - visible} টি বাকি)`
              : `Show more (${filtered.length - visible} remaining)`}
          </button>
        )}
      </div>
    </div>
  );
};
