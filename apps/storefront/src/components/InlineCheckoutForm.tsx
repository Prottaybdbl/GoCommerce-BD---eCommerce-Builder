import { useState, useEffect, useRef } from "preact/hooks";
import { formatBdt } from "@gocom/contracts/utils";
import { CheckCircle2, ShieldCheck, Truck, AlertCircle, Loader2 } from "./icons.js";

interface Variant {
  id: string;
  title: string;
  price: number; // poisha
  compareAtPrice?: number | null;
  stockQuantity: number;
}

interface Product {
  id: string;
  title: string;
  banglaTitle?: string | null;
  variants: Variant[];
}

interface StoreSettings {
  deliveryChargeInsideDhaka?: number;
  deliveryChargeSubDhaka?: number;
  deliveryChargeOutsideDhaka?: number;
  advanceDeliveryRequiredOutsideDhaka?: boolean;
  advanceDeliveryAmount?: number;
  bkashPersonalNumber?: string;
  supportPhone?: string;
}

interface InlineCheckoutFormProps {
  product: Product;
  settings: StoreSettings;
  /**
   * Prefix for the storefront API. A store on its own host posts to `/api/...`;
   * a path-based store (`/<subdomain>`) posts to `/<subdomain>/api/...`, which is
   * what tells the platform whose order this is.
   */
  apiBase?: string;
}

export function InlineCheckoutForm({ product, settings, apiBase = "" }: InlineCheckoutFormProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>(
    product.variants[0] || { id: "", title: "", price: 0, stockQuantity: 0 }
  );
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryZone, setDeliveryZone] = useState<"inside_dhaka" | "sub_dhaka" | "outside_dhaka">(
    "inside_dhaka"
  );
  const [deliveryDistrict, setDeliveryDistrict] = useState("Dhaka");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  // Advance Payment state
  const [advanceTrxId, setAdvanceTrxId] = useState("");
  const [advanceSenderPhone, setAdvanceSenderPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounced Incomplete Order Capture (Abandoned Checkout Leads)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if phone looks like a valid BD phone (starts with 01 and has 11 digits)
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (/^01[3-9]\d{8}$/.test(cleanPhone)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`${apiBase}/api/incomplete-orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: cleanPhone,
              customerName: customerName || undefined,
              deliveryDistrict,
              deliveryAddress,
              items: [
                {
                  productId: product.id,
                  variantId: selectedVariant.id,
                  title: `${product.banglaTitle || product.title} (${selectedVariant.title})`,
                  price: selectedVariant.price,
                  quantity,
                },
              ],
              estimatedAmount: selectedVariant.price * quantity,
              lastStep: deliveryAddress ? "address_entered" : "phone_entered",
            }),
          });
        } catch (err) {
          // Ignore lead capture failure silently
        }
      }, 1500);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [phone, customerName, deliveryDistrict, deliveryAddress, selectedVariant, quantity]);

  // Delivery fee calculation
  let deliveryFee = 6000;
  if (deliveryZone === "inside_dhaka") {
    deliveryFee = settings.deliveryChargeInsideDhaka ?? 6000;
  } else if (deliveryZone === "sub_dhaka") {
    deliveryFee = settings.deliveryChargeSubDhaka ?? 10000;
  } else {
    deliveryFee = settings.deliveryChargeOutsideDhaka ?? 12000;
  }

  const subtotal = selectedVariant.price * quantity;
  const totalAmount = subtotal + deliveryFee;

  const isAdvanceRequired = Boolean(
    settings.advanceDeliveryRequiredOutsideDhaka &&
    (deliveryZone === "outside_dhaka" || deliveryZone === "sub_dhaka")
  );
  const advanceAmount = isAdvanceRequired ? settings.advanceDeliveryAmount ?? 12000 : 0;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phone || phone.replace(/[\s-]/g, "").length < 11) {
      setErrorMessage("অনুগ্রহ করে আপনার সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
      return;
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      setErrorMessage("অনুগ্রহ করে আপনার সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || "সম্মানিত ক্রেতা",
          phone: phone.trim(),
          deliveryZone,
          deliveryDistrict,
          deliveryAddress: deliveryAddress.trim(),
          customerNote: customerNote.trim() || undefined,
          items: [
            {
              productId: product.id,
              variantId: selectedVariant.id,
              quantity,
            },
          ],
          advancePaymentMethod: isAdvanceRequired ? "bkash_personal" : undefined,
          advanceSenderPhone: advanceSenderPhone || undefined,
          advanceTrxId: advanceTrxId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "অর্ডার সম্পন্ন হতে সমস্যা হয়েছে");
      }

      setCompletedOrder(data.order);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-8 text-center space-y-4 shadow-xl my-8">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">ধন্যবাদ! আপনার অর্ডারটি গ্রহণ করা হয়েছে</h3>
        <p className="text-base text-slate-700">
          আপনার অর্ডার নম্বর: <span className="font-extrabold text-emerald-700">#{completedOrder.orderNumber}</span>
        </p>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          খুব শীঘ্রই আমাদের কাস্টমার সাপোর্ট টিম থেকে আপনার নম্বরে (<span className="font-bold text-slate-900">{phone}</span>) কল করে অর্ডারটি কনফার্ম করা হবে।
        </p>
        <div className="pt-4 border-t border-emerald-200 text-xs text-slate-500">
          ডেলিভারি ম্যানের কাছ থেকে পণ্যটি চেক করে মূল্য পরিশোধ করুন।
        </div>
      </div>
    );
  }

  return (
    <div id="checkout-section" className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-rose-500/40 shadow-2xl space-y-6">
      <div className="text-center space-y-2 border-b border-slate-100 pb-5">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
          ক্যাশ অন ডেলিভারি (পণ্য হাতে পেয়ে পেমেন্ট)
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
          অর্ডারটি কনফার্ম করতে নিচের তথ্যগুলো পূরণ করুন
        </h3>
        <p className="text-xs text-slate-500">
          কোনো অগ্রিম পেমেন্ট ছাড়াই অর্ডার করুন (ঢাকার ভেতরে)
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Variant / Option Selector */}
        {product.variants.length > 1 && (
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">প্যাকেজ / ভ্যারিয়েন্ট সিলেক্ট করুন:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {product.variants.map((v) => {
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-rose-600 bg-rose-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">{v.title}</div>
                    <div className="text-xs font-bold text-rose-600 mt-1">{formatBdt(v.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-slate-800">অর্ডার পরিমাণ (Quantity):</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-base hover:bg-slate-100 flex items-center justify-center"
            >
              -
            </button>
            <span className="font-extrabold text-base w-6 text-center text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-base hover:bg-slate-100 flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* Customer Information */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              আপনার নাম <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="আপনার পুরো নাম লিখুন"
              value={customerName}
              onChange={(e: any) => setCustomerName(e.target.value)}
              className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              মোবাইল নম্বর <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="017XXXXXXXX (১১ ডিজিট)"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
              className="w-full text-sm px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/50 font-bold"
            />
          </div>

          {/* Delivery Zone Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              ডেলিভারি এলাকা <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "inside_dhaka" as const, label: "ঢাকা সিটি", fee: settings.deliveryChargeInsideDhaka ?? 6000 },
                { id: "sub_dhaka" as const, label: "ঢাকা উপশহর", fee: settings.deliveryChargeSubDhaka ?? 10000 },
                { id: "outside_dhaka" as const, label: "ঢাকার বাইরে", fee: settings.deliveryChargeOutsideDhaka ?? 12000 },
              ].map((zone) => {
                const isSelected = deliveryZone === zone.id;
                return (
                  <button
                    type="button"
                    key={zone.id}
                    onClick={() => {
                      setDeliveryZone(zone.id);
                      if (zone.id === "inside_dhaka") setDeliveryDistrict("Dhaka");
                    }}
                    className={`py-2.5 px-2 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      isSelected
                        ? "border-rose-600 bg-rose-50 text-rose-700 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <div>{zone.label}</div>
                    <div className="text-[11px] font-semibold opacity-80 mt-0.5">{formatBdt(zone.fee)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              সম্পূর্ণ ঠিকানা <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="রোড নম্বর, বাড়ি নম্বর, এলাকা বা থানার নাম লিখুন"
              value={deliveryAddress}
              onChange={(e: any) => setDeliveryAddress(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50/50"
            />
          </div>
        </div>

        {/* Advance bKash Requirement Notice (Outside Dhaka) */}
        {isAdvanceRequired && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>ঢাকার বাইরের অর্ডারে ডেলিভারি চার্জ ({formatBdt(advanceAmount)}) অগ্রিম প্রযোজ্য</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              অনুগ্রহ করে আমাদের পার্সোনাল bKash নম্বরে ({settings.bkashPersonalNumber || "017XXXXXXXX"}) {formatBdt(advanceAmount)} Send Money করে TrxID টি নিচে দিন:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="bKash TrxID"
                value={advanceTrxId}
                onChange={(e: any) => setAdvanceTrxId(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-amber-300 bg-white focus:outline-none"
              />
              <input
                type="tel"
                placeholder="যে নম্বর থেকে পাঠিয়েছেন"
                value={advanceSenderPhone}
                onChange={(e: any) => setAdvanceSenderPhone(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg border border-amber-300 bg-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Order Summary Breakdown */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>পণ্যের মূল্য ({quantity}টি)</span>
            <span className="font-bold text-slate-900">{formatBdt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>ডেলিভারি চার্জ</span>
            <span className="font-bold text-slate-900">{formatBdt(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
            <span>মোট প্রদেয় টাকা (COD)</span>
            <span className="text-rose-600 text-base">{formatBdt(totalAmount)}</span>
          </div>
        </div>

        {/* Pulsing Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-base sm:text-lg font-black shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>অর্ডার কনফার্ম করুন — {formatBdt(totalAmount)}</span>
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 gap-3 pt-2 text-center text-[11px] text-slate-500 font-semibold">
          <div className="flex items-center justify-center gap-1.5 bg-slate-50 py-2 rounded-xl border border-slate-100">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>সারা দেশে হোম ডেলিভারি</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-slate-50 py-2 rounded-xl border border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>চেক করে মূল্য পরিশোধ</span>
          </div>
        </div>
      </form>
    </div>
  );
};
