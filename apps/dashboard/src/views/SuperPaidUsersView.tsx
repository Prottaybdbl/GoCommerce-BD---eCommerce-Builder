import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  ExternalLink,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  X,
  Sparkles,
  Crown,
  Clock,
  Trash2,
  Power,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import { useLanguage } from "../context/LanguageContext.js";
import { TenantItem } from "./SuperAdminView.js";

interface SuperPaidUsersViewProps {
  onNavigate?: (tab: any) => void;
}

export const SuperPaidUsersView: React.FC<SuperPaidUsersViewProps> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [intervalFilter, setIntervalFilter] = useState<string>("all");

  // Modal States
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<TenantItem | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>("growth");
  const [selectedNewInterval, setSelectedNewInterval] = useState<"monthly" | "yearly">("monthly");
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>("active");
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Manual Dates Modal States (Start Date + 30 Days auto count)
  const [selectedTenantForDates, setSelectedTenantForDates] = useState<TenantItem | null>(null);
  const [manualStartDate, setManualStartDate] = useState<string>("");
  const [manualDurationDays, setManualDurationDays] = useState<number>(30);
  const [manualEndDate, setManualEndDate] = useState<string>("");
  const [isSavingDates, setIsSavingDates] = useState(false);

  // Delete Modal States
  const [selectedTenantForDelete, setSelectedTenantForDelete] = useState<TenantItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual Add Paid Merchant Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPlan, setNewPlan] = useState("growth");
  const [newInterval, setNewInterval] = useState<"monthly" | "yearly">("monthly");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [newDurationDays, setNewDurationDays] = useState(30);
  const [newEndDate, setNewEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [addSuccessData, setAddSuccessData] = useState<{
    store: any;
    credentials: { email: string; password: string };
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

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

  // Filter only paid stores
  const paidTenants = tenants.filter((tenant) => {
    const isPaid = tenant.isPaid ?? (tenant.planFeeBdt > 0 && !tenant.plan.toLowerCase().includes("trial") && !tenant.plan.toLowerCase().includes("pilot"));
    return isPaid && tenant.status !== "trialing" && tenant.status !== "expired";
  });

  const filteredTenants = paidTenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchFilter.toLowerCase()) ||
      tenant.owner.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (tenant.phone && tenant.phone.includes(searchFilter));

    const matchesPlan =
      planFilter === "all" || tenant.plan.toLowerCase().includes(planFilter.toLowerCase());

    const matchesInterval =
      intervalFilter === "all" ||
      (tenant.billingInterval || "monthly").toLowerCase() === intervalFilter.toLowerCase();

    return matchesSearch && matchesPlan && matchesInterval;
  });

  // KPI Calculations
  const totalPaidCount = paidTenants.length;
  const totalMrrPoisha = paidTenants.reduce((sum, t) => sum + (t.planFeeBdt || 0), 0);
  const totalArrPoisha = totalMrrPoisha * 12;
  const highTierCount = paidTenants.filter((t) => {
    const p = t.plan.toLowerCase();
    return p.includes("growth") || p.includes("pro") || p.includes("enterprise");
  }).length;

  const totalPaidGmv = paidTenants.reduce((sum, t) => sum + (t.monthlyGmv || 0), 0);
  const totalPaidOrders = paidTenants.reduce((sum, t) => sum + (t.ordersThisMonth || 0), 0);

  // Handle Plan Change
  const handleSavePlan = async () => {
    if (!selectedTenantForPlan) return;
    setIsSavingPlan(true);
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
      const res = await fetch(`/api/super-admin/tenants/${selectedTenantForPlan.id}/plan`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          plan: selectedNewPlan,
          billingInterval: selectedNewInterval,
          status: selectedNewStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          text: language === "bn"
            ? `${selectedTenantForPlan.name}-এর সাবস্ক্রিপশন সফলভাবে ${selectedNewPlan.toUpperCase()} প্ল্যানে পরিবর্তন করা হয়েছে।`
            : `Subscription for ${selectedTenantForPlan.name} successfully updated to ${selectedNewPlan.toUpperCase()}.`,
        });
        setSelectedTenantForPlan(null);
        await fetchTenants();
      } else {
        setFeedback({ type: "error", text: data.error || "Failed to update plan." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to update plan." });
    } finally {
      setIsSavingPlan(false);
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
        body: JSON.stringify({ isActive: nextActive, isTrial: false }),
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
          text: `${selectedTenantForDates.name} এর সাবস্ক্রিপশন সময়সীমা সফলভাবে আপডেট করা হয়েছে (${manualDurationDays} দিন, সমাপ্তি: ${manualEndDate})!`,
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
          text: `পেইড মার্চেন্ট ও স্টোর "${selectedTenantForDelete.name}" সফলভাবে ডিলিট করা হয়েছে!`,
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

  // Add Paid Merchant Handlers
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleNewStoreNameChange = (val: string) => {
    setNewStoreName(val);
    if (!newSubdomain || newSubdomain === val.slice(0, -1).toLowerCase().replace(/[^a-z0-9-]/g, "")) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 25);
      setNewSubdomain(slug);
    }
  };

  const openAddModal = () => {
    const today = new Date().toISOString().split("T")[0];
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setNewStoreName("");
    setNewSubdomain("");
    setNewOwnerName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword(generateRandomPassword());
    setShowPassword(true);
    setNewPlan("growth");
    setNewInterval("monthly");
    setNewStartDate(today);
    setNewDurationDays(30);
    setNewEndDate(end);
    setAddSuccessData(null);
    setIsCopied(false);
    setIsAddModalOpen(true);
  };

  const handleNewStartDateChange = (dateStr: string, duration: number = newDurationDays) => {
    setNewStartDate(dateStr);
    if (dateStr) {
      const ms = new Date(dateStr).getTime();
      if (!isNaN(ms)) {
        const calculated = new Date(ms + duration * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        setNewEndDate(calculated);
      }
    }
  };

  const handleNewDurationChange = (days: number) => {
    setNewDurationDays(days);
    if (newStartDate) {
      const ms = new Date(newStartDate).getTime();
      if (!isNaN(ms)) {
        const calculated = new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        setNewEndDate(calculated);
      }
    }
  };

  const handleCreatePaidMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newSubdomain || !newOwnerName || !newEmail || !newPassword) {
      setFeedback({
        type: "error",
        text: language === "bn" ? "দয়া করে সকল বাধ্যতামূলক তথ্য পূরণ করুন।" : "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmittingNew(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-test-role": "super_admin",
      };
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/super-admin/tenants/create-paid", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          storeName: newStoreName.trim(),
          subdomain: newSubdomain.trim().toLowerCase(),
          ownerName: newOwnerName.trim(),
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim(),
          password: newPassword,
          plan: newPlan,
          billingInterval: newInterval,
          startDate: newStartDate,
          durationDays: newDurationDays,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAddSuccessData({
          store: data.store,
          credentials: data.credentials,
        });
        setFeedback({
          type: "success",
          text: language === "bn"
            ? `পেইড মার্চেন্ট "${data.store.name}" সফলভাবে তৈরি হয়েছে!`
            : `Paid merchant "${data.store.name}" successfully created!`,
        });
        fetchTenants();
      } else {
        setFeedback({
          type: "error",
          text: data.error || "Failed to create paid merchant",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Failed to create paid merchant",
      });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!addSuccessData) return;
    const { store, credentials } = addSuccessData;
    const text =
      `Go Commerce BD — মার্চেন্ট লগইন তথ্য\n` +
      `স্টোর: ${store.name}\n` +
      `লগইন লিংক: ${store.loginUrl || "https://app.gocommercebd.online/login"}\n` +
      `ইমেইল: ${credentials.email}\n` +
      `পাসওয়ার্ড: ${credentials.password}\n` +
      `প্ল্যান: ${store.plan} (${newDurationDays} দিন)\n` +
      `মেয়াদ শেষ: ${new Date(store.endDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}\n` +
      `স্টোর ভিজিট: https://gocommercebd.online/${store.subdomain}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0ab39c] uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>{language === "bn" ? "পেইড সাবস্ক্রিপশন কনসোল" : "Paid Subscription Console"}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057]">{t.paidUsersTitle}</h2>
          <p className="text-xs text-[#878a99] mt-0.5">{t.paidUsersSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Paid Merchant Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0ab39c] hover:bg-[#089682] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            title="Manually create a new paid merchant store & account"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "নতুন পেইড ইউজার যুক্ত করুন" : "+ Add Paid Merchant"}</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("super_trials")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t.superTrialsMenu}</span>
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
        {/* KPI 1: Total Paid Subscribers */}
        <div className="card-velzon p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.totalPaidStores}</p>
            <span className="text-[10px] font-bold bg-[#0ab39c]/10 text-[#0ab39c] px-2 py-0.5 rounded-full border border-[#0ab39c]/20">
              Active Paid
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#495057] mt-1.5">
            {totalPaidCount} {language === "bn" ? "টি স্টোর" : "stores"}
          </h3>
          <p className="text-[11px] text-[#0ab39c] font-semibold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>
              {formatBdt(totalPaidGmv)} ({totalPaidOrders} {language === "bn" ? "টি অর্ডার" : "orders"})
            </span>
          </p>
        </div>

        {/* KPI 2: MRR */}
        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.mrrLabel}</p>
          <h3 className="text-xl font-bold text-amber-600 mt-1.5">{formatBdt(totalMrrPoisha)}</h3>
          <p className="text-[11px] text-[#878a99] font-medium mt-2">
            {language === "bn" ? "প্রতি মাসের সাবস্ক্রিপশন আয়" : "Monthly recurring cashflow"}
          </p>
        </div>

        {/* KPI 3: ARR */}
        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.arrLabel}</p>
          <h3 className="text-xl font-bold text-[#405189] mt-1.5">{formatBdt(totalArrPoisha)}</h3>
          <p className="text-[11px] text-[#405189] font-semibold mt-2">
            MRR × 12 {language === "bn" ? "মাসিক পূর্বাভাস" : "annual projection"}
          </p>
        </div>

        {/* KPI 4: Tier Breakdown */}
        <div className="card-velzon p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.tierBreakdown}</p>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-purple-700 mt-1.5">
            {highTierCount} {language === "bn" ? "টি স্টোর" : "stores"}
          </h3>
          <p className="text-[11px] text-purple-600 font-semibold mt-2">
            {totalPaidCount > 0 ? Math.round((highTierCount / totalPaidCount) * 100) : 0}%{" "}
            {language === "bn" ? "উচ্চ টায়ার অংশীদার" : "share of subscriber base"}
          </p>
        </div>
      </div>

      {/* Paid Subscribers Table Section */}
      <div className="card-velzon">
        <div className="card-header-velzon flex-col sm:flex-row gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {language === "bn" ? "পেইড সাবস্ক্রাইবার তালিকা" : "Paid Subscribers Directory"}
            </h4>
            <p className="text-[11px] text-[#878a99] mt-0.5">
              {language === "bn"
                ? `সর্বমোট ${paidTenants.length} টি সক্রিয় পেইড মার্চেন্ট স্টোর`
                : `${paidTenants.length} active merchant subscriptions generating revenue`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={t.searchPaidPlaceholder}
                className="bg-[#f3f3f9] text-[#495057] placeholder-[#878a99] text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189] w-48 sm:w-64"
              />
              <Search className="w-3.5 h-3.5 text-[#878a99] absolute left-2.5 top-2" />
            </div>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none"
            >
              <option value="all">{t.allPlans}</option>
              <option value="starter">Starter (৳999)</option>
              <option value="growth">Growth (৳2,999)</option>
              <option value="pro">Pro (৳4,999)</option>
              <option value="enterprise">Enterprise</option>
            </select>

            {/* Interval Filter */}
            <select
              value={intervalFilter}
              onChange={(e) => setIntervalFilter(e.target.value)}
              className="bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none"
            >
              <option value="all">{language === "bn" ? "সকল সাইকেল" : "All Cycles"}</option>
              <option value="monthly">{t.monthlyCycle}</option>
              <option value="yearly">{t.yearlyCycle}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#495057]">
            <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
              <tr>
                <th className="px-4 py-3">{t.storeAndBrand}</th>
                <th className="px-4 py-3">{t.ownerContact}</th>
                <th className="px-4 py-3">{t.subscriptionPlan}</th>
                <th className="px-4 py-3">{language === "bn" ? "মেয়াদ ও সাইকেল" : "Billing & Timeline"}</th>
                <th className="px-4 py-3">{t.monthlySales}</th>
                <th className="px-4 py-3">{language === "bn" ? "স্ট্যাটাস" : "Active Status"}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#878a99]">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#405189] border-t-transparent rounded-full animate-spin"></div>
                      <span>{language === "bn" ? "পেইড স্টোর লোড হচ্ছে..." : "Loading paid subscribers..."}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#878a99]">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">{t.noPaidFound}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === "bn"
                        ? "ট্রায়াল স্টোরগুলো পেইড প্ল্যানে আপগ্রেড হলে তাদের সাবস্ক্রিপশন এবং MRR তথ্য এখানে প্রদর্শিত হবে।"
                        : "When trial stores upgrade to Starter, Growth, or Pro plans, their active subscription records will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const planLower = tenant.plan.toLowerCase();
                  const isPro = planLower.includes("pro");
                  const isGrowth = planLower.includes("growth");
                  const isInactive = tenant.isActive === false || tenant.status === "inactive" || tenant.status === "suspended";

                  return (
                    <tr key={tenant.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                      {/* Store & Subdomain */}
                      <td className="px-4 py-3 font-semibold text-[#495057]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isPro
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : isGrowth
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            }`}
                          >
                            {tenant.subdomain.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{tenant.name}</span>
                              {isPro && <Crown className="w-3 h-3 text-purple-600 shrink-0" />}
                            </div>
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

                      {/* Subscription Plan & Fee */}
                      <td className="px-4 py-3">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isPro
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : isGrowth
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{tenant.plan}</span>
                          </span>
                          <div className="font-bold text-slate-800 text-xs mt-1">
                            {formatBdt(tenant.planFeeBdt)}
                            <span className="text-[10px] font-normal text-slate-500">
                              /{language === "bn" ? "মাস" : "mo"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Billing Interval & Renewal */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {tenant.billingInterval || "Monthly"}
                          </span>
                          <div className="text-[10px] text-[#878a99] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {tenant.startDate || tenant.createdAt
                                ? new Date(tenant.startDate || tenant.createdAt!).toLocaleDateString(
                                    language === "bn" ? "bn-BD" : "en-US",
                                    { month: "short", day: "numeric", year: "numeric" }
                                  )
                                : "Active"}
                            </span>
                          </div>
                          {tenant.endDate && (
                            <div className="text-[10px] text-emerald-600 font-bold">
                              {language === "bn" ? "সমাপ্তি: " : "Ends: "}
                              {new Date(tenant.endDate).toLocaleDateString(
                                language === "bn" ? "bn-BD" : "en-US",
                                { month: "short", day: "numeric", year: "numeric" }
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Monthly Sales & Orders */}
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
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{language === "bn" ? "সক্রিয় (Active)" : "Active"}</span>
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
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-[#0ab39c] font-semibold">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>RLS Scoped</span>
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

                          {/* Change Plan Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantForPlan(tenant);
                              setSelectedNewPlan(tenant.plan.toLowerCase().replace(/[^a-z]/g, "") || "growth");
                              setSelectedNewInterval(
                                (tenant.billingInterval?.toLowerCase() as any) === "yearly" ? "yearly" : "monthly"
                              );
                              setSelectedNewStatus(tenant.status || "active");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#405189] hover:bg-[#364574] text-white rounded-md text-xs font-bold transition-all cursor-pointer"
                            title={t.changePlanBtn}
                          >
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <span>{t.changePlanBtn}</span>
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
      {/* MODAL: CHANGE SUBSCRIPTION PLAN                      */}
      {/* ==================================================== */}
      {selectedTenantForPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#405189]" />
                <h3 className="font-bold text-[#495057] text-sm">
                  {language === "bn" ? "সাবস্ক্রিপশন প্ল্যান পরিবর্তন" : "Update Store Subscription"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantForPlan(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#405189]/5 p-3 rounded-lg border border-[#405189]/15">
                <p className="font-bold text-slate-800">{selectedTenantForPlan.name}</p>
                <p className="text-[11px] text-slate-600">
                  {selectedTenantForPlan.subdomain}.gocommercebd.online
                </p>
                <div className="mt-2 text-[11px] text-[#405189] flex items-center justify-between">
                  <span>
                    {language === "bn" ? "বর্তমান প্ল্যান:" : "Current Plan:"}{" "}
                    <strong>{selectedTenantForPlan.plan} ({formatBdt(selectedTenantForPlan.planFeeBdt)}/mo)</strong>
                  </span>
                </div>
              </div>

              {/* Plan Tier Selection */}
              <div>
                <label className="block font-bold text-[#495057] mb-2">{t.selectPlanLabel}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "starter", name: "Starter", price: "৳999/mo" },
                    { id: "growth", name: "Growth", price: "৳2,999/mo" },
                    { id: "pro", name: "Pro", price: "৳4,999/mo" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedNewPlan(p.id)}
                      className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                        selectedNewPlan === p.id
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

              {/* Billing Interval Selection */}
              <div>
                <label className="block font-bold text-[#495057] mb-2">{t.billingIntervalLabel}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNewInterval("monthly")}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      selectedNewInterval === "monthly"
                        ? "bg-[#405189] text-white border-[#405189]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t.monthlyCycle}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNewInterval("yearly")}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      selectedNewInterval === "yearly"
                        ? "bg-[#405189] text-white border-[#405189]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t.yearlyCycle}
                  </button>
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block font-bold text-[#495057] mb-2">
                  {language === "bn" ? "অ্যাকাউন্ট স্ট্যাটাস" : "Account Status"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("active")}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      selectedNewStatus === "active"
                        ? "bg-[#0ab39c] text-white border-[#0ab39c]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {language === "bn" ? "Active (সক্রিয়)" : "Active"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNewStatus("suspended")}
                    className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                      selectedNewStatus === "suspended"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {language === "bn" ? "Suspended (স্থগিত)" : "Suspended"}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e9ebec] bg-[#f8f9fa]">
              <button
                type="button"
                onClick={() => setSelectedTenantForPlan(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                disabled={isSavingPlan}
                onClick={handleSavePlan}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#405189] hover:bg-[#364574] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingPlan ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isSavingPlan ? t.savingText : t.confirmUpgrade}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: MANUAL TIMELINE DATES (START + 30 DAYS)     */}
      {/* ==================================================== */}
      {selectedTenantForDates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#405189]" />
                <h3 className="font-bold text-[#495057] text-sm">
                  {language === "bn" ? "পেইড স্টোর মেয়াদ ও সময়সীমা নির্ধারণ" : "Set Subscription Timeline & Period"}
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
      {/* MODAL 3: DELETE CONFIRMATION                         */}
      {/* ==================================================== */}
      {selectedTenantForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {language === "bn" ? "পেইড স্টোর ও ইউজার ডিলিট নিশ্চিতকরণ" : "Delete Paid Store & Merchant"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === "bn" ? (
                  <>
                    আপনি কি নিশ্চিতভাবে <b className="text-slate-900">{selectedTenantForDelete.name}</b> (
                    <span className="text-[#405189]">{selectedTenantForDelete.subdomain}</span>) পেইড স্টোরটি স্থায়ীভাবে মুছে ফেলতে চান? এই পদক্ষেপটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete paid store <b className="text-slate-900">{selectedTenantForDelete.name}</b> (
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
      {/* ==================================================== */}
      {/* MODAL 4: MANUALLY ADD PAID MERCHANT & CREATE ID      */}
      {/* ==================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0ab39c]/10 text-[#0ab39c] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#495057] text-sm">
                    {language === "bn" ? "নতুন পেইড মার্চেন্ট ও আইডি তৈরি করুন" : "Add Paid Merchant & Create Account"}
                  </h3>
                  <p className="text-[11px] text-[#878a99]">
                    {language === "bn"
                      ? "মার্চেন্টের আইডি তৈরি হবে এবং তারা সরাসরি ইমেইল দিয়ে লগইন করতে পারবে"
                      : "Directly creates login account and store for the merchant"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddSuccessData(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Created Successfully, show Credentials Card */}
            {addSuccessData ? (
              <div className="p-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">
                    {language === "bn" ? "পেইড অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!" : "Paid Account Created Successfully!"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {language === "bn"
                      ? "মার্চেন্ট এই লগইন তথ্য দিয়ে সরাসরি ড্যাশবোর্ডে প্রবেশ করতে পারবে।"
                      : "Merchant can directly log in using these credentials."}
                  </p>
                </div>

                {/* Credentials Details Box */}
                <div className="bg-[#f8f9fa] border border-[#e9ebec] rounded-xl p-4 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-sans">
                    <span className="text-slate-500 font-bold">{language === "bn" ? "স্টোরের নাম:" : "Store Name:"}</span>
                    <span className="font-bold text-slate-800">{addSuccessData.store.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-sans">
                    <span className="text-slate-500 font-bold">{language === "bn" ? "সাবডোমেন:" : "Subdomain:"}</span>
                    <span className="font-bold text-[#405189]">
                      {addSuccessData.store.subdomain}.gocommercebd.online
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-sans">
                    <span className="text-slate-500 font-bold">{language === "bn" ? "লগইন লিংক:" : "Login URL:"}</span>
                    <a
                      href={addSuccessData.store.loginUrl || "https://app.gocommercebd.online/login"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#0ab39c] hover:underline flex items-center gap-1"
                    >
                      <span>https://app.gocommercebd.online/login</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-sans">
                    <span className="text-slate-500 font-bold">{language === "bn" ? "লগইন ইমেইল:" : "Login Email:"}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {addSuccessData.credentials.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 font-sans">
                    <span className="text-slate-500 font-bold">{language === "bn" ? "পাসওয়ার্ড:" : "Password:"}</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {addSuccessData.credentials.password}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 font-sans">
                    <span className="text-slate-500 font-bold">{language === "bn" ? "প্ল্যান ও মেয়াদ:" : "Plan & Duration:"}</span>
                    <span className="font-bold text-slate-700">
                      {addSuccessData.store.plan} ({newDurationDays} {language === "bn" ? "দিন" : "days"} — {new Date(addSuccessData.store.endDate).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm ${
                      isCopied
                        ? "bg-emerald-600 text-white"
                        : "bg-[#405189] hover:bg-[#364574] text-white"
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopied ? (language === "bn" ? "কপি সম্পন্ন হয়েছে!" : "Copied to Clipboard!") : (language === "bn" ? "লগইন তথ্য কপি করুন" : "Copy Login Credentials")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setAddSuccessData(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    {language === "bn" ? "সম্পন্ন (Done)" : "Done"}
                  </button>
                </div>
              </div>
            ) : (
              /* Modal Form */
              <form onSubmit={handleCreatePaidMerchant} className="p-6 space-y-4 text-xs">
                {/* Store Name & Subdomain */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#495057] mb-1">
                      {language === "bn" ? "দোকানের নাম (Store Name)" : "Store Name"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dhaka Mart"
                      value={newStoreName}
                      onChange={(e) => handleNewStoreNameChange(e.target.value)}
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#495057] mb-1">
                      {language === "bn" ? "সাবডোমেন (Subdomain)" : "Subdomain"} <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="dhakamart"
                        value={newSubdomain}
                        onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-3 py-2 rounded-l-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all"
                      />
                      <span className="bg-slate-100 text-slate-500 px-2.5 py-2 rounded-r-lg border border-l-0 border-slate-200 text-[10px] font-bold">
                        .gocommercebd.online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Name & Login Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#495057] mb-1">
                      {language === "bn" ? "মালিকের নাম (Owner Name)" : "Owner Name"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahim Chowdhury"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#495057] mb-1">
                      {language === "bn" ? "লগইন ইমেইল (Merchant Email)" : "Merchant Login Email"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="merchant@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      {language === "bn" ? "মার্চেন্ট এই ইমেইল দিয়ে সরাসরি লগইন করতে পারবেন।" : "Merchant will use this email to log in directly."}
                    </p>
                  </div>
                </div>

                {/* Phone & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#495057] mb-1">
                      {language === "bn" ? "মোবাইল নম্বর (Phone)" : "Phone Number"}
                    </label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#495057]">
                        {language === "bn" ? "লগইন পাসওয়ার্ড (Password)" : "Login Password"} <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewPassword(generateRandomPassword())}
                        className="text-[10px] text-[#405189] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>{language === "bn" ? "অটো জেনারেট" : "Generate"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-mono font-bold px-3 py-2 pr-9 rounded-lg border border-slate-200 focus:border-[#405189] focus:bg-white focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Plan Tier Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1.5">
                    {language === "bn" ? "সাবস্ক্রিপশন প্ল্যান (Subscription Plan)" : "Subscription Plan Tier"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "starter", name: "Starter", price: "৳999/mo" },
                      { id: "growth", name: "Growth ★", price: "৳2,999/mo" },
                      { id: "pro", name: "Pro", price: "৳4,999/mo" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setNewPlan(p.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          newPlan === p.id
                            ? "bg-[#405189] text-white border-[#405189] shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-bold text-xs">{p.name}</div>
                        <div className={`text-[10px] ${newPlan === p.id ? "text-slate-200" : "text-slate-500"}`}>
                          {p.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Date & 30-Day Period Auto Count */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#495057] mb-1">
                        {language === "bn" ? "শুরুর তারিখ (Start Date)" : "Start Date"} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={newStartDate}
                        onChange={(e) => handleNewStartDateChange(e.target.value)}
                        className="w-full bg-white text-[#495057] text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#405189]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#495057] mb-1">
                        {language === "bn" ? "বিলিং সাইকেল" : "Billing Cycle"}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewInterval("monthly")}
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border cursor-pointer ${
                            newInterval === "monthly"
                              ? "bg-[#405189] text-white border-[#405189]"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          {language === "bn" ? "মাসিক" : "Monthly"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewInterval("yearly")}
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border cursor-pointer ${
                            newInterval === "yearly"
                              ? "bg-[#405189] text-white border-[#405189]"
                              : "bg-white text-slate-600 border-slate-200"
                          }`}
                        >
                          {language === "bn" ? "বার্ষিক" : "Yearly"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Duration Presets */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#495057] mb-1">
                      {language === "bn" ? "মেয়াদের দৈর্ঘ্য (Duration)" : "Subscription Duration"}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[15, 30, 60, 90].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleNewDurationChange(d)}
                          className={`py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                            newDurationDays === d
                              ? "bg-[#0ab39c] text-white border-[#0ab39c]"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {d} {language === "bn" ? "দিন" : "Days"}{d === 30 ? " ★" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calculated End Date Live Preview Box */}
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-900">
                    <span>
                      {language === "bn" ? "সমাপ্তির তারিখ (End Date):" : "Calculated End Date:"}
                    </span>
                    <span className="font-mono font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                      {newEndDate}
                    </span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0ab39c] hover:bg-[#089682] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNew ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmittingNew ? (language === "bn" ? "তৈরি হচ্ছে..." : "Creating...") : (language === "bn" ? "পেইড অ্যাকাউন্ট তৈরি করুন" : "Create Paid Account")}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
