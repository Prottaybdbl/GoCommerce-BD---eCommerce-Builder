import React, { useState } from "react";
import {
  Menu,
  Search,
  Bell,
  Maximize,
  Minimize,
  ChevronDown,
  CheckCircle2,
  ClockAlert,
  ExternalLink,
  Sparkles,
  Settings,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";

export type AdminRole = "store_admin" | "super_admin";

interface NavbarProps {
  currentRole: AdminRole;
  onToggleSidebar: () => void;
  isSidebarCollapsed?: boolean;
  storeName: string;
  subdomain?: string;
  orderCount: number;
  incompleteCount: number;
  onSelectTab: (tab: any) => void;
  currentUser?: { id?: string; name?: string; email?: string; role?: string } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onToggleSidebar,
  storeName,
  orderCount,
  incompleteCount,
  onSelectTab,
  currentUser,
  onLogout,
}) => {
  const { t } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#e9ebec] shadow-[0_1px_2px_0_rgba(56,65,74,0.06)] transition-all">
      <div className="flex items-center justify-between h-[70px] px-4 lg:px-6">
        {/* Left: Hamburger & Search */}
        <div className="flex items-center gap-3 lg:gap-4 flex-1 max-w-xl">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 text-[#495057] hover:text-[#405189] hover:bg-[#f3f3f9] rounded-lg transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Velzon App Search Bar */}
          <div className="relative w-full max-w-md hidden sm:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-[#f3f3f9] text-[#495057] placeholder-[#878a99] text-xs font-medium pl-10 pr-14 py-2.5 rounded-lg border border-transparent focus:border-[#405189]/40 focus:bg-white focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-[#878a99] absolute left-3.5 top-3" />
              <span className="absolute right-3 top-2.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#e9ebec] text-[#495057] rounded border border-[#ced4da]">
                ⌘K
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Icons & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 text-[#878a99] hover:text-[#405189] hover:bg-[#f3f3f9] rounded-full transition-colors hidden sm:block"
            title={t.fullscreen}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 text-[#878a99] hover:text-[#405189] hover:bg-[#f3f3f9] rounded-full transition-colors relative"
              title={t.notifications}
            >
              <Bell className="w-5 h-5" />
              {(orderCount > 0 || incompleteCount > 0) && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#f06548] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {orderCount + incompleteCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-[#e9ebec] py-2 z-50">
                <div className="px-4 py-2 border-b border-[#e9ebec] flex items-center justify-between">
                  <h6 className="text-xs font-bold text-[#495057] uppercase tracking-wider">{t.realtimeNotifications}</h6>
                  <span className="text-[10px] font-bold bg-[#405189]/10 text-[#405189] px-2 py-0.5 rounded-full">
                    {orderCount + incompleteCount} {t.active}
                  </span>
                </div>
                <div className="divide-y divide-[#e9ebec] max-h-72 overflow-y-auto">
                  {orderCount > 0 && (
                    <div
                      onClick={() => {
                        onSelectTab("orders");
                        setShowNotifications(false);
                      }}
                      className="px-4 py-3 hover:bg-[#f3f3f9] cursor-pointer flex items-start gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0ab39c] flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#495057]">
                          {orderCount} {t.newOrdersNotice}
                        </p>
                        <p className="text-[11px] text-[#878a99] mt-0.5">{t.callCustomerNotice}</p>
                        <span className="text-[10px] text-[#0ab39c] font-medium block mt-1">{t.justNow}</span>
                      </div>
                    </div>
                  )}

                  {incompleteCount > 0 && (
                    <div
                      onClick={() => {
                        onSelectTab("incomplete");
                        setShowNotifications(false);
                      }}
                      className="px-4 py-3 hover:bg-[#f3f3f9] cursor-pointer flex items-start gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-[#f7b84b] flex items-center justify-center shrink-0 mt-0.5">
                        <ClockAlert className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#495057]">
                          {incompleteCount} {t.incompleteNotice}
                        </p>
                        <p className="text-[11px] text-[#878a99] mt-0.5">{t.recoverNotice}</p>
                        <span className="text-[10px] text-[#f7b84b] font-medium block mt-1">3m ago</span>
                      </div>
                    </div>
                  )}

                  <div className="px-4 py-3 hover:bg-[#f3f3f9] flex items-start gap-3 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#299cdb] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[#495057]">
                        {t.mediaEngineNotice}
                      </p>
                      <p className="text-[11px] text-[#878a99] mt-0.5">{t.zeroServerNotice}</p>
                      <span className="text-[10px] text-[#878a99] block mt-1">{t.today}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-[#e9ebec] text-center bg-[#f3f3f9]/50">
                  <button
                    onClick={() => {
                      onSelectTab("orders");
                      setShowNotifications(false);
                    }}
                    className="text-xs font-semibold text-[#405189] hover:underline"
                  >
                    {t.viewAllNotifications}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill Avatar Dropdown */}
          <div className="relative pl-1">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#f3f3f9] transition-colors"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-[#405189] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#e9ebec]">
                  {currentRole === "super_admin"
                    ? "SA"
                    : currentUser?.name
                    ? currentUser.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                    : "TA"}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#0ab39c] border-2 border-white rounded-full"></span>
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-[#495057]">
                  {currentRole === "super_admin" ? "Super Admin" : currentUser?.name || "Merchant Admin"}
                </div>
                <div className="text-[11px] text-[#878a99]">
                  {currentRole === "super_admin" ? t.platformMaster : t.storeOwner}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#878a99] hidden lg:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#e9ebec] py-2 z-50">
                <div className="px-4 py-2 border-b border-[#e9ebec]">
                  <div className="text-xs font-bold text-[#495057]">
                    {currentRole === "super_admin" ? "Super Admin Platform" : storeName}
                  </div>
                  <div className="text-[11px] text-[#878a99]">
                    {currentUser?.email || "merchant@demo.com"}
                  </div>
                </div>

                <div className="py-1">
                  {currentRole !== "super_admin" && (
                    <a
                      href="http://localhost:4321"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full px-4 py-2 text-left text-xs font-medium text-[#495057] hover:bg-[#f3f3f9] flex items-center justify-between"
                    >
                      <span>{t.liveStorefront}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#878a99]" />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      onSelectTab("settings");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-[#495057] hover:bg-[#f3f3f9] flex items-center justify-between"
                  >
                    <span>{t.settings}</span>
                    <Settings className="w-3.5 h-3.5 text-[#878a99]" />
                  </button>
                </div>

                <div className="border-t border-[#e9ebec] pt-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-[#f06548] hover:bg-[#f3f3f9]"
                  >
                    {t.signOut}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
