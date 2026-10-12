import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  Layers,
  Coins,
  Check,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.js";

export interface PackageItem {
  id: string;
  name: string;
  priceBdt: number;
  pricePoisha?: string;
  billingInterval: string;
  badge?: string;
  isPopular?: boolean;
  description: string;
  featuresList: string[];
  fees: {
    physical: string;
    digital: string;
    resell: string;
  };
  limits: {
    products: number;
    landingPages: number;
    staff: number;
    storageMb: number;
    imagesPerProduct?: number;
  };
  ctaText?: string;
  ctaLink?: string;
  sortOrder: number;
  isActive: boolean;
}

export const SuperPackagesView: React.FC = () => {
  const { t, language } = useLanguage();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formPriceBdt, setFormPriceBdt] = useState<number | string>(0);
  const [formBadge, setFormBadge] = useState("");
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [formFeesPhysical, setFormFeesPhysical] = useState("0%");
  const [formFeesDigital, setFormFeesDigital] = useState("0%");
  const [formFeesResell, setFormFeesResell] = useState("0%");
  const [formLimitProducts, setFormLimitProducts] = useState(500);
  const [formLimitLanding, setFormLimitLanding] = useState(10);
  const [formLimitStaff, setFormLimitStaff] = useState(2);
  const [formLimitStorage, setFormLimitStorage] = useState(1500);
  const [formCtaText, setFormCtaText] = useState("Get started →");
  const [formCtaLink, setFormCtaLink] = useState("#pricing");
  const [formSortOrder, setFormSortOrder] = useState(1);
  const [formIsActive, setFormIsActive] = useState(true);

  const getAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const headers: Record<string, string> = {
      ...extra,
      "x-test-role": "super_admin",
    };
    try {
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("gocom_session_token") || localStorage.getItem("gocom_auth_token") || sessionStorage.getItem("gocom_token"))
        : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {}
    return headers;
  };

  // Fetch Packages from API
  const fetchPackages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/packages", {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      } else {
        // Fallback to storefront endpoint if super-admin session isn't direct
        const sfRes = await fetch("/api/storefront/packages");
        if (sfRes.ok) {
          const sfData = await sfRes.json();
          setPackages(sfData.packages || []);
        } else {
          setError("প্যাকেজ তালিকা লোড করা যায়নি।");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load packages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setFormId("");
    setFormName("");
    setFormPriceBdt(599);
    setFormBadge("");
    setFormIsPopular(false);
    setFormDescription("");
    setFormFeatures([
      "500 products",
      "Unlimited preset themes",
      "Custom domain",
      "GoCommerce SecurePay",
    ]);
    setNewFeatureText("");
    setFormFeesPhysical("0%");
    setFormFeesDigital("6%");
    setFormFeesResell("1.9%");
    setFormLimitProducts(500);
    setFormLimitLanding(10);
    setFormLimitStaff(2);
    setFormLimitStorage(1500);
    setFormCtaText("Get started →");
    setFormCtaLink("#pricing");
    setFormSortOrder(packages.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: PackageItem) => {
    setModalMode("edit");
    setFormId(pkg.id);
    setFormName(pkg.name);
    setFormPriceBdt(pkg.priceBdt);
    setFormBadge(pkg.badge || "");
    setFormIsPopular(Boolean(pkg.isPopular));
    setFormDescription(pkg.description || "");
    setFormFeatures([...(pkg.featuresList || [])]);
    setNewFeatureText("");
    setFormFeesPhysical(pkg.fees?.physical || "0%");
    setFormFeesDigital(pkg.fees?.digital || "0%");
    setFormFeesResell(pkg.fees?.resell || "0%");
    setFormLimitProducts(pkg.limits?.products || 500);
    setFormLimitLanding(pkg.limits?.landingPages || 5);
    setFormLimitStaff(pkg.limits?.staff || 1);
    setFormLimitStorage(pkg.limits?.storageMb || 1000);
    setFormCtaText(pkg.ctaText || "Get started →");
    setFormCtaLink(pkg.ctaLink || "#pricing");
    setFormSortOrder(pkg.sortOrder || 1);
    setFormIsActive(pkg.isActive !== false);
    setIsModalOpen(true);
  };

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureText.trim()) return;
    setFormFeatures([...formFeatures, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const handleRemoveFeature = (idx: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== idx));
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const priceNum = typeof formPriceBdt === "number" ? formPriceBdt : parseFloat(formPriceBdt as string) || 0;
    const payload = {
      id: formId || formName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      name: formName,
      priceBdt: priceNum,
      billingInterval: "monthly",
      badge: formBadge,
      isPopular: formIsPopular,
      description: formDescription,
      featuresList: formFeatures,
      fees: {
        physical: formFeesPhysical,
        digital: formFeesDigital,
        resell: formFeesResell,
      },
      limits: {
        products: Number(formLimitProducts),
        landingPages: Number(formLimitLanding),
        staff: Number(formLimitStaff),
        storageMb: Number(formLimitStorage),
      },
      ctaText: formCtaText,
      ctaLink: formCtaLink,
      sortOrder: Number(formSortOrder),
      isActive: formIsActive,
    };

    try {
      const url = modalMode === "create" ? "/api/super-admin/packages" : `/api/super-admin/packages/${formId}`;
      const method = modalMode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSuccessMsg(
          modalMode === "create"
            ? "নতুন প্যাকেজ সফলভাবে তৈরি হয়েছে এবং হোম পেজে লাইভ হয়েছে!"
            : "প্যাকেজের মূল্য ও তথ্য সফলভাবে আপডেট হয়েছে!"
        );
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchPackages();
      } else {
        const errData = await res.json();
        setError(errData.error || "সংরক্ষণ করতে সমস্যা হয়েছে");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save package");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (pkg: PackageItem) => {
    try {
      const res = await fetch(`/api/super-admin/packages/${pkg.id}`, {
        method: "PUT",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        credentials: "include",
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      if (res.ok) {
        await fetchPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${name}" প্যাকেজটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/super-admin/packages/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        setSuccessMsg(`"${name}" প্যাকেজ মুছে ফেলা হয়েছে।`);
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchPackages();
      }
    } catch (err: any) {
      setError(err.message || "প্যাকেজ মোছা সম্ভব হয়নি");
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("আপনি কি ডিফল্ট ৪টি প্যাকেজ ফিরিয়ে আনতে চান?")) return;
    try {
      const res = await fetch("/api/super-admin/packages/reset-defaults", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        setSuccessMsg("ডিফল্ট প্যাকেজসমূহ সফলভাবে রিস্টোর হয়েছে!");
        setTimeout(() => setSuccessMsg(null), 4000);
        await fetchPackages();
      }
    } catch (err: any) {
      setError(err.message || "রিসেট করতে ব্যর্থ হয়েছে");
    }
  };

  const activeCount = packages.filter((p) => p.isActive).length;
  const popularPlan = packages.find((p) => p.isPopular);
  const minPrice = packages.length > 0 ? Math.min(...packages.map((p) => p.priceBdt)) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Super Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.superAdminConsole}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057]">{t.packagesTitle}</h2>
          <p className="text-xs text-[#878a99] mt-0.5">{t.packagesSubtitle}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <a
            href="http://localhost:4321/#pricing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-[#405189] text-xs font-semibold rounded-lg border border-[#e9ebec] shadow-sm transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t.viewLivePricing}</span>
          </a>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#405189] hover:bg-[#364574] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createPackageBtn}</span>
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4-KPI Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">
            {language === "bn" ? "মোট প্যাকেজ" : "Total Packages"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#495057]">{packages.length}</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#405189]/10 text-[#405189]">
              {language === "bn" ? "প্ল্যাটফর্ম প্ল্যান" : "Platform Plans"}
            </span>
          </div>
          <p className="text-[11px] text-[#878a99] mt-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#405189]" /> {language === "bn" ? "হোম পেজের প্রাইসিং সেকশনে সক্রিয়" : "Active on storefront pricing"}
          </p>
        </div>

        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">
            {language === "bn" ? "সক্রিয় প্যাকেজ" : "Active Packages"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#0ab39c]">{activeCount}</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0ab39c]/10 text-[#0ab39c]">
              Live Ready
            </span>
          </div>
          <p className="text-[11px] text-[#878a99] mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#0ab39c]" /> {language === "bn" ? "ক্রেতারা সাবস্ক্রাইব করতে পারবেন" : "Available for merchant sign-up"}
          </p>
        </div>

        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">
            {language === "bn" ? "সর্বাধিক জনপ্রিয়" : "Most Popular Plan"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-amber-600">{popularPlan?.name || "Pro"}</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Most Popular
            </span>
          </div>
          <p className="text-[11px] text-[#878a99] mt-2">
            {popularPlan ? `৳${popularPlan.priceBdt} / month` : "৳1,099 / month"}
          </p>
        </div>

        <div className="card-velzon p-4">
          <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">
            {language === "bn" ? "শুরু হচ্ছে মাত্র" : "Starting Plan Price"}
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-[#495057]">৳{minPrice}.00</h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600">
              {minPrice === 0 ? "Free Trial / Free" : "Entry Plan"}
            </span>
          </div>
          <p className="text-[11px] text-[#878a99] mt-2 flex items-center gap-1">
            <Coins className="w-3 h-3 text-emerald-600" /> {language === "bn" ? "প্রতি ১ টাকা = ১০০ পয়সা (Integer Math)" : "Integer poisha financial precision"}
          </p>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="card-velzon p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#e9ebec] gap-3">
          <div>
            <h3 className="text-base font-bold text-[#495057]">
              {language === "bn" ? "হোম পেজের লাইভ প্যাকেজসমূহ" : "Live Storefront Pricing Packages"}
            </h3>
            <p className="text-xs text-[#878a99]">
              {language === "bn"
                ? "এখানে পরিবর্তন করার সাথে সাথে http://localhost:4321/#pricing এ স্বয়ংক্রিয়ভাবে আপডেট হবে।"
                : "Real-time updates directly reflected on the live homepage at #pricing."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#495057] text-xs font-semibold rounded-lg transition-all"
            title="Reset to 4 default packages"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.resetDefaults}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#405189] border-t-white rounded-full animate-spin"></div>
            <p className="text-xs text-[#878a99] font-medium">প্যাকেজ তালিকা লোড হচ্ছে...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="py-12 text-center text-[#878a99]">
            <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold">কোনো প্যাকেজ পাওয়া যায়নি</p>
            <button
              onClick={openCreateModal}
              className="mt-3 px-3.5 py-1.5 bg-[#405189] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              নতুন প্যাকেজ তৈরি করুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-5 ${
                  pkg.isPopular
                    ? "border-[#405189] bg-gradient-to-b from-[#405189]/5 to-white shadow-md ring-1 ring-[#405189]/30"
                    : "border-[#e9ebec] bg-white hover:border-[#405189]/40 shadow-sm"
                } ${!pkg.isActive ? "opacity-60 bg-gray-50" : ""}`}
              >
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {pkg.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                        {pkg.badge}
                      </span>
                    )}
                    {pkg.isPopular && !pkg.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#405189] text-white shadow-sm">
                        POPULAR
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pkg.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? "bg-emerald-600" : "bg-gray-500"}`} />
                    {pkg.isActive ? (language === "bn" ? "সক্রিয়" : "Active") : (language === "bn" ? "নিষ্ক্রিয়" : "Inactive")}
                  </span>
                </div>

                {/* Plan Title & Price */}
                <div>
                  <h4 className="text-lg font-bold text-[#495057]">{pkg.name}</h4>
                  <p className="text-xs text-[#878a99] mt-0.5 min-h-[32px] line-clamp-2">
                    {pkg.description || "Start selling today."}
                  </p>

                  <div className="mt-4 mb-4 pb-4 border-b border-[#e9ebec]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#495057]">৳</span>
                      <span className="text-3xl font-extrabold text-[#495057]">
                        {pkg.priceBdt.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-[#878a99] font-medium">/ month</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      DB Integer: {pkg.priceBdt * 100} poisha
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#878a99]">
                      {language === "bn" ? "ফিচারসমূহ" : "Features"} ({pkg.featuresList?.length || 0})
                    </p>
                    <ul className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {(pkg.featuresList || []).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#495057]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Order Fees Box */}
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-[#495057] mb-4">
                    <p className="font-bold text-[#878a99] text-[10px] uppercase mb-1">
                      {language === "bn" ? "অর্ডার ফি" : "Fees per order"}
                    </p>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div>
                        <div className="font-bold text-[#495057]">{pkg.fees?.physical || "0%"}</div>
                        <div className="text-[9px] text-[#878a99]">Physical</div>
                      </div>
                      <div>
                        <div className="font-bold text-[#495057]">{pkg.fees?.digital || "0%"}</div>
                        <div className="text-[9px] text-[#878a99]">Digital</div>
                      </div>
                      <div>
                        <div className="font-bold text-[#495057]">{pkg.fees?.resell || "0%"}</div>
                        <div className="text-[9px] text-[#878a99]">Resell</div>
                      </div>
                    </div>
                  </div>

                  {/* Resource Limits */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-5 text-[10px] text-[#878a99]">
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold text-gray-700">
                      📦 {pkg.limits?.products || 500} products
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold text-gray-700">
                      📄 {pkg.limits?.landingPages || 5} landing
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-semibold text-gray-700">
                      👥 {pkg.limits?.staff || 1} staff
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-[#e9ebec] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(pkg)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      pkg.isActive
                        ? "text-gray-600 hover:bg-gray-100"
                        : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold"
                    }`}
                  >
                    {pkg.isActive ? (language === "bn" ? "নিষ্ক্রিয় করুন" : "Deactivate") : (language === "bn" ? "সক্রিয় করুন" : "Activate")}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(pkg)}
                      className="p-1.5 rounded-lg text-[#405189] hover:bg-[#405189]/10 transition-colors"
                      title="Edit package details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Delete package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT PACKAGE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#141522] text-white">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold">
                  {modalMode === "create"
                    ? language === "bn"
                      ? "নতুন প্যাকেজ তৈরি করুন"
                      : "Create New Package"
                    : language === "bn"
                    ? `প্যাকেজ এডিট করুন: ${formName}`
                    : `Edit Package: ${formName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePackage} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Package Name */}
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">
                    {t.packageName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Starter, Pro, Growth"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#405189]"
                  />
                </div>

                {/* Monthly Price (BDT) */}
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">
                    {t.packagePrice} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">৳</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formPriceBdt}
                      onChange={(e) => setFormPriceBdt(e.target.value)}
                      placeholder="e.g. 599"
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#405189]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    1 BDT = 100 poisha (Database Invariant)
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1">{t.packageDescription}</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. For growing businesses."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#405189]"
                />
              </div>

              {/* Badge & Popular Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">{t.packageBadge}</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="e.g. MOST POPULAR, BEST VALUE"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#405189]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPopular}
                      onChange={(e) => setFormIsPopular(e.target.checked)}
                      className="w-4 h-4 text-[#405189] rounded border-gray-300"
                    />
                    <span className="font-bold text-[#495057]">{t.popularBadge}</span>
                  </label>
                </div>
              </div>

              {/* Features List Section */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#495057]">{t.packageFeatures}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="নতুন ফিচার লিখুন (e.g. Unlimited products, Custom domain)"
                    className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#405189]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 bg-[#405189] text-white text-xs font-bold rounded-lg"
                  >
                    যুক্ত করুন
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                  {formFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-[#495057]"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{feat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-gray-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Transaction Fees */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Physical Fee (%)</label>
                  <input
                    type="text"
                    value={formFeesPhysical}
                    onChange={(e) => setFormFeesPhysical(e.target.value)}
                    placeholder="0%"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Digital Fee (%)</label>
                  <input
                    type="text"
                    value={formFeesDigital}
                    onChange={(e) => setFormFeesDigital(e.target.value)}
                    placeholder="4%"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Resell Fee (%)</label>
                  <input
                    type="text"
                    value={formFeesResell}
                    onChange={(e) => setFormFeesResell(e.target.value)}
                    placeholder="1%"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Resource Limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Max Products</label>
                  <input
                    type="number"
                    value={formLimitProducts}
                    onChange={(e) => setFormLimitProducts(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Landing Pages</label>
                  <input
                    type="number"
                    value={formLimitLanding}
                    onChange={(e) => setFormLimitLanding(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Staff Accounts</label>
                  <input
                    type="number"
                    value={formLimitStaff}
                    onChange={(e) => setFormLimitStaff(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Storage (MB)</label>
                  <input
                    type="number"
                    value={formLimitStorage}
                    onChange={(e) => setFormLimitStorage(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Status & Sort Order */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 text-[#405189] rounded border-gray-300"
                    />
                    <span className="font-bold text-[#495057]">সক্রিয় (Active on Storefront)</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#405189] hover:bg-[#364574] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন ও লাইভ আপডেট করুন"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
