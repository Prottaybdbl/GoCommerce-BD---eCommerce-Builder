import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Video,
  Calendar,
} from "lucide-react";
import { ImageField } from "./ImageField.js";
import type { FieldControlProps } from "./types.js";

export const ControlRenderer: React.FC<FieldControlProps> = (props) => {
  const { field, value, onChange, language = "bn", allValues } = props;
  const isBn = language === "bn";

  // Check showIf condition
  if (field.showIf && allValues) {
    const dependentValue = allValues[field.showIf.field];
    if (dependentValue !== field.showIf.equals) {
      return null;
    }
  }

  if (field.control === "hidden") {
    return null;
  }

  const label = (isBn ? field.banglaLabel : field.label) || field.label || field.name;
  const help = (isBn ? field.banglaHelp : field.help) || field.help;

  // 1. TEXT
  if (field.control === "text") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <input
          type="text"
          value={value ?? ""}
          readOnly={field.readOnly}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white ${
            field.readOnly ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
          }`}
        />
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 2. TEXTAREA & RICHTEXT
  if (field.control === "textarea" || field.control === "richtext") {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-gray-700">{label}</label>
          {field.control === "richtext" && (
            <span className="text-[10px] text-blue-500 font-medium">Text / HTML</span>
          )}
        </div>
        <textarea
          rows={3}
          value={value ?? ""}
          readOnly={field.readOnly}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white resize-y ${
            field.readOnly ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
          }`}
        />
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 3. NUMBER
  if (field.control === "number") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value ?? ""}
          readOnly={field.readOnly}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
        />
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 4. SLIDER
  if (field.control === "slider") {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const step = field.step ?? 1;
    const currentVal = typeof value === "number" ? value : min;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700">{label}</label>
          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
            {currentVal}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentVal}
          disabled={field.readOnly}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 5. TOGGLE
  if (field.control === "toggle") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center justify-between py-1">
        <div>
          <label className="text-xs font-semibold text-gray-700 cursor-pointer">{label}</label>
          {help && <p className="text-[11px] text-gray-400">{help}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={field.readOnly}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? "bg-blue-600" : "bg-gray-200"
          } ${field.readOnly ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  }

  // 6. SELECT
  if (field.control === "select") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <select
          value={value ?? ""}
          disabled={field.readOnly}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {(isBn ? opt.banglaLabel : opt.label) || opt.label}
            </option>
          ))}
        </select>
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 7. MULTISELECT
  if (field.control === "multiselect") {
    const selected: string[] = Array.isArray(value) ? value : [];
    const toggleOpt = (optVal: string) => {
      if (selected.includes(optVal)) {
        onChange(selected.filter((v) => v !== optVal));
      } else {
        onChange([...selected, optVal]);
      }
    };
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-md">
          {(field.options || []).map((opt) => {
            const isSel = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOpt(opt.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isSel
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {(isBn ? opt.banglaLabel : opt.label) || opt.label}
              </button>
            );
          })}
        </div>
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 8. COLOR
  if (field.control === "color") {
    const colorVal = typeof value === "string" ? value : "#000000";
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorVal}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 bg-white"
          />
          <input
            type="text"
            value={colorVal}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 font-mono text-xs px-2 py-1.5 border border-gray-200 rounded-md uppercase"
          />
        </div>
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 9. IMAGE
  if (field.control === "image") {
    return <ImageField {...props} />;
  }

  // 10. IMAGE_LIST
  if (field.control === "image_list") {
    const items: any[] = Array.isArray(value) ? value : [];
    const minItems = field.minItems ?? 0;
    const maxItems = field.maxItems ?? 12;

    const handleItemChange = (idx: number, newVal: any) => {
      const next = [...items];
      next[idx] = newVal;
      onChange(next);
    };

    const handleAdd = () => {
      if (items.length >= maxItems) return;
      onChange([...items, ""]);
    };

    const handleRemove = (idx: number) => {
      if (items.length <= minItems) return;
      onChange(items.filter((_, i) => i !== idx));
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700">{label}</label>
          <span className="text-[10px] text-gray-400 font-mono">
            {items.length}/{maxItems}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="relative p-2 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-gray-200">
                <span className="text-[11px] font-bold text-gray-500">#{idx + 1}</span>
                {items.length > minItems && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="text-red-500 hover:text-red-700 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <ImageField
                field={{ ...field, control: "image" }}
                value={item}
                onChange={(val) => handleItemChange(idx, val)}
                language={language}
              />
            </div>
          ))}
        </div>
        {items.length < maxItems && (
          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-1.5 border border-dashed border-gray-300 rounded-md text-xs text-blue-600 font-medium hover:bg-blue-50 flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isBn ? "নতুন ছবি যোগ করুন" : "Add Image"}</span>
          </button>
        )}
      </div>
    );
  }

  // 11. VIDEO
  if (field.control === "video") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-gray-500" />
          <label className="text-xs font-semibold text-gray-700">{label}</label>
        </div>
        <input
          type="url"
          placeholder="https://www.youtube.com/embed/..."
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
        />
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 12. LINK
  if (field.control === "link") {
    const linkVal = typeof value === "object" && value !== null ? value : { label: "", href: "#", newTab: false };
    return (
      <div className="space-y-1.5 p-2 bg-gray-50 border border-gray-200 rounded-lg">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder={isBn ? "বাটনের লেখা" : "Label"}
            value={linkVal.label || ""}
            onChange={(e) => onChange({ ...linkVal, label: e.target.value })}
            className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
          />
          <input
            type="text"
            placeholder="URL (#sec-checkout)"
            value={linkVal.href || ""}
            onChange={(e) => onChange({ ...linkVal, href: e.target.value })}
            className="text-xs px-2 py-1 border border-gray-200 rounded bg-white"
          />
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            id={`newTab-${field.name}`}
            checked={Boolean(linkVal.newTab)}
            onChange={(e) => onChange({ ...linkVal, newTab: e.target.checked })}
            className="rounded text-blue-600 focus:ring-0"
          />
          <label htmlFor={`newTab-${field.name}`} className="text-[11px] text-gray-600 cursor-pointer">
            {isBn ? "নতুন ট্যাবে খুলুন" : "Open in new tab"}
          </label>
        </div>
      </div>
    );
  }

  // 13. ICON_SELECT
  if (field.control === "icon_select") {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {(isBn ? opt.banglaLabel : opt.label) || opt.label}
            </option>
          ))}
        </select>
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 14. DATE
  if (field.control === "date") {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-gray-500" />
          <label className="text-xs font-semibold text-gray-700">{label}</label>
        </div>
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
        />
        {help && <p className="text-[11px] text-gray-400">{help}</p>}
      </div>
    );
  }

  // 15. REPEATER (The critical control for banner carousel slides, bullet points, etc.)
  if (field.control === "repeater") {
    return <RepeaterControl {...props} />;
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-700">{label}</label>
      <input
        type="text"
        value={typeof value === "string" ? value : JSON.stringify(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md"
      />
    </div>
  );
};

// ============================================================================
// RepeaterControl Component (enforces minItems/maxItems strictly)
// ============================================================================
const RepeaterControl: React.FC<FieldControlProps> = ({ field, value, onChange, language = "bn" }) => {
  const isBn = language === "bn";
  const items: any[] = Array.isArray(value) ? value : [];
  const minItems = field.minItems ?? 0;
  const maxItems = field.maxItems ?? 100;
  const subFields = field.itemFields || [];

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleItemPatch = (index: number, key: string, itemVal: any) => {
    const updated = [...items];
    const target = updated[index];
    if (typeof target === "object" && target !== null) {
      updated[index] = { ...target, [key]: itemVal };
    } else {
      updated[index] = itemVal;
    }
    onChange(updated);
  };

  const handleAddItem = () => {
    if (items.length >= maxItems) return;
    const newItem: Record<string, any> = {
      id: `item-${Math.random().toString(36).slice(2, 7)}`,
    };
    for (const sf of subFields) {
      if (sf.defaultValue !== undefined) {
        newItem[sf.name] = sf.defaultValue;
      }
    }
    onChange([...items, newItem]);
    setExpandedIndex(items.length);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= minItems) return;
    onChange(items.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
    setExpandedIndex(to);
  };

  const label = (isBn ? field.banglaLabel : field.label) || field.label || field.name;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-gray-700">{label}</label>
          <span className="ml-1.5 text-[10px] text-gray-400 font-mono">
            ({items.length}
            {minItems > 0 || maxItems < 100 ? ` / ${minItems}–${maxItems}` : ""})
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const isExpanded = expandedIndex === idx;
          const itemTitle =
            item?.headline ||
            item?.title ||
            item?.label ||
            item?.text ||
            `${isBn ? "আইটেম" : "Item"} #${idx + 1}`;

          return (
            <div
              key={item?.id || idx}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-xs"
            >
              {/* Item Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50/80 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex-1 flex items-center gap-2 text-left"
                >
                  <span className="text-[11px] font-bold text-gray-400">#{idx + 1}</span>
                  <span className="text-xs font-semibold text-gray-700 truncate max-w-[170px]">
                    {itemTitle}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                  )}
                </button>

                <div className="flex items-center gap-1 ml-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, idx - 1)}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === items.length - 1}
                    onClick={() => handleMove(idx, idx + 1)}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {items.length > minItems && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-red-500 hover:text-red-700 ml-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Item Body with Subfields */}
              {isExpanded && (
                <div className="p-3 space-y-3 bg-white">
                  {subFields.length > 0 ? (
                    subFields.map((subField) => (
                      <ControlRenderer
                        key={subField.name}
                        field={subField}
                        value={item?.[subField.name]}
                        onChange={(subVal) => handleItemPatch(idx, subField.name, subVal)}
                        language={language}
                        allValues={item}
                      />
                    ))
                  ) : (
                    <input
                      type="text"
                      value={typeof item === "string" ? item : ""}
                      onChange={(e) => {
                        const updated = [...items];
                        updated[idx] = e.target.value;
                        onChange(updated);
                      }}
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {items.length < maxItems && (
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full py-2 border border-dashed border-blue-300 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50/40 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>
            {isBn ? `নতুন ${label} যোগ করুন` : `Add ${label}`} ({items.length}/{maxItems})
          </span>
        </button>
      )}

      {items.length >= maxItems && (
        <p className="text-[11px] text-amber-600 text-center py-1">
          {isBn
            ? `এই টেমপ্লেটে সর্বোচ্চ ${maxItems}টি আইটেম রাখা যাবে`
            : `Template limit reached (max ${maxItems} items)`}
        </p>
      )}
    </div>
  );
};
