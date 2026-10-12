import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Smartphone, Monitor, RefreshCw, ExternalLink } from "lucide-react";

/** Must match TEMPLATE_BRIDGE_SOURCE in @gocom/themes/html (client-script.ts). */
const BRIDGE_SOURCE = "gocom-template";

/** A message from an HTML-template preview: it loaded, or the merchant clicked an editable element. */
export interface PreviewBridgeMessage {
  type: "ready" | "select";
  kind?: "text" | "image";
  id?: string;
}

export interface PreviewPaneHandle {
  /** Sends an instruction (apply an edit, focus a field) to the framed template page. */
  post: (message: { type: "apply" | "focus"; kind: "text" | "image"; id: string; value?: string }) => void;
}

interface PreviewPaneProps {
  previewUrl: string | null;
  onRefresh: () => void;
  /** Changes whenever the frame must reload to show a saved change. */
  reloadKey: number;
  isSaving: boolean;
  onBridgeMessage?: (message: PreviewBridgeMessage) => void;
  language?: "bn" | "en";
}

export const PreviewPane = forwardRef<PreviewPaneHandle, PreviewPaneProps>(function PreviewPane(
  { previewUrl, onRefresh, reloadKey, isSaving, onBridgeMessage, language = "bn" },
  ref
) {
  const isBn = language === "bn";
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  // Reload iframe when user explicitly clicks refresh or when a saved change needs it
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [reloadKey]);

  useImperativeHandle(
    ref,
    () => ({
      post: (message) => {
        // The framed page is sandboxed into an opaque origin, so "*" is the only
        // target that reaches it; nothing sensitive is ever sent over this channel.
        iframeRef.current?.contentWindow?.postMessage({ ...message, source: BRIDGE_SOURCE }, "*");
      },
    }),
    []
  );

  const onBridgeMessageRef = useRef(onBridgeMessage);
  onBridgeMessageRef.current = onBridgeMessage;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      // Trust is by sender window, not origin: only our own preview frame is heard.
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.source !== BRIDGE_SOURCE) return;
      if (data.type === "ready" || data.type === "select") {
        onBridgeMessageRef.current?.({
          type: data.type,
          kind: data.kind === "image" ? "image" : data.kind === "text" ? "text" : undefined,
          id: typeof data.id === "string" ? data.id : undefined,
        });
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const handleManualReload = () => {
    setKey((prev) => prev + 1);
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
      {/* Top Preview Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              device === "mobile"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isBn ? "মোবাইল" : "Mobile"} (375px)</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              device === "desktop"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isBn ? "ডেস্কটপ" : "Desktop"} (100%)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          {isSaving ? (
            <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{isBn ? "ড্রাফট আপডেট হচ্ছে..." : "Updating preview..."}</span>
            </span>
          ) : (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{isBn ? "রিয়েল ড্রাফট ভিউ" : "Live draft view"}</span>
            </span>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualReload}
            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            title={isBn ? "প্রিভিউ রিফ্রেশ করুন" : "Refresh preview"}
          >
            <RefreshCw className={`w-4 h-4 ${isSaving ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Open in New Tab */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              title={isBn ? "নতুন উইন্ডোতে খুলুন" : "Open in new window"}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-900/5">
        {previewUrl ? (
          <div
            className={`transition-all duration-300 h-full flex flex-col items-center justify-center ${
              device === "mobile" ? "w-[390px] max-w-full" : "w-full"
            }`}
          >
            {device === "mobile" ? (
              /* Mobile Shell Frame */
              <div className="w-full h-full max-h-[820px] bg-black p-2.5 rounded-[40px] shadow-2xl border-4 border-gray-800 flex flex-col relative overflow-hidden">
                {/* Notch / Speaker bar */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-10 h-1 bg-gray-800 rounded-full" />
                </div>
                <div className="w-full h-full rounded-[30px] overflow-hidden bg-white relative">
                  <iframe
                    key={key}
                    ref={iframeRef}
                    src={previewUrl}
                    title="Storefront Draft Preview"
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              </div>
            ) : (
              /* Desktop Frame */
              <div className="w-full h-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <iframe
                  key={key}
                  ref={iframeRef}
                  src={previewUrl}
                  title="Storefront Draft Preview"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-400">
            <p className="text-sm font-medium">
              {isBn ? "প্রিভিউ তৈরি হচ্ছে..." : "Generating preview token..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
