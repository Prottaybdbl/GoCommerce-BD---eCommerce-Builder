import React, { useState } from "react";
import {
  Phone,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  Search,
  CreditCard,
  X,
} from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import { useLanguage } from "../context/LanguageContext.js";

export interface OrderItem {
  id: string;
  productTitle: string;
  variantTitle: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  customerName: string;
  phone: string;
  deliveryZone: string;
  deliveryDistrict: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  callStatus: string;
  callAttempts: number;
  callNotes?: string | null;
  advanceRequired: boolean;
  advanceAmount: number;
  advanceVerified: boolean;
  advanceTrxId?: string | null;
  status: string;
  courierId?: string | null;
  courierTrackingCode?: string | null;
  items?: OrderItem[];
  createdAt: string;
}

interface OrdersViewProps {
  orders: Order[];
  onUpdateCallStatus: (orderId: string, status: string, notes?: string) => Promise<void>;
  onVerifyAdvance: (orderId: string, trxId: string, amount: number) => Promise<void>;
  onBookCourier: (orderId: string) => Promise<void>;
  onExportCsv: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onUpdateCallStatus,
  onVerifyAdvance,
  onBookCourier,
  onExportCsv,
}) => {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Advance bKash verification modal state
  const [verifyModalOrder, setVerifyModalOrder] = useState<Order | null>(null);
  const [bKashTrxId, setBKashTrxId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "pending_call" && o.callStatus === "pending") ||
      (filter === "confirmed" && o.callStatus === "confirmed") ||
      (filter === "no_answer" && o.callStatus.startsWith("no_answer")) ||
      (filter === "advance_required" && o.advanceRequired && !o.advanceVerified);

    const matchesSearch =
      !searchQuery ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      o.orderNumber.toString().includes(searchQuery) ||
      o.deliveryDistrict.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleCallStatusChange = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await onUpdateCallStatus(orderId, status);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmAdvanceVerification = async () => {
    if (!verifyModalOrder || !bKashTrxId.trim()) return;
    setIsVerifying(true);
    try {
      await onVerifyAdvance(verifyModalOrder.id, bKashTrxId.trim(), verifyModalOrder.advanceAmount);
      setVerifyModalOrder(null);
      setBKashTrxId("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#495057]">{t.ordersTitle}</h2>
          <p className="text-xs text-[#878a99] mt-0.5">
            {t.ordersSubtitle}
          </p>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-[#0ab39c] hover:bg-[#0ab39c]/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t.downloadSteadfastCsv}</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card-velzon">
        {/* Table Filter & Search Controls */}
        <div className="card-header-velzon flex-col md:flex-row gap-3">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: `${t.allOrdersTab} (${orders.length})` },
              {
                id: "pending_call",
                label: `${t.pendingCallTab} (${orders.filter((o) => o.callStatus === "pending").length})`,
              },
              {
                id: "confirmed",
                label: `${t.confirmedTab} (${orders.filter((o) => o.callStatus === "confirmed").length})`,
              },
              {
                id: "no_answer",
                label: `${t.noAnswerTab} (${orders.filter((o) => o.callStatus.startsWith("no_answer")).length})`,
              },
              {
                id: "advance_required",
                label: `${t.advancePendingTab} (${
                  orders.filter((o) => o.advanceRequired && !o.advanceVerified).length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? "bg-[#405189] text-white shadow-xs"
                    : "bg-[#f3f3f9] text-[#495057] hover:bg-[#e9ebec]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.orderSearchPlaceholder}
              className="w-full bg-[#f3f3f9] text-[#495057] placeholder-[#878a99] text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
            />
            <Search className="w-3.5 h-3.5 text-[#878a99] absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#495057]">
            <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
              <tr>
                <th className="px-4 py-3">{t.orderNumberCol}</th>
                <th className="px-4 py-3">{t.customerAndMobileCol}</th>
                <th className="px-4 py-3">{t.addressAndDistrictCol}</th>
                <th className="px-4 py-3">{t.priceCodCol}</th>
                <th className="px-4 py-3">{t.teleSalesCallStatusCol}</th>
                <th className="px-4 py-3">{t.courierBookingCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#878a99]">
                    {t.noOrdersFound}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isUpdating = updatingId === order.id;
                  return (
                    <tr key={order.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                      {/* Order Number */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-[#405189]">#{order.orderNumber}</span>
                        <div className="text-[10px] text-[#878a99] mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Customer Info + Direct Dial Link */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{order.customerName}</div>
                        <a
                          href={`tel:${order.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[#0ab39c] hover:text-[#0ab39c]/80 font-bold mt-1 bg-[#0ab39c]/10 px-2 py-0.5 rounded border border-[#0ab39c]/20"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.phone}</span>
                        </a>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="font-semibold text-slate-800 text-xs block truncate">
                          {order.deliveryDistrict}
                        </span>
                        <span className="text-[11px] text-[#878a99] line-clamp-1 mt-0.5">
                          {order.deliveryAddress}
                        </span>
                      </td>

                      {/* Price & Advance */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[#495057]">{formatBdt(order.totalAmount)}</div>
                        {order.advanceRequired && (
                          <div className="mt-1">
                            {order.advanceVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#0ab39c] bg-[#0ab39c]/10 px-2 py-0.5 rounded font-bold border border-[#0ab39c]/20">
                                <CheckCircle2 className="w-3 h-3" /> {t.advanceVerifiedBadge} (Trx: {order.advanceTrxId})
                              </span>
                            ) : (
                              <button
                                onClick={() => setVerifyModalOrder(order)}
                                className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded font-bold border border-amber-300"
                              >
                                <CreditCard className="w-3 h-3" /> {t.verifyAdvanceBtn}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tele-Sales Call Status Selector */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <select
                            disabled={isUpdating}
                            value={order.callStatus}
                            onChange={(e) => handleCallStatusChange(order.id, e.target.value)}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:ring-1 focus:ring-[#405189] focus:outline-none transition-all ${
                              order.callStatus === "confirmed"
                                ? "bg-[#0ab39c]/10 text-[#0ab39c] border-[#0ab39c]/30 font-bold"
                                : order.callStatus.startsWith("no_answer")
                                ? "bg-[#f7b84b]/15 text-[#f7b84b] border-[#f7b84b]/30 font-bold"
                                : "bg-[#f3f3f9] text-[#495057] border-[#e9ebec]"
                            }`}
                          >
                            <option value="pending">{t.callPendingOption}</option>
                            <option value="confirmed">{t.confirmedOption}</option>
                            <option value="no_answer_1">{t.noAnswer1Option}</option>
                            <option value="no_answer_2">{t.noAnswer2Option}</option>
                            <option value="no_answer_3">{t.noAnswer3Option}</option>
                            <option value="wrong_number">{t.wrongNumberOption}</option>
                            <option value="cancelled_by_customer">{t.cancelledOption}</option>
                          </select>
                        </div>
                        {order.callAttempts > 0 && (
                          <span className="text-[10px] text-[#878a99] block mt-1">
                            {t.callAttemptsPrefix} {order.callAttempts} {language === "bn" ? "বার" : "times"}
                          </span>
                        )}
                      </td>

                      {/* Courier Booking */}
                      <td className="px-4 py-3.5">
                        {order.courierTrackingCode ? (
                          <div className="text-xs">
                            <span className="font-bold text-[#0ab39c] bg-[#0ab39c]/10 px-2 py-0.5 rounded border border-[#0ab39c]/20">
                              Steadfast
                            </span>
                            <p className="text-[10px] text-[#878a99] mt-1 font-mono">
                              TRK: {order.courierTrackingCode}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => onBookCourier(order.id)}
                            disabled={order.callStatus !== "confirmed"}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              order.callStatus === "confirmed"
                                ? "bg-[#405189] hover:bg-[#364574] text-white shadow-xs"
                                : "bg-[#f3f3f9] text-[#878a99] cursor-not-allowed border border-[#e9ebec]"
                            }`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{t.sendSteadfastBtn}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Velzon Material Modal: Advance bKash Verification */}
      {verifyModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#e9ebec] overflow-hidden">
            <div className="px-5 py-4 bg-[#f3f3f9] border-b border-[#e9ebec] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#495057]">
                {t.advanceModalTitle} (#{verifyModalOrder.orderNumber})
              </h3>
              <button
                onClick={() => setVerifyModalOrder(null)}
                className="text-[#878a99] hover:text-[#495057]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-pink-50 rounded-lg border border-pink-200 text-xs text-pink-800">
                <p className="font-bold">{t.customerPhoneModalLabel} {verifyModalOrder.phone}</p>
                <p className="mt-0.5">{t.advanceDeliveryFeeModalLabel} {formatBdt(verifyModalOrder.advanceAmount)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#495057] mb-1">
                  {t.bkashTrxIdLabel}
                </label>
                <input
                  type="text"
                  value={bKashTrxId}
                  onChange={(e) => setBKashTrxId(e.target.value)}
                  placeholder="e.g. BKL9X87ZQ"
                  className="w-full bg-[#f3f3f9] text-slate-900 text-xs font-semibold px-3 py-2 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#878a99] hover:bg-[#f3f3f9] rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  disabled={!bKashTrxId.trim() || isVerifying}
                  onClick={handleConfirmAdvanceVerification}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0ab39c] hover:bg-[#0ab39c]/90 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isVerifying ? t.verifyingText : t.confirmAndVerifyBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
