import React from "react";
import { FileSpreadsheet, ChevronRight } from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import { useLanguage } from "../context/LanguageContext.js";

export interface Remittance {
  id: string;
  orderId: string;
  consignmentId: string;
  codCollected: number;
  courierDeliveryCharge: number;
  codServiceFee: number;
  netPayoutExpected: number;
  payoutStatus: string;
}

interface CourierViewProps {
  onExportCsv: () => void;
  remittances: Remittance[];
}

export const CourierView: React.FC<CourierViewProps> = ({ onExportCsv, remittances }) => {
  const { t } = useLanguage();
  const totalCodCollected = remittances.reduce((acc, r) => acc + r.codCollected, 0);
  const totalNetExpected = remittances.reduce((acc, r) => acc + r.netPayoutExpected, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#878a99] uppercase tracking-wider mb-1">
          <span>{t.logisticsBreadcrumb}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#495057]">{t.courierBreadcrumb}</span>
        </div>
        <h2 className="text-xl font-bold text-[#495057]">
          {t.courierTitle}
        </h2>
        <p className="text-xs text-[#878a99] mt-0.5">
          {t.courierSubtitle}
        </p>
      </div>

      {/* Velzon CSV Export Action Banner */}
      <div className="card-velzon p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-emerald-50/40">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0ab39c]/10 text-[#0ab39c] flex items-center justify-center shrink-0 border border-[#0ab39c]/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#495057]">{t.steadfastCsvBannerTitle}</h3>
            <p className="text-xs text-[#878a99] mt-0.5">
              {t.steadfastCsvBannerDesc}
            </p>
          </div>
        </div>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0ab39c] hover:bg-[#0ab39c]/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t.downloadCsvBtn}</span>
        </button>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-velzon p-4">
          <p className="text-xs text-[#878a99] font-bold uppercase tracking-wider">{t.totalCodCollectionTitle}</p>
          <p className="text-lg font-bold text-[#495057] mt-1.5">{formatBdt(totalCodCollected)}</p>
          <p className="text-[10px] text-[#878a99] mt-1">{t.totalCodCollectionSub}</p>
        </div>

        <div className="card-velzon p-4">
          <p className="text-xs text-[#878a99] font-bold uppercase tracking-wider">{t.courierFeeTitle}</p>
          <p className="text-lg font-bold text-[#f06548] mt-1.5">
            {formatBdt(totalCodCollected > 0 ? Math.max(0, totalCodCollected - totalNetExpected) : 0)}
          </p>
          <p className="text-[10px] text-[#878a99] mt-1">{t.courierFeeSub}</p>
        </div>

        <div className="card-velzon p-4">
          <p className="text-xs text-[#878a99] font-bold uppercase tracking-wider">{t.netPayoutExpectedTitle}</p>
          <p className="text-lg font-bold text-[#0ab39c] mt-1.5">
            {formatBdt(totalNetExpected)}
          </p>
          <p className="text-[10px] text-[#0ab39c] font-semibold mt-1">{t.netPayoutExpectedSub}</p>
        </div>
      </div>

      {/* Remittance Table */}
      <div className="card-velzon">
        <div className="card-header-velzon">
          <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
            {t.courierTrackingTableTitle}
          </h4>
          <span className="text-xs text-[#878a99]">{remittances.length} {t.totalRecordsSuffix}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#495057]">
            <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
              <tr>
                <th className="px-4 py-3">{t.consignmentIdCol}</th>
                <th className="px-4 py-3">{t.courierProviderCol}</th>
                <th className="px-4 py-3">{t.collectedFromCustomerCol}</th>
                <th className="px-4 py-3">{t.courierChargeCol}</th>
                <th className="px-4 py-3">{t.netPayableCol}</th>
                <th className="px-4 py-3 text-right">{t.paymentStatusCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {remittances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#878a99]">
                    {t.noCourierRecordsFound}
                  </td>
                </tr>
              ) : (
                remittances.map((rem) => (
                  <tr key={rem.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold font-mono text-[#405189]">
                      {rem.consignmentId}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-bold bg-[#0ab39c]/10 text-[#0ab39c] px-2 py-0.5 rounded border border-[#0ab39c]/20">
                        Steadfast
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#495057]">{formatBdt(rem.codCollected)}</td>
                    <td className="px-4 py-3.5 text-[#f06548] font-semibold">
                      {formatBdt(rem.courierDeliveryCharge + rem.codServiceFee)}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#0ab39c]">
                      {formatBdt(rem.netPayoutExpected)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          rem.payoutStatus === "paid"
                            ? "bg-[#0ab39c]/10 text-[#0ab39c]"
                            : "bg-[#f7b84b]/15 text-[#855700]"
                        }`}
                      >
                        {rem.payoutStatus === "paid" ? t.paidBadge : t.processingBadge}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
