import React, { useState, useMemo } from "react";
import {
  Search,
  Lock,
  Eye,
  Check,
  ArrowRight,
} from "lucide-react";
import type { TemplateManifest } from "@gocom/contracts";

interface TemplateGalleryProps {
  templates: Array<
    TemplateManifest & {
      isUnlocked?: boolean;
      requiredPlanLabel?: string;
      canPreview?: boolean;
    }
  >;
  currentTemplateId: string;
  onSelectTemplate: (manifest: TemplateManifest, options: { keepColors?: boolean }) => Promise<void>;
  onPreviewTemplate?: (manifest: TemplateManifest) => void;
  language?: "bn" | "en";
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  currentTemplateId,
  onSelectTemplate,
  onPreviewTemplate,
  language = "bn",
}) => {
  const isBn = language === "bn";

  const [tierFilter, setTierFilter] = useState<"all" | "landing" | "shop">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForModal, setSelectedForModal] = useState<any | null>(null);
  const [upgradeModalTemplate, setUpgradeModalTemplate] = useState<any | null>(null);
  const [keepColors, setKeepColors] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Tier filter
      if (tierFilter === "landing" && t.tier !== "landing") return false;
      if (tierFilter === "shop" && t.tier !== "shop") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (t.name || "").toLowerCase().includes(q);
        const bnNameMatch = (t.banglaName || "").toLowerCase().includes(q);
        const descMatch = (t.description || "").toLowerCase().includes(q);
        const bnDescMatch = (t.banglaDescription || "").toLowerCase().includes(q);
        const tagMatch = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        const bestForMatch = (t.bestFor || []).some((bf) => bf.toLowerCase().includes(q));
        if (!nameMatch && !bnNameMatch && !descMatch && !bnDescMatch && !tagMatch && !bestForMatch) {
          return false;
        }
      }

      return true;
    });
  }, [templates, tierFilter, searchQuery]);

  const handleUseDesignConfirm = async () => {
    if (!selectedForModal) return;
    setSwitching(true);
    try {
      await onSelectTemplate(selectedForModal, { keepColors });
      setSelectedForModal(null);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2">
        {/* Tier Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTierFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tierFilter === "all"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {isBn ? "সব টেমপ্লেট" : "All"} ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setTierFilter("landing")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tierFilter === "landing"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {isBn ? "ল্যান্ডিং ফানেল" : "Landing"} (45)
          </button>
          <button
            type="button"
            onClick={() => setTierFilter("shop")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tierFilter === "shop"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {isBn ? "ফুল ই-কমার্স শপ" : "Shop"} (26)
          </button>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isBn ? "নাম বা ক্যাটাগরি দিয়ে খুঁজুন..." : "Search by name or category..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map((t) => {
          const isCurrent = t.id === currentTemplateId;
          const isUnlocked = t.isUnlocked !== false;
          const tTitle = (isBn ? t.banglaName : t.name) || t.name;
          const tDesc = (isBn ? t.banglaDescription : t.description) || t.description;

          return (
            <div
              key={t.id}
              className={`group flex flex-col bg-white rounded-2xl border transition-all overflow-hidden ${
                isCurrent
                  ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-lg"
              }`}
            >
              {/* Card Header Banner / Thumbnail */}
              <div
                className="relative aspect-16/10 bg-gray-900 flex items-center justify-center p-4 overflow-hidden"
                style={{ backgroundColor: t.gallery?.accent ? `${t.gallery.accent}20` : "#1e1e2d" }}
              >
                {/* Decorative theme mockup block */}
                <div className="w-full h-full rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                      {t.tier === "shop" ? (isBn ? "ফুল শপ (৪ পেজ)" : "Shop (4 pages)") : (isBn ? "১-পেজ ফানেল" : "Landing")}
                    </span>
                    {t.shell && (
                      <span className="text-[10px] font-mono opacity-60">{t.shell}</span>
                    )}
                  </div>

                  <div className="text-center py-2">
                    <h4 className="text-sm font-black tracking-tight">{tTitle}</h4>
                    <p className="text-[11px] opacity-80 line-clamp-1">{t.bestFor?.[0] || ""}</p>
                  </div>

                  <div className="flex items-center justify-center gap-1.5">
                    {(t.allowedPresets || []).slice(0, 4).map((pKey: string) => (
                      <div
                        key={pKey}
                        className="w-2.5 h-2.5 rounded-full bg-white/40"
                      />
                    ))}
                  </div>
                </div>

                {/* Locked Badge Overlay */}
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <div className="p-2 rounded-full bg-amber-500/20 border border-amber-500/40 mb-2">
                      <Lock className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-xs font-bold">{t.requiredPlanLabel || "Package 3"}</span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      {isBn ? "আনলক করতে প্যাকেজ আপগ্রেড প্রয়োজন" : "Upgrade package to unlock"}
                    </span>
                  </div>
                )}

                {/* Active Badge */}
                {isCurrent && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>{isBn ? "বর্তমান সক্রিয়" : "Active"}</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-gray-900 group-hover:text-blue-600 transition-colors">
                      {tTitle}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mb-3">
                    {tDesc}
                  </p>

                  {/* Tags */}
                  {t.bestFor && t.bestFor.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {t.bestFor.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                  {isUnlocked ? (
                    isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold cursor-default text-center"
                      >
                        {isBn ? "বর্তমানে সক্রিয়" : "Current Theme"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedForModal(t)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                      >
                        {isBn ? "ডিজাইনটি ব্যবহার করুন" : "Use Design"}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setUpgradeModalTemplate(t)}
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      <span>{isBn ? "আপগ্রেড করুন" : "Upgrade"}</span>
                    </button>
                  )}

                  {onPreviewTemplate && (
                    <button
                      type="button"
                      onClick={() => onPreviewTemplate(t)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                      title={isBn ? "প্রিভিউ দেখুন" : "Preview"}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal when switching template */}
      {selectedForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              {isBn ? "টেমপ্লেট পরিবর্তন নিশ্চিত করুন" : "Confirm Template Switch"}
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed">
              {isBn
                ? `আপনি '${(isBn ? selectedForModal.banglaName : selectedForModal.name) || selectedForModal.name}' টেমপ্লেট নির্বাচন করছেন। এটি নির্বাচন করলে বর্তমান ড্রাফট নতুন টেমপ্লেটের লেআউট ও সেকশন দিয়ে প্রতিস্থাপিত হবে।`
                : `Switching to '${selectedForModal.name}' will update your active draft sections to match this template's design.`}
            </p>

            {/* Option to preserve current brand colors */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="keepColorsCheck"
                checked={keepColors}
                onChange={(e) => setKeepColors(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-0"
              />
              <label htmlFor="keepColorsCheck" className="text-xs text-gray-700 font-medium cursor-pointer">
                {isBn
                  ? "বর্তমান কালার ও ফন্ট প্রিসেট সংরক্ষণ করুন"
                  : "Preserve current brand colors and font preset"}
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={switching}
                onClick={() => setSelectedForModal(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={switching}
                onClick={handleUseDesignConfirm}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5"
              >
                {switching && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{isBn ? "এগিয়ে যান" : "Apply Template"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {upgradeModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isBn ? "প্যাকেজ আপগ্রেড প্রয়োজন" : "Package Upgrade Required"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {upgradeModalTemplate.requiredPlanLabel || "প্যাকেজ ৩ (ফুল ই-কমার্স শপ)"}
              </p>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {isBn
                ? `'${(isBn ? upgradeModalTemplate.banglaName : upgradeModalTemplate.name) || upgradeModalTemplate.name}' টেমপ্লেটটি ব্যবহার করতে আপনার প্যাকেজ আপগ্রেড করতে হবে। এই প্যাকেজে মাল্টি-পেজ ক্যাটালগ, কার্ট ও কাস্টমার একাউন্ট ফিচার অন্তর্ভুক্ত রয়েছে।`
                : `This template is unlocked on higher tier plans. Upgrade your package to publish this design.`}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUpgradeModalTemplate(null)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                {isBn ? "বন্ধ করুন" : "Close"}
              </button>
              <a
                href="/settings"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center justify-center gap-1"
              >
                <span>{isBn ? "প্যাকেজ দেখুন" : "View Packages"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
