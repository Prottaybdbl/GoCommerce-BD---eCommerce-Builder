import React, { useMemo, useState } from "react";
import {
  buildSectionForm,
  getSectionMeta,
  type SectionInstance,
  type UiField,
} from "@gocom/themes";
import { Sliders, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { ControlRenderer } from "./controls/ControlRenderer.js";

interface SectionSettingsFormProps {
  section: SectionInstance;
  onPatchSettings: (patch: Record<string, any>) => void;
  onSetVariant?: (variant: string) => void;
  language?: "bn" | "en";
}

export const SectionSettingsForm: React.FC<SectionSettingsFormProps> = ({
  section,
  onPatchSettings,
  onSetVariant,
  language = "bn",
}) => {
  const isBn = language === "bn";
  const meta = getSectionMeta(section.type);

  // Derive form fields from Zod schema via buildSectionForm
  const fields = useMemo(() => {
    return buildSectionForm(section.type, section.constraints);
  }, [section.type, section.constraints]);

  // Group fields by `group` property
  const groupedFields = useMemo(() => {
    const groups: Record<string, UiField[]> = {};
    for (const f of fields) {
      const gName = f.group || (isBn ? "সাধারণ সেটিংস" : "General");
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(f);
    }
    // Sort fields in each group by order
    for (const g of Object.keys(groups)) {
      groups[g].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    }
    return groups;
  }, [fields, isBn]);

  // Track collapsed state of groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (grp: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    onPatchSettings({ [fieldName]: value });
  };

  const sectionTitle = (isBn ? meta?.banglaName : meta?.name) || meta?.name || section.type;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{sectionTitle}</h3>
            <p className="text-[11px] text-gray-400">
              {meta?.description || `Type: ${section.type}`}
            </p>
          </div>
        </div>

        {/* Variant Selector */}
        {meta?.variants && meta.variants.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isBn ? "ডিজাইন ভ্যারিয়েন্ট:" : "Design Variant:"}</span>
            </label>
            <div className="flex gap-1">
              {meta.variants.map((v: string) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSetVariant?.(v)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                    (section.variant || meta.defaultVariant) === v
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Groups */}
      {Object.entries(groupedFields).length === 0 ? (
        <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 rounded-lg">
          {isBn
            ? "এই সেকশনটির জন্য আলাদা কোনো সেটিংস প্রয়োজন নেই।"
            : "This section has no configurable settings."}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedFields).map(([grpName, grpFields]) => {
            const isCollapsed = collapsedGroups[grpName];
            return (
              <div
                key={grpName}
                className="border border-gray-200/80 rounded-xl overflow-hidden bg-white shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(grpName)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 text-left transition-colors"
                >
                  <span className="text-xs font-bold text-gray-800 tracking-wide uppercase text-[11px]">
                    {grpName}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="p-3.5 space-y-3.5">
                    {grpFields.map((field) => (
                      <ControlRenderer
                        key={field.name}
                        field={field}
                        value={section.settings?.[field.name]}
                        onChange={(newVal) => handleFieldChange(field.name, newVal)}
                        language={language}
                        allValues={section.settings || {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
