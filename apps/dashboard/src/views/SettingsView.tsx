import React, { useState } from "react";
import {
  Globe,
  CheckCircle2,
  Sliders,
  Shield,
  Store,
  Volume2,
  Database,
  ExternalLink,
  ChevronRight,
  Save,
  Check,
} from "lucide-react";
import { useLanguage, Language } from "../context/LanguageContext.js";
import { AdminRole } from "../components/Navbar.js";

interface SettingsViewProps {
  currentUser?: { id?: string; name?: string; email?: string; role?: string } | null;
  currentRole: AdminRole;
  storeConfig?: {
    name?: string;
    subdomain?: string;
    themeArchetype?: string;
  };
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  currentRole,
  storeConfig,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#878a99] uppercase tracking-wider mb-1">
            <span>{currentRole === "super_admin" ? t.superAdminMenu : t.dashboards}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#495057]">{t.settings}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057] flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#405189]" />
            <span>{t.settingsTitle}</span>
          </h2>
          <p className="text-xs text-[#878a99] mt-0.5">{t.settingsSubtitle}</p>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#405189] hover:bg-[#364473] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
        >
          {isSaving ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{isSaving ? t.savingSettings : t.saveSettings}</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {showSavedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{t.savedSuccess}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
            {language === "en" ? "English (US) Active" : "বাংলা সক্রিয়"}
          </span>
        </div>
      )}

      {/* 1. Language Preference Card (Main Requested Feature) */}
      <div className="bg-white rounded-xl shadow-xs border border-[#e9ebec] p-5 sm:p-6 transition-all">
        <div className="flex items-start justify-between pb-4 border-b border-[#e9ebec] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#405189]/10 text-[#405189] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#495057]">{t.languageSection}</h3>
              <p className="text-xs text-[#878a99] mt-0.5">{t.languageDesc}</p>
            </div>
          </div>
        </div>

        {/* 2-Column Language Cards: English & Bangla */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: English (Default) */}
          <div
            onClick={() => handleLanguageSelect("en")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
              language === "en"
                ? "border-[#405189] bg-[#405189]/5 shadow-xs ring-2 ring-[#405189]/10"
                : "border-[#e9ebec] hover:border-gray-300 hover:bg-[#f3f3f9]/50"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label="English">
                  🇬🇧
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#495057]">{t.english}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {t.defaultBadge}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#878a99] font-medium">Platform Standard</span>
                </div>
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  language === "en"
                    ? "border-[#405189] bg-[#405189] text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {language === "en" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            <p className="text-xs text-[#6d758f] leading-relaxed mb-3">{t.englishDesc}</p>

            <div className="flex items-center justify-between pt-2 border-t border-[#e9ebec]/60 text-[11px]">
              <span className="text-[#878a99]">Language Code: <strong className="text-[#495057]">en-US</strong></span>
              {language === "en" && (
                <span className="text-[10px] font-bold text-[#405189] bg-[#405189]/10 px-2 py-0.5 rounded">
                  ✓ {t.activeBadge}
                </span>
              )}
            </div>
          </div>

          {/* Option B: Bangla */}
          <div
            onClick={() => handleLanguageSelect("bn")}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
              language === "bn"
                ? "border-[#0ab39c] bg-[#0ab39c]/5 shadow-xs ring-2 ring-[#0ab39c]/10"
                : "border-[#e9ebec] hover:border-gray-300 hover:bg-[#f3f3f9]/50"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label="Bangla">
                  🇧🇩
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#495057]">{t.bangla}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Local
                    </span>
                  </div>
                  <span className="text-[11px] text-[#878a99] font-medium">বাংলা ভাষা</span>
                </div>
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  language === "bn"
                    ? "border-[#0ab39c] bg-[#0ab39c] text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                {language === "bn" && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            <p className="text-xs text-[#6d758f] leading-relaxed mb-3">{t.banglaDesc}</p>

            <div className="flex items-center justify-between pt-2 border-t border-[#e9ebec]/60 text-[11px]">
              <span className="text-[#878a99]">Language Code: <strong className="text-[#495057]">bn-BD</strong></span>
              {language === "bn" && (
                <span className="text-[10px] font-bold text-[#0ab39c] bg-[#0ab39c]/10 px-2 py-0.5 rounded">
                  ✓ {t.activeBadge}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Store Profile & Account Section */}
      <div className="bg-white rounded-xl shadow-xs border border-[#e9ebec] p-5 sm:p-6 transition-all">
        <div className="flex items-start justify-between pb-4 border-b border-[#e9ebec] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0ab39c] flex items-center justify-center shrink-0">
              {currentRole === "super_admin" ? (
                <Shield className="w-5 h-5" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#495057]">{t.storeSettingsSection}</h3>
              <p className="text-xs text-[#878a99] mt-0.5">{t.storeSettingsDesc}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3.5 bg-[#f3f3f9] rounded-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#878a99] block mb-1">
              {t.storeNameLabel}
            </span>
            <span className="text-xs font-bold text-[#495057]">
              {currentRole === "super_admin"
                ? "Go Commerce BD Platform Master"
                : storeConfig?.name || "My Store"}
            </span>
          </div>

          <div className="p-3.5 bg-[#f3f3f9] rounded-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#878a99] block mb-1">
              {t.accountRoleLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#405189]">
              {currentRole === "super_admin" ? t.platformMaster : t.storeOwner}
              {currentUser?.email && (
                <span className="text-[10px] text-[#878a99] font-normal">({currentUser.email})</span>
              )}
            </span>
          </div>

          <div className="p-3.5 bg-[#f3f3f9] rounded-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#878a99] block mb-1">
              {t.currencyLabel}
            </span>
            <span className="text-xs font-bold text-[#0ab39c] flex items-center gap-1">
              <span>৳ BDT</span>
              <span className="text-[10px] text-[#878a99] font-normal">(1 BDT = 100 Poisha)</span>
            </span>
          </div>
        </div>

        {currentRole !== "super_admin" && (
          <div className="mt-4 pt-4 border-t border-[#e9ebec] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#878a99]">
              <span>{t.subdomainLabel}:</span>
              <code className="text-[#405189] font-bold bg-[#f3f3f9] px-2 py-0.5 rounded">
                gocommercebd.online/{storeConfig?.subdomain || "mystore"}
              </code>
            </div>
            <a
              href="http://localhost:4321"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#405189] font-bold hover:underline"
            >
              <span>{t.liveStore}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* 3. System Preferences & Audio Alerts */}
      <div className="bg-white rounded-xl shadow-xs border border-[#e9ebec] p-5 sm:p-6 transition-all">
        <div className="flex items-start justify-between pb-4 border-b border-[#e9ebec] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#405189] flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#495057]">{t.systemPreferences}</h3>
              <p className="text-xs text-[#878a99] mt-0.5">{t.systemPreferencesDesc}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="text-xs font-bold text-[#495057]">{t.soundAlerts}</h4>
            <p className="text-[11px] text-[#878a99] mt-0.5">{t.soundAlertsDesc}</p>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              soundEnabled ? "bg-[#0ab39c]" : "bg-gray-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                soundEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            ></div>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-[#e9ebec] flex items-center justify-between text-xs text-[#878a99]">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#0ab39c]" />
            <span>PostgreSQL 18 Row-Level Security Scoped</span>
          </span>
          <span className="text-[10px] font-bold bg-[#f3f3f9] text-[#878a99] px-2 py-0.5 rounded">
            v2.1
          </span>
        </div>
      </div>
    </div>
  );
};
