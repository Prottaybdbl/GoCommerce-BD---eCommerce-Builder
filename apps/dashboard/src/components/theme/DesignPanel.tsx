import React from "react";
import { DESIGN_PRESETS, getPreset } from "@gocom/themes";
import type { TemplateManifest } from "@gocom/contracts";
import { Palette, RotateCcw, Check, Sparkles } from "lucide-react";

interface DesignPanelProps {
  manifest: TemplateManifest | null;
  presetId: string;
  onSelectPreset: (presetId: string) => void;
  tokenOverrides: Record<string, any>;
  onSetTokenOverride: (name: string, value: string | undefined) => void;
  onResetTokenOverrides: () => void;
  language?: "bn" | "en";
}

export const DesignPanel: React.FC<DesignPanelProps> = ({
  manifest,
  presetId,
  onSelectPreset,
  tokenOverrides,
  onSetTokenOverride,
  onResetTokenOverrides,
  language = "bn",
}) => {
  const isBn = language === "bn";

  const allowedPresetKeys = manifest?.allowedPresets?.length
    ? manifest.allowedPresets
    : Object.keys(DESIGN_PRESETS);

  const activePreset = getPreset(presetId);

  const radiusOptions = [
    { label: "Sharp (0px)", value: "0px" },
    { label: "Subtle (4px)", value: "0.25rem" },
    { label: "Rounded (8px)", value: "0.5rem" },
    { label: "Curved (12px)", value: "0.75rem" },
    { label: "Pill / Soft (16px)", value: "1rem" },
    { label: "Full (24px)", value: "1.5rem" },
  ];

  const fontOptions = [
    { label: "Hind Siliguri (বাংলা স্ট্যান্ডার্ড)", value: "'Hind Siliguri', sans-serif" },
    { label: "Inter (ক্লিন ও আধুনিক)", value: "'Inter', sans-serif" },
    { label: "Outfit (বোল্ড ও স্টাইলিশ)", value: "'Outfit', sans-serif" },
    { label: "Roboto (ক্লাসিক)", value: "'Roboto', sans-serif" },
  ];

  const hasOverrides = Object.keys(tokenOverrides).length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Design Preset Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {isBn ? "ডিজাইন প্রিসেট নির্বাচন করুন" : "Design Presets"}
            </h4>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            {allowedPresetKeys.length} {isBn ? "টি উপলব্ধ" : "available"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {allowedPresetKeys.map((pKey) => {
            const p = (DESIGN_PRESETS as any)[pKey];
            if (!p) return null;
            const isSelected = presetId === pKey;
            const pTitle = isBn ? p.banglaName : p.name;

            return (
              <button
                key={pKey}
                type="button"
                onClick={() => onSelectPreset(pKey)}
                className={`p-2.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-900 truncate">{pTitle}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: p.primaryColor }}
                    title={`Primary: ${p.primaryColor}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: p.accentColor }}
                    title={`Accent: ${p.accentColor}`}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: p.backgroundColor }}
                    title={`Background: ${p.backgroundColor}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Token Overrides / Custom Colors & Typography */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {isBn ? "কাস্টম কালার ও ফন্ট অ্যাডজাস্টমেন্ট" : "Color & Font Overrides"}
            </h4>
          </div>
          {hasOverrides && (
            <button
              type="button"
              onClick={onResetTokenOverrides}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isBn ? "রিসেট করুন" : "Reset all"}</span>
            </button>
          )}
        </div>

        {/* Primary Color */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              {isBn ? "মূল ব্র্যান্ড কালার (Primary Color)" : "Primary Brand Color"}
            </label>
            {tokenOverrides.primary && (
              <button
                type="button"
                onClick={() => onSetTokenOverride("primary", undefined)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                {isBn ? "ডিফল্ট" : "Reset"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tokenOverrides.primary || activePreset.primaryColor}
              onChange={(e) => onSetTokenOverride("primary", e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={tokenOverrides.primary || activePreset.primaryColor}
              onChange={(e) => onSetTokenOverride("primary", e.target.value)}
              className="flex-1 font-mono text-xs px-2.5 py-1.5 border border-gray-200 rounded-md uppercase bg-white"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              {isBn ? "অ্যাকসেন্ট কালার (Accent / Discount Badge)" : "Accent Color"}
            </label>
            {tokenOverrides.accent && (
              <button
                type="button"
                onClick={() => onSetTokenOverride("accent", undefined)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                {isBn ? "ডিফল্ট" : "Reset"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tokenOverrides.accent || activePreset.accentColor}
              onChange={(e) => onSetTokenOverride("accent", e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={tokenOverrides.accent || activePreset.accentColor}
              onChange={(e) => onSetTokenOverride("accent", e.target.value)}
              className="flex-1 font-mono text-xs px-2.5 py-1.5 border border-gray-200 rounded-md uppercase bg-white"
            />
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              {isBn ? "পেজের ব্যাকগ্রাউন্ড কালার" : "Background Color"}
            </label>
            {tokenOverrides.background && (
              <button
                type="button"
                onClick={() => onSetTokenOverride("background", undefined)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                {isBn ? "ডিফল্ট" : "Reset"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={tokenOverrides.background || activePreset.backgroundColor}
              onChange={(e) => onSetTokenOverride("background", e.target.value)}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5 bg-white"
            />
            <input
              type="text"
              value={tokenOverrides.background || activePreset.backgroundColor}
              onChange={(e) => onSetTokenOverride("background", e.target.value)}
              className="flex-1 font-mono text-xs px-2.5 py-1.5 border border-gray-200 rounded-md uppercase bg-white"
            />
          </div>
        </div>

        {/* Border Radius */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              {isBn ? "বাটন ও কার্ডের গোলত্ব (Border Radius)" : "Border Radius"}
            </label>
            {tokenOverrides.radius && (
              <button
                type="button"
                onClick={() => onSetTokenOverride("radius", undefined)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                {isBn ? "ডিফল্ট" : "Reset"}
              </button>
            )}
          </div>
          <select
            value={tokenOverrides.radius || activePreset.borderRadius}
            onChange={(e) => onSetTokenOverride("radius", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
          >
            {radiusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Font Family */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700">
              {isBn ? "টাইপোগ্রাফি / ফন্ট (Font Family)" : "Font Family"}
            </label>
            {tokenOverrides.fontFamily && (
              <button
                type="button"
                onClick={() => onSetTokenOverride("fontFamily", undefined)}
                className="text-[10px] text-blue-600 hover:underline"
              >
                {isBn ? "ডিফল্ট" : "Reset"}
              </button>
            )}
          </div>
          <select
            value={tokenOverrides.fontFamily || activePreset.fontFamily}
            onChange={(e) => onSetTokenOverride("fontFamily", e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 bg-white"
          >
            {fontOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
