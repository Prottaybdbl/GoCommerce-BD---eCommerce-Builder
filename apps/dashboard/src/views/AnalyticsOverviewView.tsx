import React, { useState } from "react";
import {
  TrendingUp,
  PhoneCall,
  ClockAlert,
  Truck,
  ArrowUpRight,
  Calendar,
  Download,
  Package,
  ShoppingBag,
  ChevronRight,
  AlertTriangle,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { formatBdt } from "@gocom/contracts";
import { Order } from "./OrdersView.js";
import { IncompleteOrder } from "./IncompleteView.js";
import { Product } from "./ProductsView.js";
import { useLanguage } from "../context/LanguageContext.js";

interface AnalyticsOverviewViewProps {
  orders: Order[];
  incompleteLeads: IncompleteOrder[];
  products: Product[];
  onSelectTab: (tab: any) => void;
  onExportCsv: () => void;
  storeConfig?: any;
}

export const AnalyticsOverviewView: React.FC<AnalyticsOverviewViewProps> = ({
  orders,
  incompleteLeads,
  products,
  onSelectTab,
  onExportCsv,
  storeConfig,
}) => {
  const { t, language } = useLanguage();
  const [chartPeriod, setChartPeriod] = useState<"ALL" | "1M" | "6M" | "1Y">("1M");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Trial User State & Days Remaining Check
  const planKey = (storeConfig?.plan || "pilot").toLowerCase();
  const isPaid = ["starter", "growth", "pro", "enterprise"].includes(planKey) && storeConfig?.status !== "trialing";
  const isTrial = storeConfig?.isTrial ?? !isPaid;

  const daysRemaining = typeof storeConfig?.daysRemaining === "number"
    ? storeConfig.daysRemaining
    : (function () {
        const trialEnd = storeConfig?.trialEndsAt || storeConfig?.settings?.trialEndsAt || storeConfig?.settings?.endDate;
        if (!trialEnd) return 17;
        const ms = new Date(trialEnd).getTime();
        return Math.max(0, Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24)));
      })();

  // Financial & Metrics Computations
  const totalSalesPoisha = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const confirmedCount = orders.filter((o) => o.callStatus === "confirmed").length;
  const confirmationRate = orders.length > 0 ? Math.round((confirmedCount / orders.length) * 100) : 0;
  const potentialRecoveryPoisha = incompleteLeads.reduce((acc, l) => acc + (l.estimatedAmount || 0), 0);
  const averageOrderValue = orders.length > 0 ? Math.round(totalSalesPoisha / orders.length) : 0;

  // Courier Metrics
  const courierOrders = orders.filter((o) => o.courierTrackingCode || o.courierId);
  const deliveredCourierCount = courierOrders.filter((o) => o.status === "delivered").length;
  const courierDeliveryRate = courierOrders.length > 0
    ? Math.round((deliveredCourierCount / courierOrders.length) * 100)
    : 0;

  // Chart Data for Velzon Area Chart (Last 7 Days dynamically computed from real orders)
  const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesBn = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const chartDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const dayLabel = language === "bn" ? dayNamesBn[dayOfWeek] : dayNamesEn[dayOfWeek];
    const dateLabel = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;

    const matchingOrders = orders.filter((o) => {
      try {
        const orderDateStr = new Date(o.createdAt).toISOString().slice(0, 10);
        return orderDateStr === dayStr;
      } catch {
        return false;
      }
    });

    const daySalesPoisha = matchingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const daySalesBdt = Math.round(daySalesPoisha / 100);

    return {
      day: i === 6 ? (language === "bn" ? `${dayLabel} (আজ)` : `${dayLabel} (Today)`) : dayLabel,
      date: dateLabel,
      sales: daySalesBdt,
      orders: matchingOrders.length,
    };
  });

  // SVG Chart Dimensions
  const maxSales = Math.max(...chartDays.map((d) => d.sales), 1);
  const svgWidth = 650;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = chartDays.map((d, index) => {
    const x = paddingX + (index / (chartDays.length - 1)) * (svgWidth - paddingX * 2);
    const y = totalSalesPoisha > 0
      ? svgHeight - paddingY - (d.sales / maxSales) * (svgHeight - paddingY * 2)
      : svgHeight - paddingY;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (p.x - prev.x) / 2;
    const cp2y = p.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${
    svgHeight - paddingY
  } Z`;

  // Status Distribution for Donut Chart
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const inTransitOrders = orders.filter(
    (o) => o.status === "in_transit" || (Boolean(o.courierTrackingCode) && o.status !== "delivered" && o.status !== "cancelled")
  ).length;
  const pendingCallOrders = orders.filter((o) => o.callStatus === "pending").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled" || o.callStatus === "cancelled").length;
  const totalTrackedOrders = orders.length;

  const deliveredPct = totalTrackedOrders > 0 ? Math.round((deliveredOrders / totalTrackedOrders) * 100) : 0;
  const inTransitPct = totalTrackedOrders > 0 ? Math.round((inTransitOrders / totalTrackedOrders) * 100) : 0;
  const pendingPct = totalTrackedOrders > 0 ? Math.round((pendingCallOrders / totalTrackedOrders) * 100) : 0;
  const cancelledPct = totalTrackedOrders > 0 ? Math.round((cancelledOrders / totalTrackedOrders) * 100) : 0;

  const circ = 238.76;
  const lenDelivered = totalTrackedOrders > 0 ? (deliveredOrders / totalTrackedOrders) * circ : 0;
  const lenInTransit = totalTrackedOrders > 0 ? (inTransitOrders / totalTrackedOrders) * circ : 0;
  const lenPending = totalTrackedOrders > 0 ? (pendingCallOrders / totalTrackedOrders) * circ : 0;
  const lenCancelled = totalTrackedOrders > 0 ? (cancelledOrders / totalTrackedOrders) * circ : 0;

  const getProductSalesCount = (productId: string, productTitle: string) => {
    let sales = 0;
    for (const o of orders) {
      if (o.items && Array.isArray(o.items)) {
        for (const item of o.items) {
          if (item.id === productId || item.productTitle === productTitle) {
            sales += item.quantity || 1;
          }
        }
      }
    }
    return sales;
  };

  return (
    <div className="space-y-6">
      {/* Velzon Page Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#878a99] uppercase tracking-wider mb-1">
            <span>{t.dashboards}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#495057]">{t.analytics}</span>
          </div>
          <h2 className="text-xl font-bold text-[#495057]">
            {t.analyticsTitle}
          </h2>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#e9ebec] shadow-xs text-xs font-semibold text-[#495057]">
            <Calendar className="w-3.5 h-3.5 text-[#405189]" />
            <span>{t.dateRangeLabel}</span>
          </div>

          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0ab39c] hover:bg-[#0ab39c]/90 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.downloadReport}</span>
          </button>
        </div>
      </div>

      {/* Trial User Upgrade Banner Section (First page of store admin) */}
      {isTrial && (
        <div className="rounded-xl overflow-hidden border border-[#fef08a] bg-white shadow-xs">
          {/* Top Yellow Warning Strip */}
          <div className="bg-[#fef9c3] px-4 sm:px-5 py-2.5 flex items-center justify-between border-b border-[#fef08a] text-xs sm:text-sm text-[#854d0e]">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {language === "bn" ? (
                  <>আপনার ফ্রি ট্রায়াল শেষ হতে <strong className="font-bold text-[#713f12]">{daysRemaining} দিন</strong> বাকি।</>
                ) : (
                  <>Your free trial expired in <strong className="font-bold text-[#713f12]">{daysRemaining} days</strong>.</>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="text-[#b45309] hover:text-[#78350f] font-bold text-xs sm:text-sm hover:underline cursor-pointer transition-colors"
            >
              {language === "bn" ? "আপগ্রেড" : "Upgrade"}
            </button>
          </div>

          {/* Main Card Body */}
          <div className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg text-[#1e293b] leading-snug">
                {language === "bn" ? (
                  <>
                    আপনার প্ল্যানটি <span className="font-bold text-slate-900">ফ্রি ট্রায়াল</span> থেকে
                    <br className="hidden sm:inline" />
                    &lsquo;প্রিমিয়াম প্ল্যান&rsquo;-এ আপগ্রেড করুন <span className="font-bold">→</span>
                  </>
                ) : (
                  <>
                    Upgrade your plan from a <span className="font-bold text-slate-900">Free trial</span>, to
                    <br className="hidden sm:inline" />
                    &lsquo;Premium Plan&rsquo; <span className="font-bold">→</span>
                  </>
                )}
              </h3>

              <div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#10b981] hover:bg-[#059669] active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>{language === "bn" ? "অ্যাকাউন্ট আপগ্রেড করুন!" : "Upgrade Account!"}</span>
                </button>
              </div>
            </div>

            {/* 3D Illustration Graphic on the right */}
            <div className="shrink-0 flex items-center justify-end sm:w-44 lg:w-48">
              <img
                src="/trial-upgrade.jpg"
                alt="Upgrade Illustration"
                className="w-28 sm:w-36 lg:w-40 h-auto object-contain select-none pointer-events-none drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Velzon 4-Card Hero Metric Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="card-velzon p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.totalSales}</p>
              <h3 className="text-xl font-bold text-[#495057] mt-1.5">
                {formatBdt(totalSalesPoisha)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#405189]/10 text-[#405189] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e9ebec] flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-[#0ab39c] font-bold bg-[#0ab39c]/10 px-1.5 py-0.5 rounded">
              <TrendingUp className="w-3 h-3" /> {orders.length} {language === "bn" ? "টি মোট অর্ডার" : "total orders"}
            </span>
            <button
              onClick={() => onSelectTab("orders")}
              className="text-[#405189] font-semibold hover:underline flex items-center gap-0.5"
            >
              {t.details} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Call Confirmation Rate */}
        <div className="card-velzon p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.callConfirmationRate}</p>
              <h3 className="text-xl font-bold text-[#495057] mt-1.5">{confirmationRate}%</h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#0ab39c]/10 text-[#0ab39c] flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e9ebec] flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-[#0ab39c] font-bold bg-[#0ab39c]/10 px-1.5 py-0.5 rounded">
              <TrendingUp className="w-3 h-3" /> {confirmedCount} / {orders.length} {language === "bn" ? "নিশ্চিত" : "confirmed"}
            </span>
            <button
              onClick={() => onSelectTab("orders")}
              className="text-[#405189] font-semibold hover:underline flex items-center gap-0.5"
            >
              {t.teleSalesLogBtn} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Incomplete Leads */}
        <div className="card-velzon p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.dropOffLeadRecovery}</p>
              <h3 className="text-xl font-bold text-[#495057] mt-1.5">
                {incompleteLeads.length} {t.leadsCountSuffix}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#f7b84b]/15 text-[#f7b84b] flex items-center justify-center shrink-0">
              <ClockAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e9ebec] flex items-center justify-between text-xs">
            <span className="text-[#878a99] font-medium truncate max-w-[130px]">
              {language === "bn" ? "সম্ভাব্য:" : "Est:"} {formatBdt(potentialRecoveryPoisha)}
            </span>
            <button
              onClick={() => onSelectTab("incomplete")}
              className="text-[#405189] font-semibold hover:underline flex items-center gap-0.5"
            >
              {t.sendWhatsappBtn} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Courier Success */}
        <div className="card-velzon p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[#878a99] uppercase tracking-wider">{t.courierDeliveryRate}</p>
              <h3 className="text-xl font-bold text-[#495057] mt-1.5">{courierDeliveryRate}%</h3>
            </div>
            <div className="w-11 h-11 rounded-lg bg-[#299cdb]/10 text-[#299cdb] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e9ebec] flex items-center justify-between text-xs">
            <span className="text-[#0ab39c] font-bold bg-[#0ab39c]/10 px-1.5 py-0.5 rounded">
              {courierOrders.length} {language === "bn" ? "টি পার্সেল" : "parcels"}
            </span>
            <button
              onClick={() => onSelectTab("courier")}
              className="text-[#405189] font-semibold hover:underline flex items-center gap-0.5"
            >
              {t.remittanceSlipBtn} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Velzon Analytics Charts Grid (8 Cols Area Chart + 4 Cols Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Revenue & Sales Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 card-velzon">
          <div className="card-header-velzon">
            <div>
              <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
                {t.salesTrendsTitle}
              </h4>
              <p className="text-[11px] text-[#878a99] mt-0.5">
                {t.salesTrendsSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#f3f3f9] p-1 rounded-lg border border-[#e9ebec]">
              {(["ALL", "1M", "6M", "1Y"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all ${
                    chartPeriod === period
                      ? "bg-white text-[#405189] shadow-xs"
                      : "text-[#878a99] hover:text-[#495057]"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {/* Top KPI Summary Inside Chart */}
            <div className="grid grid-cols-3 gap-4 pb-4 mb-4 border-b border-[#e9ebec] text-center">
              <div>
                <p className="text-[11px] text-[#878a99] font-semibold">{t.totalRevenueLabel}</p>
                <h5 className="text-base font-bold text-[#495057] mt-0.5">
                  {formatBdt(totalSalesPoisha)}
                </h5>
              </div>
              <div>
                <p className="text-[11px] text-[#878a99] font-semibold">{t.orderCountLabel}</p>
                <h5 className="text-base font-bold text-[#0ab39c] mt-0.5">
                  {orders.length} {language === "bn" ? "টি" : "orders"}
                </h5>
              </div>
              <div>
                <p className="text-[11px] text-[#878a99] font-semibold">{t.avgBasketSizeLabel}</p>
                <h5 className="text-base font-bold text-[#405189] mt-0.5">
                  {formatBdt(averageOrderValue)}
                </h5>
              </div>
            </div>

            {/* Interactive SVG Area Chart */}
            <div className="relative w-full overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="velzonSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#405189" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#405189" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = paddingY + (1 - ratio) * (svgHeight - paddingY * 2);
                  return (
                    <line
                      key={i}
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="#e9ebec"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Gradient Area */}
                <path d={areaD} fill="url(#velzonSalesGrad)" />

                {/* Main Stroke Path */}
                <path d={pathD} fill="none" stroke="#405189" strokeWidth="3" strokeLinecap="round" />

                {/* Data Points */}
                {points.map((p, i) => (
                  <g key={i} className="cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint === i ? 6 : 4}
                      fill="#ffffff"
                      stroke="#405189"
                      strokeWidth={hoveredPoint === i ? 3 : 2}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* X-Axis Labels */}
                    <text
                      x={p.x}
                      y={svgHeight - 8}
                      fontSize="10"
                      fill="#878a99"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {p.date}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Tooltip on Hover */}
              {hoveredPoint !== null && (
                <div
                  className="absolute bg-[#1a1d2e] text-white p-2 rounded-lg shadow-xl text-xs z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(points[hoveredPoint].x / svgWidth) * 100}%`,
                    top: `${(points[hoveredPoint].y / svgHeight) * 100}%`,
                  }}
                >
                  <p className="font-bold text-[11px] text-indigo-200">
                    {points[hoveredPoint].day} ({points[hoveredPoint].date})
                  </p>
                  <p className="font-semibold text-white mt-0.5">
                    {language === "bn" ? "বিক্রয়:" : "Sales:"} ৳{points[hoveredPoint].sales.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#0ab39c] font-medium">
                    {language === "bn" ? "অর্ডার:" : "Orders:"} {points[hoveredPoint].orders}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Order Status Breakdown (4 Cols Donut Chart) */}
        <div className="lg:col-span-4 card-velzon flex flex-col justify-between">
          <div className="card-header-velzon">
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {t.orderStatusDistribution}
            </h4>
            <span className="text-[10px] text-[#878a99] font-medium">{t.liveTracking}</span>
          </div>

          <div className="p-5 flex flex-col items-center">
            {/* SVG Donut Chart */}
            <div className="relative w-48 h-48 my-2">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {totalTrackedOrders === 0 ? (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#e9ebec"
                    strokeWidth="14"
                  />
                ) : (
                  <>
                    {/* Segment 1: Delivered - Emerald */}
                    {lenDelivered > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#0ab39c"
                        strokeWidth="14"
                        strokeDasharray={`${lenDelivered.toFixed(1)} ${circ}`}
                        strokeDashoffset={0}
                      />
                    )}
                    {/* Segment 2: In-Transit - Sky */}
                    {lenInTransit > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#299cdb"
                        strokeWidth="14"
                        strokeDasharray={`${lenInTransit.toFixed(1)} ${circ}`}
                        strokeDashoffset={-lenDelivered}
                      />
                    )}
                    {/* Segment 3: Call Pending - Amber */}
                    {lenPending > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f7b84b"
                        strokeWidth="14"
                        strokeDasharray={`${lenPending.toFixed(1)} ${circ}`}
                        strokeDashoffset={-(lenDelivered + lenInTransit)}
                      />
                    )}
                    {/* Segment 4: Cancelled/Returned - Coral */}
                    {lenCancelled > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f06548"
                        strokeWidth="14"
                        strokeDasharray={`${lenCancelled.toFixed(1)} ${circ}`}
                        strokeDashoffset={-(lenDelivered + lenInTransit + lenPending)}
                      />
                    )}
                  </>
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-[#878a99] font-semibold uppercase">{t.total}</span>
                <span className="text-xl font-black text-[#495057]">
                  {totalTrackedOrders}
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="w-full space-y-2 mt-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0ab39c]"></span>
                  <span className="text-[#495057] font-medium">{t.deliveredAndCompleted}</span>
                </div>
                <span className="font-bold text-[#495057]">{deliveredPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#299cdb]"></span>
                  <span className="text-[#495057] font-medium">{t.inTransitCourier}</span>
                </div>
                <span className="font-bold text-[#495057]">{inTransitPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f7b84b]"></span>
                  <span className="text-[#495057] font-medium">{t.callPendingConfirm}</span>
                </div>
                <span className="font-bold text-[#495057]">{pendingPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f06548]"></span>
                  <span className="text-[#495057] font-medium">{t.cancelledReturned}</span>
                </div>
                <span className="font-bold text-[#495057]">{cancelledPct}%</span>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#e9ebec] text-center bg-[#f3f3f9]/50">
            <button
              onClick={() => onSelectTab("orders")}
              className="text-xs font-bold text-[#405189] hover:underline"
            >
              {t.manageDetailedStatus}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Selling Products & Live Tele-sales Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Products (7 Cols) */}
        <div className="lg:col-span-7 card-velzon">
          <div className="card-header-velzon">
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {t.topSellingProducts}
            </h4>
            <button
              onClick={() => onSelectTab("products")}
              className="text-xs font-semibold text-[#405189] hover:underline"
            >
              {t.allProductsBtn}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#495057]">
              <thead className="bg-[#f3f3f9] text-[#878a99] font-bold uppercase border-b border-[#e9ebec]">
                <tr>
                  <th className="px-4 py-3">{t.productCol}</th>
                  <th className="px-4 py-3">{t.priceCol}</th>
                  <th className="px-4 py-3">{t.salesCol}</th>
                  <th className="px-4 py-3">{t.stockStatusCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ebec]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#878a99]">
                      {t.noProductsFound}
                    </td>
                  </tr>
                ) : (
                  products.slice(0, 4).map((p) => (
                    <tr key={p.id} className="hover:bg-[#f3f3f9]/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#495057]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#e9ebec] overflow-hidden flex items-center justify-center shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-[#878a99]" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 line-clamp-1">{p.title}</div>
                            <span className="text-[10px] text-[#878a99] font-normal">{p.banglaTitle || p.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#495057]">{formatBdt(p.price)}</td>
                      <td className="px-4 py-3 font-bold text-[#0ab39c]">
                        {getProductSalesCount(p.id, p.title)} {language === "bn" ? "টি" : "sales"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-[#e9ebec] overflow-hidden">
                            <div
                              className="h-full bg-[#0ab39c] rounded-full"
                              style={{ width: `${Math.min(100, p.stockQuantity)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-semibold text-[#878a99]">
                            {p.stockQuantity} {t.remainingSuffix}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tele-sales Activity & Calls (5 Cols) */}
        <div className="lg:col-span-5 card-velzon">
          <div className="card-header-velzon">
            <h4 className="text-xs font-bold text-[#495057] uppercase tracking-wider">
              {t.recentTeleSalesActivity}
            </h4>
            <span className="text-[10px] font-bold text-[#0ab39c] bg-[#0ab39c]/10 px-2 py-0.5 rounded">
              {t.liveFeed}
            </span>
          </div>

          <div className="p-4 space-y-3.5 divide-y divide-[#e9ebec]">
            {orders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#878a99]">
                {t.noOrdersFound}
              </div>
            ) : (
              orders.slice(0, 4).map((order) => (
                <div key={order.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-[#405189]/10 text-[#405189] flex items-center justify-center font-bold text-xs shrink-0">
                      #{order.orderNumber}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#495057] truncate">{order.customerName}</p>
                      <p className="text-[10px] text-[#878a99] truncate">{order.phone} • {order.deliveryDistrict}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        order.callStatus === "confirmed"
                          ? "bg-[#0ab39c]/10 text-[#0ab39c]"
                          : order.callStatus.startsWith("no_answer")
                          ? "bg-[#f7b84b]/15 text-[#f7b84b]"
                          : "bg-[#f06548]/10 text-[#f06548]"
                      }`}
                    >
                      {order.callStatus === "confirmed"
                        ? t.confirmed
                        : order.callStatus.startsWith("no_answer")
                        ? t.noAnswerTab
                        : t.pendingCall}
                    </span>
                    <div className="text-[11px] font-bold text-[#495057] mt-0.5">
                      {formatBdt(order.totalAmount)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-[#e9ebec] text-center bg-[#f3f3f9]/50">
            <button
              onClick={() => onSelectTab("orders")}
              className="text-xs font-bold text-[#405189] hover:underline"
            >
              {t.teleSalesPanelBtn}
            </button>
          </div>
        </div>
      </div>
      {/* Upgrade to Premium Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-[#e9ebec] w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9ebec] bg-[#f8f9fa]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#495057] text-sm">
                    {language === "bn" ? "প্রিমিয়াম প্ল্যানে আপগ্রেড করুন" : "Upgrade to Premium Plan"}
                  </h3>
                  <p className="text-[11px] text-[#878a99]">
                    {language === "bn"
                      ? "আনলিমিটেড প্রোডাক্ট, কাস্টম ডোমেন ও ডেলিভারি অটোমেশন আনলক করুন"
                      : "Unlock unlimited products, custom domain & automated delivery"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Plans Comparison */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Starter Plan */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#405189]/40 transition-all flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Starter</h4>
                    <div className="mt-1 text-base font-bold text-[#405189]">৳999<span className="text-xs text-slate-500 font-normal">/mo</span></div>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> ১০০টি প্রোডাক্ট</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> ৫টি ল্যান্ডিং পেজ</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> কুরিয়ার ইন্টিগ্রেশন</li>
                    </ul>
                  </div>
                  <a
                    href="https://wa.me/8801834734387?text=Hi,%20I%20want%20to%20upgrade%20my%20store%20to%20Starter%20Plan"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors"
                  >
                    {language === "bn" ? "স্টার্টার নিন" : "Get Starter"}
                  </a>
                </div>

                {/* Growth Plan (Popular) */}
                <div className="p-4 rounded-xl border-2 border-[#10b981] bg-emerald-50/20 relative flex flex-col justify-between shadow-xs">
                  <div className="absolute -top-2.5 right-3 bg-[#10b981] text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                    {language === "bn" ? "সবচেয়ে জনপ্রিয় ★" : "Most Popular ★"}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Growth</h4>
                    <div className="mt-1 text-base font-bold text-[#10b981]">৳2,999<span className="text-xs text-slate-500 font-normal">/mo</span></div>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" /> আনলিমিটেড প্রোডাক্ট</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" /> নিজস্ব কাস্টম ডোমেন (.com)</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" /> স্টেডফাস্ট ও পাঠাও অটো-বুকিং</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" /> ফেসবুক পিক্সেল ও মেটা CAPI</li>
                    </ul>
                  </div>
                  <a
                    href="https://wa.me/8801834734387?text=Hi,%20I%20want%20to%20upgrade%20my%20store%20to%20Growth%20Plan"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block text-center py-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg transition-colors shadow-xs"
                  >
                    {language === "bn" ? "গ্রোথ প্ল্যানে আপগ্রেড" : "Upgrade to Growth"}
                  </a>
                </div>

                {/* Pro Plan */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#405189]/40 transition-all flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Pro Enterprise</h4>
                    <div className="mt-1 text-base font-bold text-[#405189]">৳4,999<span className="text-xs text-slate-500 font-normal">/mo</span></div>
                    <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> আনলিমিটেড সবকিছু</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> মাল্টি-স্টাফ ও রোল কন্ট্রোল</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> ০% প্ল্যাটফর্ম ট্রানজ্যাকশন ফি</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> ২৪/৭ ডেডিকেটেড সাপোর্ট</li>
                    </ul>
                  </div>
                  <a
                    href="https://wa.me/8801834734387?text=Hi,%20I%20want%20to%20upgrade%20my%20store%20to%20Pro%20Plan"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block text-center py-2 bg-[#405189] hover:bg-[#364574] text-white font-bold rounded-lg transition-colors"
                  >
                    {language === "bn" ? "প্রো প্ল্যান নিন" : "Get Pro Plan"}
                  </a>
                </div>
              </div>

              {/* Payment Support Notice */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
                <span className="font-medium">
                  {language === "bn"
                    ? "বিকাশ, নগদ, রকেট বা কার্ডের মাধ্যমে ইনস্ট্যান্ট অ্যাক্টিভেশন করতে আমাদের সাপোর্টে যোগাযোগ করুন।"
                    : "Instant activation available via bKash, Nagad, Rocket, or Card. Contact support for instant setup."}
                </span>
                <a
                  href="https://wa.me/8801834734387"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] shrink-0 ml-2"
                >
                  WhatsApp: +8801834734387
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-[#e9ebec] bg-[#f8f9fa]">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
