import React, { useState, useRef } from "react";
import { Upload, X, Link as LinkIcon, Loader2 } from "lucide-react";
import { uploadResizedImageToR2 } from "../../../lib/image-compress.js";
import type { FieldControlProps } from "./types.js";

export const ImageField: React.FC<FieldControlProps> = ({ field, value, onChange, language = "bn" }) => {
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBn = language === "bn";
  const label = (isBn ? field.banglaLabel : field.label) || field.label || field.name;
  const help = (isBn ? field.banglaHelp : field.help) || field.help;

  // Value can be string or { url, srcset, alt }
  const currentUrl = typeof value === "string" ? value : value?.url || "";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgressMsg(isBn ? "প্রসেস হচ্ছে..." : "Processing...");
    try {
      const result = await uploadResizedImageToR2(
        file,
        "/v1",
        (stage) => setProgressMsg(stage),
        "themes"
      );
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        onChange({
          uploadId: result.uploadId,
          url: result.primaryUrl,
          srcset: {
            "360": result.urls.small,
            "720": result.urls.medium,
            "1080": result.urls.large,
          },
          alt: value.alt || "",
        });
      } else {
        onChange(result.primaryUrl);
      }
    } catch (err: any) {
      alert((isBn ? "ছবি আপলোড ব্যর্থ হয়েছে: " : "Image upload failed: ") + (err?.message || ""));
    } finally {
      setUploading(false);
      setProgressMsg("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      onChange({ ...value, url: "", uploadId: undefined });
    } else {
      onChange("");
    }
  };

  const handleApplyUrl = () => {
    if (!manualUrl) return;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      onChange({ ...value, url: manualUrl });
    } else {
      onChange(manualUrl);
    }
    setManualUrl("");
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700">{label}</label>
        {field.aspectRatio && (
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {field.aspectRatio}
          </span>
        )}
      </div>

      {currentUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[120px] max-h-[160px]">
          <img src={currentUrl} alt="Preview" className="max-h-[160px] w-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white text-gray-800 rounded text-xs font-medium hover:bg-gray-100 shadow"
            >
              {isBn ? "পরিবর্তন" : "Change"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 bg-red-600 text-white rounded hover:bg-red-700 shadow"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-2 text-blue-600 gap-1.5">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-xs font-medium text-gray-600">{progressMsg}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isBn ? "ছবি আপলোড করুন" : "Upload Image"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs hover:bg-gray-50"
                  title="Enter URL"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {showUrlInput && (
                <div className="flex gap-1 pt-1">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-2 py-1 bg-gray-800 text-white rounded text-xs"
                  >
                    OK
                  </button>
                </div>
              )}

              <p className="text-[11px] text-gray-400">
                {isBn
                  ? "ব্রাউজারে ৩টি সাইজে (৩৬০/৭২০/১০৮০px) অপটিমাইজ হবে"
                  : "Auto-resized in browser to 360/720/1080px"}
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {help && <p className="text-[11px] text-gray-500">{help}</p>}
    </div>
  );
};
