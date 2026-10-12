import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Plus,
  Lock,
  Layers,
  FileText,
} from "lucide-react";
import { getSectionMeta, type SectionInstance, type SectionMeta } from "@gocom/themes";

interface SectionListProps {
  sections: SectionInstance[];
  availablePages: string[];
  activePage: string;
  onSelectPage: (page: string) => void;
  selectedIndex: number | null;
  onSelectSection: (index: number) => void;
  onMoveSection: (from: number, to: number) => void;
  onToggleSection: (index: number) => void;
  onRemoveSection: (index: number) => void;
  onDuplicateSection: (index: number) => void;
  onAddSection: (type: string) => void;
  addableSections: SectionMeta[];
  language?: "bn" | "en";
}

export const SectionList: React.FC<SectionListProps> = ({
  sections,
  availablePages,
  activePage,
  onSelectPage,
  selectedIndex,
  onSelectSection,
  onMoveSection,
  onToggleSection,
  onRemoveSection,
  onDuplicateSection,
  onAddSection,
  addableSections,
  language = "bn",
}) => {
  const isBn = language === "bn";
  const [showAddModal, setShowAddModal] = useState(false);

  // Group addable sections by category
  const groupedAddable = React.useMemo(() => {
    const map: Record<string, SectionMeta[]> = {};
    for (const sec of addableSections) {
      const cat = sec.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(sec);
    }
    return map;
  }, [addableSections]);

  const pageLabels: Record<string, { en: string; bn: string }> = {
    main: { en: "Home / Landing", bn: "হোম / ল্যান্ডিং পেজ" },
    product: { en: "Product Page", bn: "প্রোডাক্ট পেজ" },
    collection: { en: "Catalog / Collection", bn: "ক্যাটালগ / কালেকশন" },
    cart: { en: "Cart / Checkout", bn: "কার্ট / চেকআউট" },
  };

  return (
    <div className="space-y-3">
      {/* Page Switcher for Multi-Page Templates */}
      {availablePages.length > 1 && (
        <div className="p-2 bg-gray-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              {isBn ? "সক্রিয় পেজ সিলেক্ট করুন" : "Active Page"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {availablePages.map((pk) => {
              const isActive = activePage === pk;
              const lbl = pageLabels[pk] || { en: pk, bn: pk };
              return (
                <button
                  key={pk}
                  type="button"
                  onClick={() => onSelectPage(pk)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all text-left truncate ${
                    isActive
                      ? "bg-white text-blue-600 shadow-xs font-bold border border-blue-100"
                      : "text-gray-600 hover:bg-white/60"
                  }`}
                >
                  {isBn ? lbl.bn : lbl.en}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section List Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            {isBn ? "সেকশন লিস্ট" : "Sections"} ({sections.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isBn ? "সেকশন যোগ করুন" : "Add Section"}</span>
        </button>
      </div>

      {/* Sections Item List */}
      <div className="space-y-1.5">
        {sections.map((sec, idx) => {
          const meta = getSectionMeta(sec.type);
          const isSelected = selectedIndex === idx;
          const isLockedMove = sec.locks?.movable === false;
          const isLockedRemove = sec.locks?.removable === false;
          const canDuplicate = sec.locks?.duplicable !== false;
          const title = (isBn ? meta?.banglaName : meta?.name) || meta?.name || sec.type;

          return (
            <div
              key={sec.id || idx}
              onClick={() => onSelectSection(idx)}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/20"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              } ${sec.enabled === false ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-mono font-bold text-gray-400 w-4 text-center">
                  {idx + 1}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isSelected ? "text-blue-900 font-bold" : "text-gray-800"
                      }`}
                    >
                      {title}
                    </span>
                    {isLockedRemove && (
                      <span title={isBn ? "লকড সেকশন" : "Locked section"}>
                        <Lock className="w-3 h-3 text-amber-500" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 capitalize">
                    {meta?.category || sec.type} {sec.variant ? `• ${sec.variant}` : ""}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Move Up / Down */}
                <button
                  type="button"
                  disabled={idx === 0 || isLockedMove}
                  onClick={() => onMoveSection(idx, idx - 1)}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded"
                  title={isBn ? "উপরে নিন" : "Move up"}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === sections.length - 1 || isLockedMove}
                  onClick={() => onMoveSection(idx, idx + 1)}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded"
                  title={isBn ? "নিচে নিন" : "Move down"}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => onToggleSection(idx)}
                  className={`p-1 rounded ${
                    sec.enabled !== false
                      ? "text-gray-400 hover:text-gray-700"
                      : "text-amber-500 hover:text-amber-700"
                  }`}
                  title={sec.enabled !== false ? "Hide" : "Show"}
                >
                  {sec.enabled !== false ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Duplicate */}
                {canDuplicate && (
                  <button
                    type="button"
                    onClick={() => onDuplicateSection(idx)}
                    className="p-1 text-gray-400 hover:text-gray-700 rounded"
                    title={isBn ? "ডুপ্লিকেট করুন" : "Duplicate"}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Remove */}
                {!isLockedRemove && (
                  <button
                    type="button"
                    onClick={() => onRemoveSection(idx)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title={isBn ? "মুছে ফেলুন" : "Remove"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {isBn ? "নতুন সেকশন যোগ করুন" : "Add Section"}
                </h3>
                <p className="text-xs text-gray-500">
                  {isBn
                    ? "আপনার পেজে যে উপাদানটি দেখাতে চান তা সিলেক্ট করুন"
                    : "Choose a section to add to your page"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {Object.entries(groupedAddable).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((sec) => (
                      <button
                        key={sec.type}
                        type="button"
                        onClick={() => {
                          onAddSection(sec.type);
                          setShowAddModal(false);
                        }}
                        className="p-3 border border-gray-200 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-semibold text-xs text-gray-900 mb-0.5">
                            {(isBn ? sec.banglaName : sec.name) || sec.name}
                          </div>
                          <div className="text-[11px] text-gray-500 line-clamp-2">
                            {sec.description}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                          <Plus className="w-3 h-3" />
                          <span>{isBn ? "যোগ করুন" : "Add"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
