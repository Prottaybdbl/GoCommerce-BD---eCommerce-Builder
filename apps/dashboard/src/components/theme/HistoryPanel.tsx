import React, { useState, useEffect } from "react";
import { History, RotateCcw, CheckCircle, Clock } from "lucide-react";
import { apiFetch } from "../../lib/api.js";

interface RevisionItem {
  id: string;
  version: number;
  snapshot: any;
  createdBy?: string;
  note?: string;
  createdAt: string;
}

interface HistoryPanelProps {
  currentPublishedVersion: number;
  onRollback: (version: number) => Promise<void>;
  language?: "bn" | "en";
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  currentPublishedVersion,
  onRollback,
  language = "bn",
}) => {
  const isBn = language === "bn";
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBackVersion, setRollingBackVersion] = useState<number | null>(null);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/v1/theme/revisions");
      if (res?.success) {
        setRevisions(res.revisions || []);
      }
    } catch (err) {
      console.warn("Failed to load revisions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, [currentPublishedVersion]);

  const handleRollbackClick = async (version: number) => {
    const confirmed = window.confirm(
      isBn
        ? `আপনি কি নিশ্চিতভাবে সংস্করণ ${version}-এ রোলব্যাক করতে চান? এটি সাথে সাথে আপনার লাইভ স্টোরফ্রন্টে ফিরে যাবে।`
        : `Are you sure you want to rollback to version ${version}? This will immediately restore this snapshot to your live storefront.`
    );
    if (!confirmed) return;

    setRollingBackVersion(version);
    try {
      await onRollback(version);
      await fetchRevisions();
    } finally {
      setRollingBackVersion(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {isBn ? "পাবলিশ হিস্ট্রি ও রোলব্যাক" : "Publish History & Rollback"}
            </h3>
            <p className="text-[11px] text-gray-500">
              {isBn
                ? "যেকোনো পূর্ববর্তী সংস্করণে এক ক্লিকে ফিরে যাওয়ার সুযোগ"
                : "Restore any previously published version with 1 click"}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">
          {isBn ? "হিস্ট্রি লোড হচ্ছে..." : "Loading revisions..."}
        </div>
      ) : revisions.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">
            {isBn ? "এখনও কোনো ভার্সন পাবলিশ করা হয়নি।" : "No published revisions yet."}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {isBn
              ? "প্রথমবার পাবলিশ করলে এখানে হিস্ট্রি ও ব্যাকআপ সংরক্ষিত হবে।"
              : "Revisions are created automatically every time you publish."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {revisions.map((rev) => {
            const isCurrent = rev.version === currentPublishedVersion;
            const dateStr = new Date(rev.createdAt).toLocaleString(isBn ? "bn-BD" : "en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            return (
              <div
                key={rev.id || rev.version}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-emerald-200 bg-emerald-50/40 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        isCurrent
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      v{rev.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isBn ? "বর্তমান লাইভ" : "Current live"}</span>
                      </span>
                    )}
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={rollingBackVersion !== null}
                      onClick={() => handleRollbackClick(rev.version)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-purple-600 hover:text-white text-gray-700 transition-colors shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isBn ? "রোলব্যাক" : "Rollback"}</span>
                    </button>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  {rev.note || `Published snapshot v${rev.version}`}
                </div>

                <div className="mt-1 text-[11px] text-gray-400 flex items-center gap-2">
                  <span>{dateStr}</span>
                  {rev.snapshot?.templateId && (
                    <span>• {rev.snapshot.templateId}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
