import React from "react";
import {
  ExternalLink,
  X,
  Package,
  ShoppingBag,
  Settings,
  ShieldCheck,
  Clock,
  CreditCard,
} from "lucide-react";
import { AdminRole } from "./Navbar.js";
import { useLanguage } from "../context/LanguageContext.js";

export type NavTab =
  | "analytics"
  | "orders"
  | "incomplete"
  | "products"
  | "courier"
  | "theme"
  | "super_overview"
  | "super_tenants"
  | "super_health"
  | "super_packages"
  | "super_trials"
  | "super_paid"
  | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  orderCount: number;
  incompleteCount?: number;
  storeName?: string;
  subdomain?: string;
  currentRole: AdminRole;
  isCollapsed: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  orderCount,
  incompleteCount = 0,
  storeName,
  subdomain,
  currentRole,
  isCollapsed,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { t } = useLanguage();

  // On mobile drawer, always display full expanded layout with labels
  const isEffectiveCollapsed = isCollapsed && !isMobileOpen;

  // External store URL resolution
  const storefrontUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:4321"
      : subdomain
      ? `https://${subdomain}.gocommercebd.online`
      : "https://gocommercebd.online";

  const displayName = storeName || "NenuaHooli";

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          ${
            isMobileOpen
              ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl flex flex-col"
              : "hidden lg:flex lg:flex-col"
          }
          ${isEffectiveCollapsed ? "lg:w-20" : "lg:w-72"}
          bg-white text-slate-700 shrink-0 min-h-screen border-r border-[#eef0f2] transition-all duration-300 select-none z-30 font-sans
        `}
      >
        {/* Top Brand Logo Header */}
        <div className="h-[70px] px-5 border-b border-[#eef0f2] flex items-center justify-between shrink-0">
          {!isEffectiveCollapsed ? (
            <>
              <a href="/" className="flex items-center min-w-0 hover:opacity-90 transition-opacity">
                <img
                  src="/logo.png"
                  alt="Go Commerce BD"
                  className="h-9 w-auto max-w-[210px] object-contain drop-shadow-2xs"
                />
              </a>

              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            /* Collapsed Brand Icon */
            <div className="w-full flex items-center justify-center">
              <a
                href="/"
                className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shadow-2xs hover:shadow-xs transition-all"
                title="Go Commerce BD"
              >
                <img
                  src="/favicon.svg"
                  alt="Go Commerce BD"
                  className="w-6 h-6 object-contain"
                />
              </a>
            </div>
          )}
        </div>

        {/* Active Store Indicator Chip (Merchant Context) */}
        {!isEffectiveCollapsed && currentRole === "store_admin" && (
          <div className="px-4 pt-3.5 pb-1">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="font-semibold text-slate-800 truncate" title={displayName}>
                  {displayName}
                </span>
              </div>
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 rounded-md transition-colors shrink-0"
                title="View Storefront"
              >
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
              </a>
            </div>
          </div>
        )}

        {/* Navigation Menu List */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-1">
          {/* ======================================================== */}
          {/* STORE ADMIN MENU                                         */}
          {/* ======================================================== */}
          {currentRole === "store_admin" && (
            <>
              {/* 1. Dashboard */}
              <button
                type="button"
                onClick={() => onSelectTab("analytics")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "analytics"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Dashboard"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "analytics" ? "text-slate-900" : "text-slate-600"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="4" />
                    <line x1="9" x2="9" y1="3" y2="21" />
                  </svg>
                  {!isEffectiveCollapsed && <span className="text-[14px]">Dashboard</span>}
                </div>
              </button>

              {/* 2. Orders */}
              <button
                type="button"
                onClick={() => onSelectTab("orders")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "orders"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Orders"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "orders" ? "text-slate-900" : "text-slate-600"
                    }`}
                    strokeWidth={1.8}
                  />
                  {!isEffectiveCollapsed && <span className="text-[14px]">Orders</span>}
                </div>
                {!isEffectiveCollapsed && orderCount > 0 && (
                  <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                    {orderCount}
                  </span>
                )}
              </button>

              {/* 3. Products */}
              <button
                type="button"
                onClick={() => onSelectTab("products")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "products"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Products"
              >
                <div className="flex items-center gap-3">
                  <Package
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "products" ? "text-slate-900" : "text-slate-600"
                    }`}
                    strokeWidth={1.8}
                  />
                  {!isEffectiveCollapsed && <span className="text-[14px]">Products</span>}
                </div>
              </button>

              {/* 4. Themes */}
              <button
                type="button"
                onClick={() => onSelectTab("theme")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "theme"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Themes"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "theme" ? "text-slate-900" : "text-slate-600"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="3.5" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  {!isEffectiveCollapsed && <span className="text-[14px]">Themes</span>}
                </div>
              </button>

              {/* 5. Automations */}
              <button
                type="button"
                onClick={() => onSelectTab("courier")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "courier"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Automations"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "courier" ? "text-slate-900" : "text-slate-600"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                  {!isEffectiveCollapsed && <span className="text-[14px]">Automations</span>}
                </div>
              </button>

              {/* 6. Analytics */}
              <button
                type="button"
                onClick={() => onSelectTab("analytics")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "analytics" && false // Secondary state
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Analytics"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 shrink-0 text-slate-600 transition-colors"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                  </svg>
                  {!isEffectiveCollapsed && <span className="text-[14px]">Analytics</span>}
                </div>
              </button>

              {/* 7. Integrations */}
              <button
                type="button"
                onClick={() => onSelectTab("incomplete")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "incomplete"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Integrations & Leads"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "incomplete" ? "text-slate-900" : "text-slate-600"
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 12h6" />
                    <path d="m12 9 3 3-3 3" />
                  </svg>
                  {!isEffectiveCollapsed && <span className="text-[14px]">Integrations</span>}
                </div>
                {!isEffectiveCollapsed && incompleteCount > 0 && (
                  <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                    {incompleteCount}
                  </span>
                )}
              </button>

              {/* 8. Settings */}
              <button
                type="button"
                onClick={() => onSelectTab("settings")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "settings"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
                title="Settings"
              >
                <div className="flex items-center gap-3">
                  <Settings
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      currentTab === "settings" ? "text-slate-900" : "text-slate-600"
                    }`}
                    strokeWidth={1.8}
                  />
                  {!isEffectiveCollapsed && <span className="text-[14px]">Settings</span>}
                </div>
              </button>
            </>
          )}

          {/* ======================================================== */}
          {/* SUPER ADMIN PLATFORM MENU                                */}
          {/* ======================================================== */}
          {currentRole === "super_admin" && (
            <>
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {!isEffectiveCollapsed ? t.superAdminMenu : "•••"}
              </div>

              {/* Super Overview */}
              <button
                type="button"
                onClick={() => onSelectTab("super_overview")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "super_overview"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" strokeWidth={1.8} />
                  {!isEffectiveCollapsed && <span className="text-[14px]">{t.overview}</span>}
                </div>
              </button>

              {/* Trial Stores */}
              <button
                type="button"
                onClick={() => onSelectTab("super_trials")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "super_trials"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={1.8} />
                  {!isEffectiveCollapsed && <span className="text-[14px]">{t.superTrialsMenu}</span>}
                </div>
                {!isEffectiveCollapsed && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    15D
                  </span>
                )}
              </button>

              {/* Paid Merchants */}
              <button
                type="button"
                onClick={() => onSelectTab("super_paid")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "super_paid"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={1.8} />
                  {!isEffectiveCollapsed && <span className="text-[14px]">{t.superPaidMenu}</span>}
                </div>
                {!isEffectiveCollapsed && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    PRO
                  </span>
                )}
              </button>

              {/* Packages */}
              <button
                type="button"
                onClick={() => onSelectTab("super_packages")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "super_packages"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-600 shrink-0" strokeWidth={1.8} />
                  {!isEffectiveCollapsed && <span className="text-[14px]">{t.packagesMenu}</span>}
                </div>
              </button>

              {/* Theme Studio */}
              <button
                type="button"
                onClick={() => onSelectTab("theme")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "theme"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-pink-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="3.5" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  {!isEffectiveCollapsed && <span className="text-[14px]">Theme Studio</span>}
                </div>
              </button>

              {/* Super Settings */}
              <button
                type="button"
                onClick={() => onSelectTab("settings")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                  currentTab === "settings"
                    ? "bg-[#f4f5f6] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-slate-600 shrink-0" strokeWidth={1.8} />
                  {!isEffectiveCollapsed && <span className="text-[14px]">{t.settings}</span>}
                </div>
              </button>
            </>
          )}
        </nav>

        {/* Subtle Clean Footer */}
        {!isEffectiveCollapsed && (
          <div className="p-3.5 mx-3 mb-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-600">{t.serverActive}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">v2.1</span>
          </div>
        )}
      </aside>
    </>
  );
};
