import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  X,
  Sparkles,
  Calendar,
  Trash2,
  Power,
} from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import { useLanguage } from "../context/LanguageContext.js";
import { TenantItem } from "./SuperAdminView.js";

interface SuperTrialsViewProps {
  onNavigate?: (tab: any) => void;
}

export const SuperTrialsView: React.FC<SuperTrialsViewProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring_soon" | "expired">("all");

  // Modal States
  const [selectedTenantForExtend, setSelectedTenantForExtend] = useState<TenantItem | null>(null);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [isExtending, setIsExtending] = useState(false);

  const [selectedTenantForUpgrade, setSelectedTenantForUpgrade] = useState<TenantItem | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<string>("starter");
  const [upgradeInterval, setUpgradeInterval] = useState<"monthly" | "yearly">("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Manual Dates Modal States (Start Date + 30 Days auto count)
  const [selectedTenantForDates, setSelectedTenantForDates] = useState<TenantItem | null>(null);
  const [manualStartDate, setManualStartDate] = useState<string>("");
  const [manualDurationDays, setManualDurationDays] = useState<number>(30);
  const [manualEndDate, setManualEndDate] = useState<string>("");
  const [isSavingDates, setIsSavingDates] = useState(false);

  // Delete Modal States
  const [selectedTenantForDelete, setSelectedTenantForDelete] = useState<TenantItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = { "x-test-role": "super_admin" };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/super-admin/tenants", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tenants)) {
          setTenants(data.tenants);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch super admin tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Filter only trial stores
  const trialTenants = tenants.filter((tenant) => {
    const isTrial =
      tenant.isTrial === true ||
      tenant.status === "trialing" ||
      tenant.status === "expired" ||
      (tenant.isTrial ?? (tenant.planFeeBdt === 0 || tenant.plan.toLowerCase().includes("trial") || tenant.plan.toLowerCase().includes("pilot")));
    return isTrial;
  });

  const filteredTenants = trialTenants.filter((tenant) => {
    const matchesSearch =
      !searchFilter ||
      tenant.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchFilter.toLowerCase()) ||
      tenant.owner.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (tenant.phone && tenant.phone.includes(searchFilter));

    const daysRemaining = tenant.daysRemaining ?? 0;
    const isExpired = daysRemaining <= 0 || tenant.status === "expired";
    const isExpiringSoon = !isExpired && daysRemaining <= 3;
    const isActive = !isExpired && daysRemaining > 3;

    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = isActive;
    else if (statusFilter === "expiring_soon") matchesStatus = isExpiringSoon;
    else if (statusFilter === "expired") matchesStatus = isExpired;

    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const activeTrialsCount = trialTenants.filter((t) => (t.daysRemaining ?? 0) > 3 && t.status !== "expired").length;
  const expiringSoonCount = trialTenants.filter((t) => (t.daysRemaining ?? 0) > 0 && (t.daysRemaining ?? 0) <= 3 && t.status !== "expired").length;
  const expiredCount = trialTenants.filter((t) => (t.daysRemaining ?? 0) <= 0 || t.status === "expired").length;

  const totalDays = trialTenants.reduce((sum, t) => sum + (t.daysRemaining ?? 0), 0);
  const avgDaysRemaining = trialTenants.length > 0 ? Math.round(totalDays / trialTenants.length) : 0;

  const totalTrialGmv = trialTenants.reduce((sum, t) => sum + (t.monthlyGmv || 0), 0);
  const totalTrialOrders = trialTenants.reduce((sum, t) => sum + (t.ordersThisMonth || 0), 0);

  // Handle Trial Extension
  const handleConfirmExtend = async () => {
    if (!selectedTenantForExtend) return;
    setIsExtending(true);
    setFeedback(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/super-admin/tenants/${selectedTenantForExtend.id}/extend-trial`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ days: extendDays }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          text: language === "bn"
            ? `${selectedTenantForExtend.name}-এর ট্রায়াল সফলভাবে ${extendDays} দিন বৃদ্ধি করা হয়েছে।`
            : `Trial for ${selectedTenantForExtend.name} successfully extended by ${extendDays} days.`,
        });
        setSelectedTenantForExtend(null);
        await fetchTenants();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to extend trial." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to extend trial." });
    } finally {
      setIsExtending(false);
    }
  };

  // Handle Upgrade to Paid Plan
  const handleConfirmUpgrade = async () => {
    if (!selectedTenantForUpgrade) return;
    setIsUpgrading(true);
    setFeedback(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/super-admin/tenants/${selectedTenantForUpgrade.id}/plan`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          plan: upgradePlan,
          billingInterval: upgradeInterval,
          status: "active",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          text: language === "bn"
            ? `${selectedTenantForUpgrade.name}-কে সফলভাবে ${upgradePlan.toUpperCase()} পেইড প্ল্যানে উন্নীত করা হয়েছে!`
            : `${selectedTenantForUpgrade.name} has been upgraded to the ${upgradePlan.toUpperCase()} paid plan!`,
        });
        setSelectedTenantForUpgrade(null);
        await fetchTenants();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to upgrade store." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to upgrade store." });
    } finally {
      setIsUpgrading(false);
    }
  };

  // Toggle Tenant On/Off Handler
  const handleToggleStatus = async (tenant: TenantItem) => {
    const currentActive = tenant.isActive !== false && tenant.status !== "inactive" && tenant.status !== "suspended";
    const nextActive = !currentActive;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/status`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ isActive: nextActive, isTrial: true }),
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          text: nextActive
            ? `${tenant.name} সফলভাবে সক্রিয় (Turned ON) করা হয়েছে!`
            : `${tenant.name} সফলভাবে বন্ধ (Turned OFF) করা হয়েছে!`,
        });
        fetchTenants();
      } else {
        const data = await res.json().catch(() => ({}));
        setFeedback({ type: "error", text: data.error || "Failed to update status" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update status" });
    }
  };

  // Manual Dates Modal Handlers (Start Date + 30 Days auto count)
  const openDatesModal = (tenant: TenantItem) => {
    setSelectedTenantForDates(tenant);
    const now = new Date();
    const startStr = tenant.startDate || tenant.createdAt
      ? new Date(tenant.startDate || tenant.createdAt!).toISOString().split("T")[0]
      : now.toISOString().split("T")[0];
    setManualStartDate(startStr);
    setManualDurationDays(30);
    const startMs = new Date(startStr).getTime();
    const endStr = new Date(startMs + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setManualEndDate(endStr);
  };

  const handleStartDateChange = (newStartStr: string, duration: number = manualDurationDays) => {
    setManualStartDate(newStartStr);
    if (newStartStr) {
      const startMs = new Date(newStartStr).getTime();
      if (!isNaN(startMs)) {
        const calculatedEnd = new Date(startMs + duration * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        setManualEndDate(calculatedEnd);
      }
    }
  };

  const handleDurationChange = (days: number) => {
    setManualDurationDays(days);
    if (manualStartDate) {
      const startMs = new Date(manualStartDate).getTime();
      if (!isNaN(startMs)) {
        const calculatedEnd = new Date(startMs + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        setManualEndDate(calculatedEnd);
      }
    }
  };

  const handleSaveDates = async () => {
    if (!selectedTenantForDates || !manualStartDate) return;
    setIsSavingDates(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/super-admin/tenants/${selectedTenantForDates.id}/dates`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          startDate: manualStartDate,
          endDate: manualEndDate,
          durationDays: manualDurationDays,
        }),
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          text: `${selectedTenantForDates.name} এর টাইমলাইন সফলভাবে সেট করা হয়েছে (${manualDurationDays} দিন, সমাপ্তি: ${manualEndDate})!`,
        });
        setSelectedTenantForDates(null);
        fetchTenants();
      } else {
        const data = await res.json().catch(() => ({}));
        setFeedback({ type: "error", text: data.error || "Failed to update dates" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update dates" });
    } finally {
      setIsSavingDates(false);
    }
  };

  // Delete Tenant Handler
  const handleDeleteTenant = async () => {
    if (!selectedTenantForDelete) return;
    setIsDeleting(true);
    try {
      const headers: Record<string, string> = { "x-test-role": "super_admin" };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/super-admin/tenants/${selectedTenantForDelete.id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          text: `মার্চেন্ট ও স্টোর "${selectedTenantForDelete.name}" সফলভাবে ডিলিট করা হয়েছে!`,
        });
        setSelectedTenantForDelete(null);
        fetchTenants();
      } else {
        const data = await res.json().catch(() => ({}));
        setFeedback({ type: "error", text: data.error || "Failed to delete store" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete store" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>{language === "bn" ? "ফ্রি ট্রায়াল ম্যানেজমেন্ট" : "Trial Merchant Console"}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057]">{t.trialUsersTitle}</h2>
          <p className="text-xs text-[#878a99] mt-0.5">{t.trialUsersSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("super_paid")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0ab39c] hover:bg-[#099885] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.superPaidMenu}</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchTenants}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-[#e9ebec] text-[#495057] hover:bg-[#f3f3f9] text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#405189]" : ""}`} />
            <span>{language === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-[#0ab39c]/10 text-[#0ab39c] border border-[#0ab39c]/20"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4-KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Trials */}
        <div className="card-velzon p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.activeTrialsCount}</p>
            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20">
              15-Day Free
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#495057] mt-1.5">
            {activeTrialsCount} {language === "bn" ? "টি সক্রিয়" : "Active"}
          </h3>
          <p className="text-[11px] text-[#878a99] font-medium mt-2 flex items-center gap-1">
            <span className="text-slate-500">
              {expiredCount} {language === "bn" ? "টি মেয়াদোত্তীর্ণ" : "expired"}
            </span>
          </p>
        </div>

        {/* KPI 2: Avg Days Remaining */}
        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.avgDaysLeft}</p>
          <h3 className="text-xl font-bold text-[#405189] mt-1.5">
            {avgDaysRemaining} {language === "bn" ? "দিন" : "Days"}
          </h3>
          <p className="text-[11px] text-[#0ab39c] font-semibold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{language === "bn" ? "১৫ দিনের ট্রায়াল উইন্ডো" : "15-day onboarding window"}</span>
          </p>
        </div>

        {/* KPI 3: Expiring Soon */}
        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.expiringSoonCount}</p>
          <h3 className="text-xl font-bold text-amber-600 mt-1.5">
            {expiringSoonCount} {language === "bn" ? "টি স্টোর" : "stores"}
          </h3>
          <p className="text-[11px] text-amber-600 font-medium mt-2">
            {language === "bn" ? "অনবোর্ডিং বা পেইড আপগ্রেডের সুযোগ" : "Ready for sales follow-up & upgrade"}
          </p>
        </div>

        {/* KPI 4: Trial GMV & Orders */}
        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.trialOrdersGmv}</p>
          <h3 className="text-xl font-bold text-[#0ab39c] mt-1.5">{formatBdt(totalTrialGmv)}</h3>
          <p className="text-[11px] text-[#0ab39c] font-semibold mt-2">
            {totalTrialOrders} {language === "bn" ? "টি অর্ডার সম্পন্ন হয়েছে" : "orders generated in trial"}
          </p>
        </div>
      </div>

      {/* Trial Stores Table Section */}
      <div className="card-velzon">
        <div className="card-header-velzon flex-col sm:flex-row gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {language === "bn" ? "ট্রায়াল স্টোর তালিকা" : "Trial Merchant Stores"}
            </h4>
            <p className="text-[11px] text-[#878a99] mt-0.5">
              {language === "bn"
                ? `সর্বমোট ${trialTenants.length} টি স্টোর ফ্রি ট্রায়ালে রয়েছে`
                : `${trialTenants.length} stores enrolled in the 15-day free trial`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t.searchTrialsPlaceholder}
                className="bg-[#f3f3f9] text-[#495057] placeholder-[#878a99] text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189] w-48 sm:w-64"
              />
              <Search className="w-3.5 h-3.5 text-[#878a99] absolute left-2.5 top-2" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="active">{t.activeTrialStatus} (&gt;3d)</option>
              <option value="expiring_soon">{t.expiringSoonStatus} (≤3d)</option>
              <option value="expired">{t.expiredStatus}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#495057]">
            <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
              <tr>
                <th className="px-4 py-3">{t.storeAndBrand}</th>
                <th className="px-4 py-3">{t.ownerContact}</th>
                <th className="px-4 py-3">{t.trialProgress}</th>
                <th className="px-4 py-3">{language === "bn" ? "অর্ডার ও বিক্রি" : "Activity / GMV"}</th>
                <th className="px-4 py-3">{t.packageStatus}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#878a99]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#405189] border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === "bn" ? "ট্রায়াল স্টোর লোড হচ্ছে..." : "Loading trial stores..."}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#878a99]">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">{t.noTrialsFound}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === "bn"
                        ? "নতুন কোনো মার্চেন্ট ১৫ দিনের ফ্রি ট্রায়ালে নিবন্ধিত হলে এখানে দেখা যাবে।"
                        : "When a merchant registers for a 15-day trial, they will appear here in real time."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const daysLeft = tenant.daysRemaining ?? 0;
                  const isExpired = daysLeft <= 0;
                  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;
                  const isInactive = tenant.isActive === false || tenant.status === "inactive" || tenant.status === "suspended";
                  const progressPct = Math.min(100, Math.max(0, Math.round(((15 - daysLeft) / 15) * 100)));

                  const expiryDateStr = tenant.trialEndsAt
                    ? new Date(tenant.trialEndsAt).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "";

                  return (
                    <tr key={tenant.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                      {/* Store & Subdomain */}
                      <td className="px-4 py-3 font-semibold text-[#495057]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                            {tenant.subdomain.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{tenant.name}</div>
                            <div className="text-[10px] text-[#878a99] flex items-center gap-1">
                              <span>gocommercebd.online/{tenant.subdomain}</span>
                              {tenant.customDomain && (
                                <span className="text-[#0ab39c] font-bold">({tenant.customDomain})</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Contact */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#495057]">{tenant.owner}</div>
                        <div className="text-[10px] text-[#878a99]">{tenant.phone}</div>
                        {tenant.email && <div className="text-[10px] text-slate-400">{tenant.email}</div>}
                      </td>

                      {/* 15-Day Progress & Timeline */}
                      <td className="px-4 py-3">
                        <div className="w-44 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`font-bold ${
                                isExpired
                                  ? "text-red-600"
                                  : isExpiringSoon
                                  ? "text-amber-600 font-semibold"
                                  : "text-[#0ab39c]"
                              }`}
                            >
                              {isExpired
                                ? (language === "bn" ? "মেয়াদ উত্তীর্ণ" : "Expired")
                                : `${daysLeft} ${language === "bn" ? "দিন বাকি" : "days left"}`}
                            </span>
                            <span className="text-[10px] text-[#878a99]">{expiryDateStr}</span>
                          </div>
                          {/* Visual progress bar */}
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExpired
                                  ? "bg-red-500"
                                  : isExpiringSoon
                                  ? "bg-amber-500"
                                  : "bg-[#0ab39c]"
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Activity & GMV */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#495057]">{formatBdt(tenant.monthlyGmv)}</div>
                        <div className="text-[10px] text-[#0ab39c] font-medium">
                          {tenant.ordersThisMonth} {language === "bn" ? "টি অর্ডার" : "orders"}
                        </div>
                      </td>

                      {/* Status Badge & Quick ON/OFF Toggle */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isInactive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                              <Power className="w-3 h-3 text-gray-500" />
                              <span>{language === "bn" ? "বন্ধ (OFF)" : "Inactive"}</span>
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>{t.expiredLabel}</span>
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                              <span>{t.expiringSoonStatus}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t.activeTrialStatus}</span>
                            </span>
                          )}

                          {/* Quick ON/OFF Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(tenant)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              !isInactive ? "bg-[#0ab39c]" : "bg-slate-300"
                            }`}
                            title={!isInactive ? "Turn OFF Store" : "Turn ON Store"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                !isInactive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                          {/* Set Timeline Dates (30 Days manual calculation) */}
                          <button
                            type="button"
                            onClick={() => openDatesModal(tenant)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-bold transition-all cursor-pointer"
                            title="Set Start Date & 30-Day Period"
                          >
                            <Calendar className="w-3 h-3 text-blue-600" />
                            <span>{language === "bn" ? "তারিখ (৩০ দিন)" : "Dates (30d)"}</span>
                          </button>

                          {/* Extend Trial Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantForExtend(tenant);
                              setExtendDays(7);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-bold transition-all cursor-pointer"
                            title={t.extendTrialBtn}
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{t.extendTrialBtn}</span>
                          </button>

                          {/* Upgrade to Paid Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantForUpgrade(tenant);
                              setUpgradePlan("growth");
                              setUpgradeInterval("monthly");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#405189] hover:bg-[#364574] text-white rounded-md text-xs font-bold transition-all cursor-pointer"
                            title={t.upgradeToPaidBtn}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>{t.upgradeToPaidBtn}</span>
                          </button>

                          {/* Delete Store & User Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedTenantForDelete(tenant)}
                            className="inline-flex items-center justify-center p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md text-xs font-bold transition-all cursor-pointer"
                            title={language === "bn" ? "ইউজার মুছে ফেলুন" : "Delete User & Store"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* View Store */}
                          <a
                            href={`http://${tenant.subdomain}.localhost:4321`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            title={t.viewStore}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: EXTEND TRIAL PERIOD                         */}
      {/* ==================================================== */}
      {selectedTenantForExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-[#495057] text-sm">
                  {t.extendTrialModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantForExtend(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200/60">
                <p className="font-bold text-slate-800">{selectedTenantForExtend.name}</p>
                <p className="text-[11px] text-slate-600">
                  {selectedTenantForExtend.subdomain}.gocommercebd.online
                </p>
                <div className="mt-2 text-[11px] text-amber-800 flex items-center justify-between">
                  <span>
                    {language === "bn" ? "বর্তমান অবশিষ্ট দিন:" : "Current Days Remaining:"}{" "}
                    <strong>{selectedTenantForExtend.daysRemaining ?? 0} {language === "bn" ? "দিন" : "days"}</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#495057] mb-2">{t.extendDaysLabel}</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                        extendDays === d
                          ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      +{d} {language === "bn" ? "দিন" : "Days"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{language === "bn" ? "অথবা কাস্টম দিন:" : "Or custom days:"}</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={extendDays}
                    onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1 text-center font-bold text-[#495057] bg-[#f3f3f9] border border-[#e9ebec] rounded-lg focus:outline-none focus:border-[#405189]"
                  />
                  <span className="text-slate-500">{language === "bn" ? "দিন" : "days"}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-relaxed">
                {language === "bn"
                  ? `এই মার্চেন্ট স্টোরটি আরও ${extendDays} দিন প্ল্যাটফর্মটি কোনো সীমাবদ্ধতা ছাড়াই ব্যবহার করতে পারবে।`
                  : `This merchant store will be granted full access for an additional ${extendDays} days without interruption.`}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e9ebec] bg-[#f8f9fa]">
              <button
                type="button"
                onClick={() => setSelectedTenantForExtend(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                disabled={isExtending}
                onClick={handleConfirmExtend}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isExtending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isExtending ? t.savingText : t.confirmExtend}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: UPGRADE TO PAID PLAN                        */}
      {/* ==================================================== */}
      {selectedTenantForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#405189]" />
                <h3 className="font-bold text-[#495057] text-sm">
                  {t.upgradeModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantForUpgrade(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#405189]/5 p-3 rounded-lg border border-[#405189]/15">
                <p className="font-bold text-slate-800">{selectedTenantForUpgrade.name}</p>
                <p className="text-[11px] text-slate-600">
                  {selectedTenantForUpgrade.subdomain}.gocommercebd.online
                </p>
                <p className="text-[11px] text-[#405189] font-medium mt-1">
                  {language === "bn"
                    ? "পেইড প্ল্যানে আপগ্রেড করার পর স্টোরটি স্বয়ংক্রিয়ভাবে পেইড সাবস্ক্রাইবার তালিকায় যুক্ত হবে।"
                    : "Once upgraded, this store will convert from trial to an active paid subscription."}
                </p>
              </div>

              {/* Plan Tier Selection */}
              <div>
                <label className="block font-bold text-[#495057] mb-2">{t.selectPlanLabel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "starter", name: "Starter", price: "৳999/mo", color: "blue" },
                    { id: "growth", name: "Growth", price: "৳2,999/mo", color: "indigo" },
                    { id: "pro", name: "Pro", price: "৳4,999/mo", color: "purple" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setUpgradePlan(p.id)}
                      className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                        upgradePlan === p.id
                          ? "bg-[#405189]/10 border-[#405189] ring-2 ring-[#405189]/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-[11px] font-semibold text-[#0ab39c] mt-0.5">{p.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Billing Interval */}
              <div>
                <label className="block font-bold text-[#495057] mb-2">{t.billingIntervalLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpgradeInterval("monthly")}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      upgradeInterval === "monthly"
                        ? "bg-[#405189] text-white border-[#405189]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t.monthlyCycle}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpgradeInterval("yearly")}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      upgradeInterval === "yearly"
                        ? "bg-[#405189] text-white border-[#405189]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t.yearlyCycle}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e9ebec] bg-[#f8f9fa]">
              <button
                type="button"
                onClick={() => setSelectedTenantForUpgrade(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                disabled={isUpgrading}
                onClick={handleConfirmUpgrade}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#405189] hover:bg-[#364574] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isUpgrading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{isUpgrading ? t.savingText : t.confirmUpgrade}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: MANUAL TIMELINE DATES (START + 30 DAYS)     */}
      {/* ==================================================== */}
      {selectedTenantForDates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#405189]" />
                <h3 className="font-bold text-[#495057] text-sm">
                  {language === "bn" ? "স্টোর টাইমলাইন ও মেয়াদ নির্ধারণ" : "Set Store Timeline & Period"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantForDates(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200/60">
                <p className="font-bold text-slate-800">{selectedTenantForDates.name}</p>
                <p className="text-[11px] text-slate-600">
                  {selectedTenantForDates.subdomain}.gocommercebd.online
                </p>
              </div>

              {/* Start Date Input */}
              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1">
                  {language === "bn" ? "শুরুর তারিখ (Start Date)" : "Start Date"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={manualStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all cursor-pointer"
                />
              </div>

              {/* Duration Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1.5">
                  {language === "bn" ? "মেয়াদের দৈর্ঘ্য (Duration)" : "Duration"}
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[15, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDurationChange(d)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        manualDurationDays === d
                          ? "bg-[#405189] text-white border-[#405189] shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {d} {language === "bn" ? "দিন" : "Days"}{d === 30 ? " ★" : ""}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {language === "bn" ? "কাস্টম দিন সংখ্যা:" : "Custom Days:"}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={manualDurationDays}
                    onChange={(e) => handleDurationChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-[#f3f3f9] text-[#495057] text-xs font-bold px-2 py-1 rounded border border-slate-200 focus:outline-none focus:border-[#405189]"
                  />
                </div>
              </div>

              {/* Calculated End Date Live Preview */}
              <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/90 space-y-1.5">
                <div className="flex items-center justify-between text-emerald-900 font-bold text-xs">
                  <span>{language === "bn" ? "সমাপ্তির তারিখ (End Date):" : "End Date (Calculated):"}</span>
                  <span className="text-xs text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-300 font-mono font-bold">
                    {manualEndDate}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {language === "bn"
                    ? `শুরুর তারিখ থেকে স্বয়ংক্রিয়ভাবে ${manualDurationDays} দিন গণনা করে সমাপ্তি নির্ধারণ করা হয়েছে।`
                    : `Automatically counted ${manualDurationDays} days from start date.`}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e9ebec] bg-[#f8f9fa]">
              <button
                type="button"
                onClick={() => setSelectedTenantForDates(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                disabled={isSavingDates || !manualStartDate}
                onClick={handleSaveDates}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#405189] hover:bg-[#364574] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingDates ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isSavingDates ? t.savingText : (language === "bn" ? "সংরক্ষণ করুন" : "Save Timeline")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                         */}
      {/* ==================================================== */}
      {selectedTenantForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === "bn" ? "স্টোর ও ইউজার ডিলিট নিশ্চিতকরণ" : "Delete Store & Merchant"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === "bn" ? (
                  <>
                    আপনি কি নিশ্চিতভাবে <b className="text-slate-900">{selectedTenantForDelete.name}</b> (
                    <span className="text-[#405189]">{selectedTenantForDelete.subdomain}</span>) স্টোরটি স্থায়ীভাবে মুছে ফেলতে চান? এই পদক্ষেপটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete <b className="text-slate-900">{selectedTenantForDelete.name}</b> (
                    <span className="text-[#405189]">{selectedTenantForDelete.subdomain}</span>)? This action cannot be undone.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e9ebec] bg-[#f8f9fa]">
              <button
                type="button"
                onClick={() => setSelectedTenantForDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteTenant}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? (language === "bn" ? "ডিলিট হচ্ছে..." : "Deleting...") : (language === "bn" ? "স্থায়ীভাবে ডিলিট করুন" : "Delete Permanently")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
