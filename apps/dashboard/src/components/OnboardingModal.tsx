import React, { useState } from "react";
import {
  Store,
  Lock,
  Phone,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Smartphone,
  Shirt,
  Sparkle,
  Leaf,
  Home,
  PackageCheck,
  Check,
} from "lucide-react";

interface OnboardingModalProps {
  currentUser: any;
  currentStore?: any;
  onComplete: (updatedUser: any, updatedStore: any) => void;
  onLogout?: () => void;
}

interface NicheOption {
  id: string;
  nameBn: string;
  nameEn: string;
  icon: React.ReactNode;
  popular?: boolean;
}

const NICHES: NicheOption[] = [
  {
    id: "fashion",
    nameBn: "পোশাক ও ফ্যাশন",
    nameEn: "Fashion & Apparel",
    icon: <Shirt className="w-5 h-5" />,
    popular: true,
  },
  {
    id: "gadgets",
    nameBn: "ইলেকট্রনিক্স ও গ্যাজেট",
    nameEn: "Gadgets & Tech",
    icon: <Smartphone className="w-5 h-5" />,
    popular: true,
  },
  {
    id: "beauty",
    nameBn: "বিউটি ও রূপচর্চা",
    nameEn: "Beauty & Cosmetics",
    icon: <Sparkle className="w-5 h-5" />,
  },
  {
    id: "organic",
    nameBn: "অর্গানিক ও গ্রোসারি",
    nameEn: "Organic & Grocery",
    icon: <Leaf className="w-5 h-5" />,
  },
  {
    id: "home",
    nameBn: "হোম ডেকর ও লাইফস্টাইল",
    nameEn: "Home Decor & Living",
    icon: <Home className="w-5 h-5" />,
  },
  {
    id: "dropship",
    nameBn: "ড্রপশিপিং ও অন্যান্য",
    nameEn: "General / Dropshipping",
    icon: <ShoppingBag className="w-5 h-5" />,
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  currentUser,
  currentStore,
  onComplete,
  onLogout,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Store & Niche
  const [storeName, setStoreName] = useState(
    currentStore?.name && !currentStore.name.includes("'s Store") && currentStore.name !== "Google Trial Store"
      ? currentStore.name
      : ""
  );
  const [subdomain, setSubdomain] = useState(
    currentStore?.subdomain && !currentStore.subdomain.startsWith("trial-") && currentStore.subdomain !== "myshop"
      ? currentStore.subdomain
      : ""
  );
  const [isSubdomainManual, setIsSubdomainManual] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [selectedNiche, setSelectedNiche] = useState<string>("fashion");
  const [customNiche, setCustomNiche] = useState("");

  // Step 2: Phone Number
  const [phone, setPhone] = useState(
    currentStore?.phone && currentStore.phone !== "+8801700000000"
      ? currentStore.phone.replace("+88", "")
      : ""
  );

  // Step 3: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Submission States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Helper to normalize bangla digits in phone
  const normalizeBanglaDigits = (str: string) => {
    const banglaToAscii: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    };
    return str.replace(/[০-৯]/g, (w) => banglaToAscii[w] || w);
  };

  // Auto-slugify when store name changes
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    setErrorMessage(null);
    if (!isSubdomainManual) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (generated) {
        setSubdomain(generated);
        checkSubdomainAvailability(generated);
      }
    }
  };

  const checkSubdomainAvailability = async (sub: string) => {
    if (sub.length < 3) {
      setSubdomainStatus("idle");
      return;
    }
    setSubdomainStatus("checking");
    try {
      const res = await fetch(`/api/auth/check-subdomain?subdomain=${encodeURIComponent(sub)}`);
      const data = await res.json();
      setSubdomainStatus(data.available ? "available" : "taken");
    } catch {
      setSubdomainStatus("idle");
    }
  };

  // Step 1 Validation
  const canGoToStep2 = () => {
    if (!storeName.trim() || storeName.trim().length < 2) return false;
    if (!subdomain.trim() || subdomain.trim().length < 3) return false;
    if (subdomainStatus === "taken") return false;
    return true;
  };

  // Step 2 Validation (Bangladeshi 11-digit phone)
  const canGoToStep3 = () => {
    const cleanPhone = normalizeBanglaDigits(phone.trim().replace(/^(\+88|88)/, ""));
    const bdRegex = /^(01[3-9]\d{8})$/;
    return bdRegex.test(cleanPhone);
  };

  // Step 3 Validation
  const canSubmit = () => {
    if (password.length < 8) return false;
    if (confirmPassword && password !== confirmPassword) return false;
    return true;
  };

  // Submission to complete onboarding
  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const normalizedPhone = normalizeBanglaDigits(phone.trim().replace(/^(\+88|88)/, ""));
      const finalNiche = selectedNiche === "dropship" && customNiche.trim() ? customNiche.trim() : selectedNiche;

      const activeToken =
        typeof window !== "undefined"
          ? localStorage.getItem("gocom_session_token") ||
            localStorage.getItem("gocom_auth_token") ||
            sessionStorage.getItem("gocom_token")
          : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      const res = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          storeName: storeName.trim(),
          subdomain: subdomain.trim().toLowerCase(),
          niche: finalNiche,
          phone: normalizedPhone,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "অনবোর্ডিং তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
      }

      setIsSuccess(true);
      setTimeout(() => {
        onComplete(data.user, data.store);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/35 backdrop-blur-[3px] overflow-y-auto select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[580px] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] border border-slate-200/80 overflow-hidden relative animate-fadeIn my-auto">
        {/* Header Banner - Clean SaaS Light Design matching homepage */}
        <div className="bg-gradient-to-b from-blue-50/70 via-white to-white p-5 sm:p-7 pb-4 border-b border-slate-100 relative">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#155dfc] to-[#3b82f6] text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-slate-900 block leading-tight">
                  GoCommerce BD
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block tracking-wide">
                  অনবোর্ডিং উইজার্ড
                </span>
              </div>
            </div>

            {/* 15 Days Free Trial Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#155dfc] text-xs font-bold rounded-full border border-blue-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>১৫ দিনের ফ্রি ট্রায়াল</span>
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            স্বাগতম, {currentUser?.name || "মার্চেন্ট"}! আপনার স্টোর সেটআপ করুন
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ড্যাশবোর্ড আনলক করতে নিচের ৩টি সহজ ধাপ পূরণ করুন। এক ক্লিকেই আপনার অনলাইন ব্যবসা প্রস্তুত হবে।
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between relative">
            {/* Step 1 */}
            <div className="flex items-center gap-2 z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > 1
                    ? "bg-emerald-500 text-white shadow-sm"
                    : step === 1
                    ? "bg-[#155dfc] text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/20"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {step > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "১"}
              </div>
              <span
                className={`text-xs font-bold hidden sm:inline ${
                  step === 1 ? "text-[#155dfc]" : step > 1 ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                স্টোর ও নিশ
              </span>
            </div>

            {/* Connector 1-2 */}
            <div className="flex-1 h-0.5 mx-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  step >= 2 ? "w-full bg-emerald-500" : "w-0"
                }`}
              ></div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2 z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > 2
                    ? "bg-emerald-500 text-white shadow-sm"
                    : step === 2
                    ? "bg-[#155dfc] text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/20"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {step > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "২"}
              </div>
              <span
                className={`text-xs font-bold hidden sm:inline ${
                  step === 2 ? "text-[#155dfc]" : step > 2 ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                মোবাইল নম্বর
              </span>
            </div>

            {/* Connector 2-3 */}
            <div className="flex-1 h-0.5 mx-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  step >= 3 ? "w-full bg-emerald-500" : "w-0"
                }`}
              ></div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isSuccess
                    ? "bg-emerald-500 text-white shadow-sm"
                    : step === 3
                    ? "bg-[#155dfc] text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/20"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {isSuccess ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "৩"}
              </div>
              <span
                className={`text-xs font-bold hidden sm:inline ${
                  step === 3 ? "text-[#155dfc]" : "text-slate-400"
                }`}
              >
                পাসওয়ার্ড সেট
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="py-8 text-center animate-fadeIn space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">অভিনন্দন! আপনার দোকান প্রস্তুত</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  আপনার ১৫ দিনের ফ্রি ট্রায়াল শুরু হয়েছে। সম্পূর্ণ ড্যাশবোর্ড এখনই আনলক করা হচ্ছে...
                </p>
              </div>
              <div className="w-8 h-8 border-3 border-[#155dfc] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <form onSubmit={step === 3 ? handleCompleteOnboarding : (e) => e.preventDefault()}>
              {/* STEP 1: STORE NAME & NICHE */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Store Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      দোকানের নাম (Store Name) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        required
                        value={storeName}
                        onChange={(e) => handleStoreNameChange(e.target.value)}
                        placeholder="যেমন: স্মার্ট গ্যাজেট বিডি বা ফ্যাশন হাউস"
                        className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm font-semibold pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#155dfc] focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder-slate-400"
                      />
                      <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  {/* DOMAIN PREVIEW (LIVE URL PREVIEW REQUIRED BY USER) */}
                  <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 border border-blue-200/80 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#155dfc]" />
                        আপনার অনলাইন স্টোরের ওয়েব ঠিকানা
                      </span>
                      {subdomainStatus === "checking" && (
                        <span className="text-[11px] text-slate-400 font-medium">যাচাই হচ্ছে...</span>
                      )}
                      {subdomainStatus === "available" && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" /> খালি আছে
                        </span>
                      )}
                      {subdomainStatus === "taken" && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-xs">
                          <AlertCircle className="w-3 h-3" /> ইতিমধ্যে ব্যবহৃত
                        </span>
                      )}
                    </div>

                    {/* Exact highlighted string required by user */}
                    <div className="bg-white px-3.5 py-2.5 rounded-xl border border-blue-200 shadow-xs flex items-center justify-between gap-2 overflow-hidden">
                      <p className="text-xs sm:text-sm text-slate-700 font-medium truncate">
                        your domain will be -{" "}
                        <span className="font-extrabold text-[#155dfc]">
                          gocommercebd.online/{subdomain || "the-name-you-typed"}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSubdomainManual(!isSubdomainManual)}
                        className="text-xs font-bold text-[#155dfc] hover:text-[#0b48c9] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        {isSubdomainManual ? "অটো-জেনারেট" : "এডিট করুন"}
                      </button>
                    </div>

                    {isSubdomainManual && (
                      <div className="mt-2.5 flex items-center rounded-xl border border-blue-300 bg-white overflow-hidden text-xs shadow-xs">
                        <span className="px-3 py-2 bg-slate-50 text-slate-500 font-bold border-r border-slate-200 select-none text-[11px]">
                          gocommercebd.online/
                        </span>
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                            setSubdomain(val);
                            checkSubdomainAvailability(val);
                          }}
                          placeholder="store-slug"
                          className="flex-1 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Niche Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      দোকানের ক্যাটাগরি বা নিশ (Store Niche) <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {NICHES.map((n) => {
                        const isSelected = selectedNiche === n.id;
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => setSelectedNiche(n.id)}
                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-[86px] cursor-pointer ${
                              isSelected
                                ? "bg-blue-50/80 border-2 border-[#155dfc] shadow-sm text-[#155dfc] ring-4 ring-blue-500/10"
                                : "bg-slate-50/60 hover:bg-slate-100/70 border-slate-200/80 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`p-1.5 rounded-xl transition-colors ${
                                  isSelected
                                    ? "bg-[#155dfc] text-white shadow-sm shadow-blue-500/25"
                                    : "bg-white text-slate-600 shadow-xs"
                                }`}
                              >
                                {n.icon}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-[#155dfc] stroke-[3]" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold truncate leading-tight">{n.nameBn}</p>
                              <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{n.nameEn}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedNiche === "dropship" && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          value={customNiche}
                          onChange={(e) => setCustomNiche(e.target.value)}
                          placeholder="আপনার সুনির্দিষ্ট নিশ লিখুন (যেমন: হ্যান্ডিক্রাফটস, বই ইত্যাদি)"
                          className="w-full bg-slate-50 text-slate-800 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#155dfc] focus:ring-4 focus:ring-blue-50 focus:bg-white focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Step 1 Actions */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!canGoToStep2()}
                      onClick={() => setStep(2)}
                      className="w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 bg-[#155dfc] hover:bg-[#0b48c9] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>পরবর্তী ধাপ (মোবাইল নম্বর)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PHONE NUMBER */}
              {step === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-3 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#155dfc] flex items-center justify-center shrink-0 shadow-xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-blue-950 mb-0.5">
                        আপনার দোকানের যোগাযোগের মোবাইল নম্বর
                      </p>
                      <p className="text-[11px] text-blue-900/80 leading-relaxed">
                        কুরিয়ার পার্সেল ট্র্যাকিং (Steadfast/Pathao), কাস্টমার অর্ডার এসএমএস এবং জরুরি অ্যালার্টের জন্য আপনার সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      মোবাইল নম্বর (১১ ডিজিট) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="px-3.5 py-3 bg-slate-100 border border-slate-200 border-r-0 rounded-l-xl flex items-center gap-1.5 text-xs font-bold text-slate-700 select-none">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>+88</span>
                      </div>
                      <input
                        type="tel"
                        autoFocus
                        required
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setErrorMessage(null);
                        }}
                        placeholder="017XXXXXXXX বা 01XXXXXXXXX"
                        className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm font-bold px-3.5 py-3 rounded-r-xl border border-slate-200 focus:border-[#155dfc] focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder-slate-400"
                      />
                      {canGoToStep3() && (
                        <div className="absolute right-3 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" /> সঠিক
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                      বাংলা বা ইংরেজি যেকোনো সংখ্যায় লিখুন (যেমন: ০১৭১১২২৩৩৪৪ বা 01711223344)
                    </p>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>পূর্ববর্তী</span>
                    </button>
                    <button
                      type="button"
                      disabled={!canGoToStep3()}
                      onClick={() => setStep(3)}
                      className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 bg-[#155dfc] hover:bg-[#0b48c9] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>পরবর্তী ধাপ (পাসওয়ার্ড সেট)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SET PASSWORD */}
              {step === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 border border-blue-200/80 rounded-2xl flex items-start gap-3 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#155dfc] flex items-center justify-center shrink-0 shadow-xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-blue-950 mb-0.5">
                        একটি নিরাপদ পাসওয়ার্ড সেট করুন
                      </p>
                      <p className="text-[11px] text-blue-900/80 leading-relaxed">
                        গুগল সাইন-ইনের পাশাপাশি আপনি যেকোনো ডিভাইসে সরাসরি আপনার ইমেইল (
                        <span className="font-bold text-blue-950 underline">{currentUser?.email}</span>
                        ) ও এই পাসওয়ার্ড ব্যবহার করে লগইন করতে পারবেন।
                      </p>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      পাসওয়ার্ড (Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoFocus
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="কমপক্ষে ৮ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন"
                        className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm font-semibold pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-[#155dfc] focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder-slate-400"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {password.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              password.length < 8
                                ? "w-1/3 bg-rose-500"
                                : password.length < 12
                                ? "w-2/3 bg-amber-500"
                                : "w-full bg-emerald-500"
                            }`}
                          ></div>
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            password.length < 8
                              ? "text-rose-500"
                              : password.length < 12
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {password.length < 8 ? "কমপক্ষে ৮ অক্ষর" : password.length < 12 ? "মাঝারি" : "শক্তিশালী"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      পুনরায় পাসওয়ার্ড লিখুন (Confirm Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="একই পাসওয়ার্ড পুনরায় লিখুন"
                        className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm font-semibold pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-[#155dfc] focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder-slate-400"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <p className="text-[11px] text-rose-500 font-bold mt-1.5">পাসওয়ার্ড দুটি মিলছে না</p>
                    )}
                  </div>

                  {/* Step 3 Actions */}
                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => setStep(2)}
                      className="py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>পূর্ববর্তী</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !canSubmit()}
                      className="flex-1 py-3 px-5 rounded-xl text-xs sm:text-sm font-black text-white shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 bg-[#155dfc] hover:bg-[#0b48c9] hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>দোকান চালু হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                          <span>সেটআপ সম্পন্ন করুন ও ড্যাশবোর্ডে প্রবেশ করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Footer note & Logout Option */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>© 2026 GoCommerce BD • 15 Days Free Trial</span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-rose-500 hover:text-rose-600 font-bold hover:underline cursor-pointer"
              >
                লগআউট করুন
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
