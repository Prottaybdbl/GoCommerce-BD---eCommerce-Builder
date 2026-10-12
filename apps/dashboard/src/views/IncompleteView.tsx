import React, { useState } from "react";
import { MessageCircle, Phone, ArrowUpRight, Search, ChevronRight } from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import { useLanguage } from "../context/LanguageContext.js";

export interface IncompleteOrder {
  id: string;
  phone: string;
  customerName?: string | null;
  deliveryDistrict?: string | null;
  deliveryAddress?: string | null;
  estimatedAmount: number;
  lastStep: string;
  status: string;
  whatsappUrl?: string;
  createdAt: string;
}

interface IncompleteViewProps {
  leads: IncompleteOrder[];
}

export const IncompleteView: React.FC<IncompleteViewProps> = ({ leads }) => {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");

  const filteredLeads = leads.filter(
    (l) =>
      l.phone.includes(search) ||
      (l.customerName && l.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (l.deliveryDistrict && l.deliveryDistrict.toLowerCase().includes(search.toLowerCase()))
  );

  const totalEstimatedPoisha = leads.reduce((acc, l) => acc + (l.estimatedAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#878a99] uppercase tracking-wider mb-1">
            <span>{t.operationsBreadcrumb}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#495057]">{t.incompleteBreadcrumb}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057]">
            {t.incompleteTitle}
          </h2>
          <p className="text-xs text-[#878a99] mt-0.5">
            {t.incompleteSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-[#f7b84b]/15 text-[#855700] rounded-lg text-xs font-bold border border-[#f7b84b]/30">
            {t.recoveryPotential}: {formatBdt(totalEstimatedPoisha)}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card-velzon">
        <div className="card-header-velzon flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {t.dropOffListTitle} ({filteredLeads.length})
            </h4>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.leadSearchPlaceholder}
              className="w-full bg-[#f3f3f9] text-[#495057] placeholder-[#878a99] text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-[#e9ebec] focus:outline-none focus:border-[#405189]"
            />
            <Search className="w-3.5 h-3.5 text-[#878a99] absolute left-2.5 top-2" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#495057]">
            <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
              <tr>
                <th className="px-4 py-3">{t.phoneCol}</th>
                <th className="px-4 py-3">{t.customerNameDistrictCol}</th>
                <th className="px-4 py-3">{t.estimatedPriceCol}</th>
                <th className="px-4 py-3">{t.dropOffStepCol}</th>
                <th className="px-4 py-3">{t.timeCol}</th>
                <th className="px-4 py-3 text-right">{t.recoveryActionCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9ebec]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#878a99]">
                    {t.noLeadsFound}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#495057]">
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1.5 text-[#0ab39c] hover:text-[#0ab39c]/80 bg-[#0ab39c]/10 px-2 py-0.5 rounded font-bold border border-[#0ab39c]/20"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{lead.phone}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{lead.customerName || t.unknownCustomer}</div>
                      <div className="text-[10px] text-[#878a99]">{lead.deliveryDistrict || t.districtNotSpecified}</div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#495057]">
                      {lead.estimatedAmount > 0 ? formatBdt(lead.estimatedAmount) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] bg-[#f3f3f9] text-[#495057] px-2 py-0.5 rounded font-semibold border border-[#e9ebec]">
                        {lead.lastStep === "phone_entered" ? t.phoneEnteredStep : t.addressEnteredStep}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#878a99]">
                      {new Date(lead.createdAt).toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {lead.whatsappUrl ? (
                        <a
                          href={lead.whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0ab39c] hover:bg-[#0ab39c]/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{t.whatsappMessageBtn}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-[#878a99]">—</span>
                      )}
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
