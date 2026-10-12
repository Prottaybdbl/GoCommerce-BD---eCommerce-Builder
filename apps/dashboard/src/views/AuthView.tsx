import React, { useState } from "react";
import { Store, Lock, Mail, User, Phone, Globe, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

interface AuthViewProps {
  onAuthSuccess: (userData: any, storeData: any, needsOnboarding?: boolean) => void;
  initialMode?: "login" | "signup";
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, initialMode = "login" }) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleDevPrompt, setShowGoogleDevPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        setErrorMessage(decodeURIComponent(urlError));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [phone, setPhone] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Helper to normalize bangla digits in phone
  const normalizeBanglaDigits = (str: string) => {
    const banglaToAscii: Record<string, string> = {
      "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
      "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
    };
    return str.replace(/[০-৯]/g, (w) => banglaToAscii[w] || w);
  };

  // Auto-slugify subdomain
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    if (!subdomain || mode === "signup") {
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


  // Google OAuth Login Handler
  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          callbackURL: window.location.origin,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      if (res.status === 503 || !data?.configured) {
        setShowGoogleDevPrompt(true);
        setErrorMessage(
          data?.detail || "গুগল লগইন সক্রিয় করার জন্য সার্ভারে GOOGLE_CLIENT_ID ও GOOGLE_CLIENT_SECRET কনফিগার করতে হবে।"
        );
      } else {
        throw new Error(data?.detail || data?.error || "গুগল অথেনটিকেশন শুরু করা যায়নি।");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "গুগল লগইনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Development / Demo Google Sign-In Handler
  const handleGoogleDemoLogin = async (freshTrial: boolean = true) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      const res = await fetch("/api/auth/google/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ freshTrial }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || "ডেমো গুগল লগইন সম্পন্ন করা যায়নি।");
      }

      setSuccessMessage(
        freshTrial
          ? "গুগল ট্রায়াল অ্যাকাউন্ট দিয়ে সাইন-আপ হয়েছে! স্টোর অনবোর্ডিং শুরু হচ্ছে..."
          : "গুগল অ্যাকাউন্ট দিয়ে সফলভাবে লগইন হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে..."
      );
      if (data.token) {
        localStorage.setItem("gocom_session_token", data.token);
        localStorage.setItem("gocom_auth_token", data.token);
        sessionStorage.setItem("gocom_token", data.token);
      }
      setTimeout(() => {
        onAuthSuccess(data.user, data.store, Boolean(data.needsOnboarding));
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || "একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.error || "লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে সঠিক তথ্য প্রদান করুন।");
        }

        setSuccessMessage("লগইন সফল হয়েছে! ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...");
        if (data.token) {
          localStorage.setItem("gocom_session_token", data.token);
          localStorage.setItem("gocom_auth_token", data.token);
          sessionStorage.setItem("gocom_token", data.token);
        }
        setTimeout(() => {
          onAuthSuccess(data.user, data.store, Boolean(data.needsOnboarding));
        }, 600);
      } else {
        // Sign Up with Store Creation ("Create Online Store")
        const normalizedPhone = normalizeBanglaDigits(phone.trim());
        const res = await fetch("/api/auth/register-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            storeName: storeName.trim(),
            subdomain: subdomain.trim().toLowerCase(),
            phone: normalizedPhone,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.error || "রেজিস্ট্রেশন সম্পন্ন করা সম্ভব হয়নি। আবার চেষ্টা করুন।");
        }

        setSuccessMessage("আপনার দোকান ও অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...");
        if (data.token) {
          localStorage.setItem("gocom_session_token", data.token);
          localStorage.setItem("gocom_auth_token", data.token);
          sessionStorage.setItem("gocom_token", data.token);
        }
        setTimeout(() => {
          onAuthSuccess(data.user, data.store, false); // Explicitly false: skip onboarding
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#141522] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Top Left: Back to Home Page link */}
      <div className="absolute top-5 left-5 sm:top-7 sm:left-8 z-20">
        <a
          href={
            typeof window !== "undefined" &&
            (window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1")
              ? "http://localhost:4321/"
              : typeof window !== "undefined" &&
                window.location.hostname.startsWith("app.")
              ? `https://${window.location.hostname.replace(/^app\./, "")}/`
              : "/"
          }
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-gray-200 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all duration-200 shadow-sm group hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home Page</span>
        </a>
      </div>

      {/* Background Aesthetic Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#405189]/25 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#155dfc]/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Card Container */}
      <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-2xl border border-white/10 relative z-10 overflow-hidden">
        {/* Top Header & Branding */}
        <div className="bg-[#141522] px-8 pt-8 pb-6 text-center border-b border-white/10">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-dark.png"
              alt="GoCommerce BD"
              className="h-10 w-auto object-contain"
            />
          </div>
          <p className="text-xs text-gray-300 font-medium">
            {mode === "login"
              ? "আপনার অনলাইন স্টোর ও অর্ডার ম্যানেজমেন্টে প্রবেশ করুন"
              : "মাত্র ১ মিনিটে আপনার নিজস্ব অনলাইন স্টোর চালু করুন"}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {/* Status Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SIGNUP EXTRA FIELDS */}
            {mode === "signup" && (
              <>
                {/* Store Name */}
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">
                    দোকানের নাম <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => handleStoreNameChange(e.target.value)}
                      placeholder="যেমন: স্মার্ট গ্যাজেট বিডি"
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-medium pl-10 pr-4 py-2.5 rounded-lg border border-transparent focus:border-[#405189]/50 focus:bg-white focus:outline-none transition-all"
                    />
                    <Store className="w-4 h-4 text-[#878a99] absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Store Website Domain / URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#495057]">
                      ওয়েবসাইট ডোমেন / অ্যাড্রেস <span className="text-rose-500">*</span>
                    </label>
                    {subdomainStatus === "checking" && (
                      <span className="text-[10px] text-gray-400">যাচাই হচ্ছে...</span>
                    )}
                    {subdomainStatus === "available" && (
                      <span className="text-[10px] font-bold text-[#0ab39c] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> খালি আছে
                      </span>
                    )}
                    {subdomainStatus === "taken" && (
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> ইতিমধ্যে ব্যবহৃত
                      </span>
                    )}
                  </div>
                  <div className="flex items-center rounded-lg border border-transparent focus-within:border-[#405189]/50 focus-within:bg-white bg-[#f3f3f9] overflow-hidden transition-all">
                    <div className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100/90 border-r border-slate-200 text-xs font-bold text-[#405189] select-none shrink-0">
                      <Globe className="w-3.5 h-3.5 text-[#878a99]" />
                      <span>gocommercebd.online/</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={subdomain}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                        setSubdomain(val);
                        checkSubdomainAvailability(val);
                      }}
                      placeholder="axiswear"
                      className="flex-1 min-w-0 bg-transparent text-[#495057] text-xs font-medium px-3 py-2.5 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#878a99] mt-1 font-medium">
                    আপনার দোকানের লিংক হবে: <span className="text-[#405189] font-bold">gocommercebd.online/{subdomain || "yourstore"}</span>
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">
                    আপনার পূর্ণ নাম <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="যেমন: তানভীর আহমেদ"
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-medium pl-10 pr-4 py-2.5 rounded-lg border border-transparent focus:border-[#405189]/50 focus:bg-white focus:outline-none transition-all"
                    />
                    <User className="w-4 h-4 text-[#878a99] absolute left-3.5 top-3" />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#495057] mb-1">
                    মোবাইল নম্বর (১১ ডিজিট) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-medium pl-16 pr-4 py-2.5 rounded-lg border border-transparent focus:border-[#405189]/50 focus:bg-white focus:outline-none transition-all"
                    />
                    <div className="absolute left-3 flex items-center gap-1 text-[11px] font-bold text-[#878a99]">
                      <Phone className="w-3.5 h-3.5" />
                      <span>+88</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email / Username Address */}
            <div>
              <label className="block text-xs font-bold text-[#495057] mb-1">
                {mode === "login" ? "ইমেইল বা ইউজারনেম" : "ইমেইল অ্যাড্রেস"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={mode === "login" ? "text" : "email"}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === "login" ? "your@email.com বা admin বা axiswear" : "name@example.com"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-medium pl-10 pr-4 py-2.5 rounded-lg border border-transparent focus:border-[#405189]/50 focus:bg-white focus:outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-[#878a99] absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#495057]">
                  পাসওয়ার্ড <span className="text-rose-500">*</span>
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessMessage("পাসওয়ার্ড রিসেটের জন্য অনুগ্রহ করে প্ল্যাটফর্ম এডমিন সাপোর্টে যোগাযোগ করুন: support@gocommerce.bd");
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-[#405189] hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "signup" ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "অন্তত ৮ অক্ষরের পাসওয়ার্ড" : "আপনার পাসওয়ার্ড"}
                  className="w-full bg-[#f3f3f9] text-[#495057] text-xs font-medium pl-10 pr-10 py-2.5 rounded-lg border border-transparent focus:border-[#405189]/50 focus:bg-white focus:outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-[#878a99] absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#878a99] hover:text-[#495057]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "signup" && password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex-1 h-1 bg-[#e9ebec] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        password.length < 8
                          ? "w-1/3 bg-rose-500"
                          : password.length < 12
                          ? "w-2/3 bg-amber-500"
                          : "w-full bg-emerald-500"
                      }`}
                    ></div>
                  </div>
                  <span className="text-[10px] text-[#878a99]">
                    {password.length < 8 ? "কমপক্ষে ৮ অক্ষর" : password.length < 12 ? "মাঝারি" : "শক্তিশালী"}
                  </span>
                </div>
              )}
            </div>

            {/* Remember Me / Terms Checkbox */}
            {mode === "login" ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  defaultChecked
                  className="rounded text-[#405189] focus:ring-[#405189] w-3.5 h-3.5"
                />
                <label htmlFor="remember" className="text-xs text-[#878a99] cursor-pointer">
                  আমাকে মনে রাখুন (৩০ দিন সক্রিয়)
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  defaultChecked
                  className="rounded text-[#405189] focus:ring-[#405189] w-3.5 h-3.5 mt-0.5"
                />
                <label htmlFor="terms" className="text-[11px] text-[#878a99] leading-tight cursor-pointer">
                  GoCommerce BD-এর ব্যবহারের শর্তাবলী এবং গোপনীয়তা নীতি মেনে নিচ্ছি।
                </label>
              </div>
            )}

            {/* Submit Button - Same Unified Theme */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || (mode === "signup" && subdomainStatus === "taken")}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 bg-[#405189] hover:bg-[#364473] shadow-[#405189]/25 ${
                  isLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    প্রসেসিং হচ্ছে...
                  </span>
                ) : (
                  <>
                    <span>{mode === "login" ? "লগইন করুন" : "দোকান চালু করুন — সম্পূর্ণ ফ্রি"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Social Sign-In Option for Login Mode */}
          {mode === "login" && (
            <div className="mt-5">
              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e9ebec]"></div>
                </div>
                <div className="relative px-3 bg-white text-[11px] font-semibold text-[#878a99]">
                  অথবা Google দিয়ে
                </div>
              </div>

              <button
                type="button"
                id="google-login-button"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#3c4043] bg-white border border-[#dadce0] hover:bg-[#f8f9fa] hover:border-[#c6c8cc] active:bg-[#f1f3f4] shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-[#405189]/20"
              >
                {isGoogleLoading ? (
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>
                  {isGoogleLoading ? "কানেক্ট করা হচ্ছে..." : "Google দিয়ে লগইন করুন"}
                </span>
              </button>

              {/* Dev prompt when Google API keys are pending */}
              {showGoogleDevPrompt && (
                <div className="mt-2.5 p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-center animate-fadeIn space-y-2">
                  <p className="text-[11px] text-blue-900 font-medium">
                    লোকাল ডেমো মোডে গুগল সাইন-আপ ও অনবোর্ডিং টেস্ট করতে চান?
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGoogleDemoLogin(true)}
                      disabled={isGoogleLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#405189] hover:bg-[#364473] text-white text-[11px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>গুগল ট্রায়াল সাইন-আপ (অনবোর্ডিং টেস্ট)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGoogleDemoLogin(false)}
                      disabled={isGoogleLoading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      <span>রেগুলার ডেমো মার্চেন্ট</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation Switcher */}
          <div className="mt-6 pt-4 border-t border-[#e9ebec] text-center">
            {mode === "login" ? (
              <div className="p-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/80 border border-blue-200/90 rounded-xl text-center shadow-xs">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-xs">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span>15 Days Free Trial</span>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  Don't have a store yet?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setErrorMessage(null);
                    }}
                    className="font-bold text-[#405189] hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Create Free Store</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#878a99]">
                ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#405189] hover:underline"
                >
                  লগইন করুন
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Card Footer Copyright */}
        <div className="bg-[#f3f3f9] px-6 py-2.5 border-t border-[#e9ebec] flex items-center justify-center text-[11px] text-[#878a99]">
          <span>© 2026 GoCommerce BD. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};
