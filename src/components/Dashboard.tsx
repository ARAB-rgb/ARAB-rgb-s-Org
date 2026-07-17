/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  FileText, Landmark, TrendingUp, TrendingDown, ClipboardCheck,
  AlertTriangle, Receipt, Calendar, ArrowUpRight, ShieldCheck, ChevronLeft, Coins, HelpCircle, Settings
} from "lucide-react";
import { Installment, Receipt as ReceiptType } from "../types";
import { getContractTiming } from "../db";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  "مدى": "#38bdf8",     // Bright Sky Blue (Premium)
  "تحويل": "#fbbf24",   // Amber Gold (Premium)
  "نقداً": "#34d399",   // Emerald Mint (Premium)
};
const DEFAULT_COLOR = "#94a3b8"; // Slate

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-800/80 p-3 rounded-2xl shadow-2xl text-right z-50">
        <p className="text-xs font-black text-white mb-1">{data.name}</p>
        <p className="text-sm font-black text-amber-400 font-mono">
          {Number(data.value).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ريال</span>
        </p>
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  installments: Installment[];
  receipts: ReceiptType[];
  payments: any[];
  expenses: any[];
  onNavigateToContracts: () => void;
  sbStatus?: "checking" | "connected" | "fallback";
  companies?: any[];
  selectedCompanyId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  installments,
  receipts,
  payments,
  expenses,
  onNavigateToContracts,
  sbStatus = "connected",
  companies = [],
  selectedCompanyId = "all"
}) => {
  const [showCapitalExplanation, setShowCapitalExplanation] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Card Visibility configuration stored in localStorage
  const DEFAULT_VISIBILITY = {
    collectionSummary: true,
    arrearsPulse: true,
    lateClients: true,
    paymentDistribution: true,
    latestReceipts: true,
    upcomingPayments: true,
    branchAnalysis: true,
    companyAnalysis: true,
  };

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("dashboard_cards_visibility");
    if (saved) {
      try {
        return { ...DEFAULT_VISIBILITY, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_VISIBILITY;
      }
    }
    return DEFAULT_VISIBILITY;
  });

  const toggleVisibility = (key: string) => {
    const updated = { ...visibility, [key]: !visibility[key] };
    setVisibility(updated);
    localStorage.setItem("dashboard_cards_visibility", JSON.stringify(updated));
  };

  // Global totals
  const activeCompany = companies.find(c => c.id === selectedCompanyId);
  const registeredCapital = activeCompany 
    ? Number(activeCompany.capital || 0) 
    : (selectedCompanyId === "all" ? companies.reduce((sum, c) => sum + Number(c.capital || 0), 0) : 0);

  const totalContractsCount = installments.length;
  const totalContractsAmount = installments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalCollectedReceipts = receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalOutgoingPayments = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalOutgoingExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalOutflows = totalOutgoingPayments + totalOutgoingExpenses;
  const treasuryBalance = totalCollectedReceipts - totalOutflows;
  const totalRemainingContracts = installments.reduce((sum, item) => sum + Number(item.remaining || 0), 0);

  // Arrears list & calculations
  const analyzedContracts = installments.map((item) => ({
    contract: item,
    timing: getContractTiming(item),
  }));

  const lateContractsCount = analyzedContracts.filter((o) => o.timing.overdueDays > 0).length;

  // ملخص التحصيل الذكي
  // المطلوب حتى اليوم = sum min(contract.amount, start_date -> today due days * installment)
  const dueAmountTillToday = analyzedContracts.reduce((sum, o) => {
    const startNum = o.timing.dueDays * Number(o.contract.installment || 0);
    return sum + Math.min(Number(o.contract.amount || 0), startNum);
  }, 0);

  const collectedActual = totalCollectedReceipts;
  const overdueOnlyAmount = analyzedContracts.reduce((sum, o) => sum + Number(o.timing.overdueAmount || 0), 0);
  const collectionPercentage = dueAmountTillToday > 0 
    ? Math.min(100, Math.round((collectedActual / dueAmountTillToday) * 100)) 
    : 0;

  // نبض المتأخرات counts
  const shortLateCount = analyzedContracts.filter((o) => o.timing.overdueDays >= 1 && o.timing.overdueDays <= 7).length;
  const midLateCount = analyzedContracts.filter((o) => o.timing.overdueDays >= 8 && o.timing.overdueDays <= 30).length;
  const longLateCount = analyzedContracts.filter((o) => o.timing.overdueDays > 30).length;

  let riskText = "الوضع العام ممتاز ومستقر";
  let riskBadgeColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (longLateCount > 0) {
    riskText = `تنبيه: يوجد عدد ${longLateCount} عملاء تجاوزوا 30 يوم من التأخر المستمر!`;
    riskBadgeColor = "text-rose-400 border-rose-500/30 bg-rose-500/10 glowing-rose";
  } else if (midLateCount > 0) {
    riskText = "يوجد متأخرات متوسطة تحتاج لمتابعة وتنبيه هذا الأسبوع.";
    riskBadgeColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
  }

  // Overdue clients sorted from worst
  const lateClientsList = analyzedContracts
    .filter((o) => o.timing.overdueDays > 0)
    .sort((a, b) => b.timing.overdueDays - a.timing.overdueDays)
    .slice(0, 5);

  // Latest 5 receipts
  const latestReceiptsFeed = [...receipts]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, 5);

  // Calculate distribution of collection amounts by payment method (نقداً، مدى، تحويل)
  const methodDistribution = React.useMemo(() => {
    const sums: Record<string, number> = {
      "مدى": 0,
      "تحويل": 0,
      "نقداً": 0,
    };

    receipts.forEach((rec) => {
      const amt = Number(rec.amount || 0);
      const m = (rec.method || "").trim();
      
      if (m.includes("مدى") || m.includes("مدي")) {
        sums["مدى"] += amt;
      } else if (m.includes("تحويل")) {
        sums["تحويل"] += amt;
      } else if (m.includes("نقدا") || m.includes("نقداً") || m.includes("نقدي") || m.includes("كاش") || m.includes("نقد")) {
        sums["نقداً"] += amt;
      } else {
        if (m) {
          if (!sums[m]) sums[m] = 0;
          sums[m] += amt;
        } else {
          sums["نقداً"] += amt;
        }
      }
    });

    return Object.entries(sums).map(([name, value]) => ({
      name,
      value,
    }));
  }, [receipts]);

  // --- CALCULATE BRANCHES (REGIONS) ---
  const branchStats = React.useMemo(() => {
    const regions = ["الوسطى", "الشرقية", "الغربية", "الجنوب", "الشمال", "عام/غير محدد"];
    const statsMap: Record<string, { contractsCount: number; contractsAmount: number; collected: number; outflow: number }> = {};
    
    regions.forEach(r => {
      statsMap[r] = { contractsCount: 0, contractsAmount: 0, collected: 0, outflow: 0 };
    });

    const getRegionKey = (notesText: string) => {
      const text = String(notesText || "");
      const m1 = text.match(/\[الإدارة:\s*([^\]]+)\]/);
      if (m1) return m1[1].trim();
      
      const m2 = text.match(/\[\[?AW_BRANCH:\s*([^\]\s]+)\]?\]/i);
      if (m2) {
        const code = m2[1].trim().toLowerCase();
        const map: Record<string, string> = {
          riyadh: "الوسطى", kharj: "الوسطى", dammam: "الشرقية",
          central: "الوسطى", east: "الشرقية", west: "الغربية",
          south: "الجنوب", north: "الشمال"
        };
        return map[code] || code;
      }
      return "";
    };

    // Process installments
    installments.forEach(item => {
      let r = getRegionKey(item.notes || "");
      if (!r || !regions.includes(r)) {
        r = "عام/غير محدد";
      }
      statsMap[r].contractsCount += 1;
      statsMap[r].contractsAmount += Number(item.amount || 0);
    });

    // Process receipts
    receipts.forEach(item => {
      let r = getRegionKey(item.notes || "");
      if (!r || !regions.includes(r)) {
        r = "عام/غير محدد";
      }
      statsMap[r].collected += Number(item.amount || 0);
    });

    // Process payments
    payments.forEach(item => {
      let r = getRegionKey(item.notes || "");
      if (!r || !regions.includes(r)) {
        r = "عام/غير محدد";
      }
      statsMap[r].outflow += Number(item.amount || 0);
    });

    // Process expenses
    expenses.forEach(item => {
      let r = getRegionKey(item.notes || "");
      if (!r || !regions.includes(r)) {
        r = "عام/غير محدد";
      }
      statsMap[r].outflow += Number(item.amount || 0);
    });

    return Object.entries(statsMap)
      .map(([name, data]) => ({
        name,
        ...data,
        balance: data.collected - data.outflow
      }))
      .filter(item => item.contractsCount > 0 || item.collected > 0 || item.outflow > 0);
  }, [installments, receipts, payments, expenses]);


  // --- CALCULATE COMPANIES ---
  const companyStats = React.useMemo(() => {
    // Determine which companies should be processed (only authorized ones)
    const visibleCompanies = selectedCompanyId === "all" 
      ? companies 
      : companies.filter(c => c.id === selectedCompanyId);

    return visibleCompanies.map(comp => {
      const compId = comp.id || "arab_world";
      
      const compInstallments = installments.filter(item => (item.company_id || "arab_world") === compId);
      const compReceipts = receipts.filter(item => (item.company_id || "arab_world") === compId);
      const compPayments = payments.filter(item => (item.company_id || "arab_world") === compId);
      const compExpenses = expenses.filter(item => (item.company_id || "arab_world") === compId);

      const contractsCount = compInstallments.length;
      const contractsAmount = compInstallments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const collected = compReceipts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const outflow = compPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0) + 
                      compExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        id: compId,
        name: comp.name,
        capital: Number(comp.capital || 0),
        contractsCount,
        contractsAmount,
        collected,
        outflow,
        balance: collected - outflow
      };
    });
  }, [companies, selectedCompanyId, installments, receipts, payments, expenses]);

  // Upcoming collections based on start date and paid sums
  const upcomingPaymentsFeed = analyzedContracts
    .filter((o) => o.timing.lastPaid && o.timing.lastPaid !== "غير مسدد" && o.contract.status !== "مكتمل")
    .sort((a, b) => String(b.timing.lastPaid).localeCompare(String(a.timing.lastPaid)))
    .slice(0, 5);

  // KPI card elements helper
  const topStats = [
    { title: "رأس مال الشركة", value: registeredCapital.toLocaleString(), unit: "ريال تأسيسي", icon: Coins, color: "text-amber-400 border-amber-500/20" },
    { title: "عدد العقود", value: totalContractsCount.toLocaleString(), unit: "عقد", icon: FileText, color: "text-blue-400 border-blue-500/20" },
    { title: "إجمالي العقود", value: totalContractsAmount.toLocaleString(), unit: "ريال", icon: ClipboardCheck, color: "text-indigo-400 border-indigo-500/20" },
    { title: "إجمالي القبض", value: totalCollectedReceipts.toLocaleString(), unit: "ريال", icon: Landmark, color: "text-emerald-400 border-emerald-500/20" },
    { title: "إجمالي الصرف", value: totalOutflows.toLocaleString(), unit: "ريال", icon: TrendingDown, color: "text-red-400 border-red-500/20" },
    { title: "رصيد الخزنة", value: treasuryBalance.toLocaleString(), unit: "ريال", icon: ShieldCheck, color: "text-cyan-400 border-cyan-500/20" },
    { title: "المتأخرات المعلقة", value: lateContractsCount.toLocaleString(), unit: "عقد", icon: AlertTriangle, color: "text-amber-400 border-amber-500/20" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Fallback Notice Banner */}
      {sbStatus === "fallback" && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-transparent border border-amber-500/30 p-5 rounded-3xl shadow-lg shadow-amber-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3.5 relative z-10 w-full">
            <div className="p-3 bg-amber-500/15 border border-amber-500/35 rounded-2xl text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1 w-full">
              <h4 className="text-sm font-black text-white flex items-center gap-1.5 leading-none">
                <span>⚠️ تنبيه مزامنة قاعدة البيانات: البيانات معروضة من الخزنة الاحتياطية (Firestore)</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-5xl mt-1.5">
                تعذر الاتصال بقنوات المزامنة الذكية لقاعدة بيانات <b>Supabase</b> حالياً (قد يكون مشروع قاعدة البيانات في وضع السكون المؤقت بسبب عدم النشاط، وهو أمر تلقائي وشائع في باقات خوادم التطبيقات المجانية).
                <br />
                <span className="text-slate-400 font-medium">لحماية البيانات وضمان عمل الدفاتر بلا توقف، قام النظام تلقائياً بالتحول إلى <b>Firestore السحابية المؤمنة والبديلة</b>. إذا كنت تملك ملف نسخة احتياطية للشركة <span className="text-amber-400 font-mono">(.json)</span> يمكنك استعادتها فوراً وبكبسة زر واحدة من تبويب <b>"الموظفين والصلاحية"</b> لتستأنف عملك الحسابي بكامل البيانات فوراً!</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Personalization Panel */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/85 overflow-hidden">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/20 transition-all text-right cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg">
              <Settings className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">تخصيص كروت وتقارير لوحة القيادة</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">تحكم في ظهور أو إخفاء كروت التحليل المالي والعملاء المتأخرين حسب رغبتك</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md">
              {Object.values(visibility).filter(Boolean).length} / {Object.keys(visibility).length} كروت نشطة
            </span>
            <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showConfig ? "-rotate-90" : ""}`} />
          </div>
        </button>

        {showConfig && (
          <div className="p-5 border-t border-slate-800 bg-slate-950/40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-4 flex items-center justify-between border-b border-slate-800/50 pb-3 mb-1">
              <span className="text-xs font-black text-slate-200">اختر الكروت والمؤشرات التي تفضل بقاءها في لوحة المتابعة:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allTrue = {
                      collectionSummary: true,
                      arrearsPulse: true,
                      lateClients: true,
                      paymentDistribution: true,
                      latestReceipts: true,
                      upcomingPayments: true,
                      branchAnalysis: true,
                      companyAnalysis: true,
                    };
                    setVisibility(allTrue);
                    localStorage.setItem("dashboard_cards_visibility", JSON.stringify(allTrue));
                  }}
                  className="px-2.5 py-1 text-[9px] font-black bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                >
                  إظهار الكل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allFalse = {
                      collectionSummary: false,
                      arrearsPulse: false,
                      lateClients: false,
                      paymentDistribution: false,
                      latestReceipts: false,
                      upcomingPayments: false,
                      branchAnalysis: false,
                      companyAnalysis: false,
                    };
                    setVisibility(allFalse);
                    localStorage.setItem("dashboard_cards_visibility", JSON.stringify(allFalse));
                  }}
                  className="px-2.5 py-1 text-[9px] font-black bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
                >
                  إخفاء الكل
                </button>
              </div>
            </div>

            {[
              { key: "collectionSummary", label: "ملخص التحصيل الذكي", desc: "نظرة عامة على المطلوب والمسدد ونسب الإنجاز الفعلي للمبالغ." },
              { key: "arrearsPulse", label: "نبض وتوزيع المتأخرات", desc: "تقييم مستوى المخاطر والمشكلات حسب فترات التأخير للعملاء." },
              { key: "lateClients", label: "قائمة العملاء المتأخرين", desc: "جدول يعرض تفاصيل العملاء المتأخرين وأيام التأخير والمستحقات." },
              { key: "paymentDistribution", label: "توزيع التحصيل حسب الدفع", desc: "مخطط دائري يوضح نسب التحصيل نقداً، مدى أو تحويلات بنكية." },
              { key: "latestReceipts", label: "آخر 5 سندات قبض", desc: "موجز لأحدث السندات المسجلة لدخول الأموال لخزينة المؤسسة." },
              { key: "upcomingPayments", label: "آخر أيام السداد القادمة", desc: "تتبع مواعيد الاستحقاقات والأقساط التالية للعملاء." },
              { key: "branchAnalysis", label: "التحليل المالي للفروع", desc: "كشف أداء الفروع والمناطق من حيث العقود، المقبوضات والمصروفات." },
              { key: "companyAnalysis", label: "ملاءة وحسابات الشركات", desc: "أداة مطابقة ومقارنة الأرصدة المالية بين الكيانات والشركات التابعة." },
            ].map((item) => {
              const active = visibility[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => toggleVisibility(item.key)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none text-right ${
                    active
                      ? "bg-amber-500/5 border-amber-500/30 shadow-md shadow-amber-500/5"
                      : "bg-slate-900/20 border-slate-800/60 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{item.label}</span>
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${active ? "bg-amber-500" : "bg-slate-800"}`}>
                      <div className={`w-3.5 h-3.5 bg-slate-950 rounded-full transition-transform ${active ? "translate-x-3.5" : "translate-x-0"}`} />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Display Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {topStats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-slate-900/50 backdrop-blur-md rounded-2xl p-4 border ${stat.color} shadow-lg shadow-black/10 transition-transform duration-200 hover:scale-[1.02] flex flex-col justify-between`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-black text-slate-400 leading-tight">{stat.title}</span>
                {stat.title === "رأس مال الشركة" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCapitalExplanation(prev => !prev);
                    }}
                    className="text-amber-500 hover:text-amber-400 transition-colors focus:outline-none"
                    title="كيف جاء هذا المبلغ؟ اضغط للتفاصيل"
                  >
                    <HelpCircle className="w-3 h-3 cursor-pointer" />
                  </button>
                )}
              </div>
              <stat.icon className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-black text-white">{stat.value}</span>
              <span className="text-[10px] font-bold text-slate-500 block">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Capital Explanation Panel */}
      {showCapitalExplanation && (
        <div className="relative overflow-hidden bg-slate-900/90 border-2 border-amber-500/30 p-5 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start justify-between gap-4 animate-fadeIn">
          <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3.5 relative z-10 w-full">
            <div className="p-3 bg-amber-500/15 border border-amber-500/35 rounded-2xl text-amber-400 shrink-0 mt-0.5">
              <Coins className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-2 w-full text-right">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-amber-400">
                  💡 تفاصيل رأس مال الشركة: كيف جاني هذا المبلغ؟
                </h4>
                <button 
                  onClick={() => setShowCapitalExplanation(false)}
                  className="text-[11px] text-slate-400 hover:text-white font-bold bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none transition-colors"
                >
                  إغلاق التوضيح ×
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-6xl mt-1.5">
                هذا المبلغ يمثل <b>رأس المال التأسيسي المرخص والمسجل قانونياً</b> للمؤسسة أو الشركة في النظام المحاسبي:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1.5 pr-2">
                <li>
                  <b className="text-slate-200">مصدر القيمة:</b> يتم تعيين قيمة رأس المال يدوياً بواسطة الإدارة عند إدخال أو تعديل بيانات الشركة في تبويب <span className="text-amber-500 font-bold">"دليل الشركات والمستخلصات"</span>.
                </li>
                <li>
                  <b className="text-slate-200">الشركة الحالية:</b> لـ <b className="text-slate-200">"شركة عرب وورلد للمقاولات"</b>، تم تعيين القيمة التأسيسية افتراضياً بـ <span className="text-amber-400 font-mono font-bold">10,000,000 ريال</span> للتوافق مع السجل التجاري والملاءة الائتمانية للشركة.
                </li>
                <li>
                  <b className="text-slate-200">كيفية التعديل:</b> إذا كنت مديراً للنظام أو تمتلك الصلاحيات، يمكنك تعديل هذا المبلغ في أي وقت بالذهاب إلى <span className="text-white font-semibold">دليل الشركات والمستخلصات</span> ← <span className="text-white font-semibold">تعديل الشركة</span> ثم تحديث حقل <span className="text-amber-500 font-bold">رأس مال الشركة التأسيسي (ريال)</span> ليقوم النظام بتحديث المؤشر في جميع شاشات القيادة تلقائياً.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main interactive grid containing pulse reports & smart summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ملخص التحصيل الذكي (Collection Engine Summary) */}
        {visibility.collectionSummary && (
          <div className="relative overflow-hidden lg:col-span-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">💎</span>
                ملخص التحصيل الذكي للشركة
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                  <span className="block text-[11px] font-bold text-slate-400 mb-1">المطلوب حتى اليوم</span>
                  <b className="text-sm font-black text-white">{dueAmountTillToday.toLocaleString()} <span className="text-[10px] font-normal">ريال</span></b>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                  <span className="block text-[11px] font-bold text-slate-400 mb-1">المسدد فعلياً</span>
                  <b className="text-sm font-black text-white">{collectedActual.toLocaleString()} <span className="text-[10px] font-normal">ريال</span></b>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                  <span className="block text-[11px] font-bold text-slate-400 mb-1">المتأخر الفعلي</span>
                  <b className="text-sm font-black text-rose-400">{overdueOnlyAmount.toLocaleString()} <span className="text-[10px] font-normal">ريال</span></b>
                </div>
                <div className="bg-slate-950/40 border border-emerald-500/20 p-4 rounded-xl">
                  <span className="block text-[11px] font-bold text-slate-400 mb-1">نسبة التحصيل الذكي</span>
                  <b className="text-sm font-black text-emerald-400">{collectionPercentage}%</b>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Custom filled progress shell */}
              <div className="h-2.5 w-full bg-slate-950/60 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-l from-emerald-500 via-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${collectionPercentage}%` }}
                />
              </div>
              <p className="text-xs font-bold text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-4 py-3 rounded-xl leading-relaxed">
                💡 الحساب الذكي يعتمد على الأقساط والالتزامات المستحقة تاريخياً حتى اللحظة الحالية فقط، مخصوماً منها السداد والقبض الفعلي.
              </p>
            </div>
          </div>
        )}

        {/* نبض المتأخرات */}
        {visibility.arrearsPulse && (
          <div className="lg:col-span-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-400">⚡</span>
                نبض وتوزيع المتأخرات
              </h3>

              {/* Arrears visual indicators */}
              <div className="grid grid-cols-3 gap-2 text-center my-4">
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <b className="text-2xl font-black text-amber-400">{shortLateCount}</b>
                  <span className="block text-[10px] font-bold text-slate-400 mt-1">1 - 7 أيام</span>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <b className="text-2xl font-black text-orange-400">{midLateCount}</b>
                  <span className="block text-[10px] font-bold text-slate-400 mt-1">8 - 30 يوم</span>
                </div>
                <div className="bg-slate-950/40 border border-rose-500/20 p-3 rounded-2xl">
                  <b className="text-2xl font-black text-rose-400">{longLateCount}</b>
                  <span className="block text-[10px] font-bold text-slate-400 mt-1">أكثر من 30</span>
                </div>
              </div>
            </div>

            <div className={`p-3.5 border rounded-xl text-center text-xs font-black leading-relaxed ${riskBadgeColor}`}>
              {riskText}
            </div>
          </div>
        )}

        {/* قائمة المتأخرين */}
        {visibility.lateClients && (
          <div className="lg:col-span-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400">🚨</span>
                  قائمة العملاء المتأخرين
                </h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">مرتبة تلقائياً من أعلى أيام تأخر مستحق في السداد</p>
              </div>
              <button
                onClick={onNavigateToContracts}
                className="flex items-center gap-1 px-4 py-2 bg-slate-950/60 border border-slate-800 text-xs font-black text-amber-400 hover:text-white rounded-xl transition-all hover:bg-amber-600/20"
              >
                استعراض العقود الشاملة
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950/20 border-b border-slate-850 text-slate-400">
                    <th className="py-3 px-4 font-black">العميل</th>
                    <th className="py-3 px-4 font-black">رقم العقد</th>
                    <th className="py-3 px-4 font-black">آخر يوم سداد</th>
                    <th className="py-3 px-4 font-black text-center">أيام التأخير</th>
                    <th className="py-3 px-4 font-black">المبلغ المتأخر</th>
                    <th className="py-3 px-4 font-black">المتبقي الكلي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40">
                  {lateClientsList.length > 0 ? (
                    lateClientsList.map((client, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{client.contract.client}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{client.contract.no}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{client.timing.lastPaid}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            {client.timing.overdueDays} يومًا
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-rose-400 font-mono">
                          {client.timing.overdueAmount.toLocaleString()} ريال
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-300 font-mono">
                          {Number(client.contract.remaining || 0).toLocaleString()} ريال
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-550 font-extrabold">
                        🎉 لا توجد أي متأخرات سداد للعملاء حالياً!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* توزيع مبالغ التحصيل حسب طريقة الدفع (Pie Chart) */}
        {visibility.paymentDistribution && (
          <div className="lg:col-span-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
                <span className="p-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400">📊</span>
                توزيع التحصيل حسب طريقة الدفع
              </h3>

              <div className="h-[200px] w-full flex items-center justify-center relative mt-4">
                {/* Central Text for Donut Chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                  <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest leading-none">إجمالي التحصيل</span>
                  <span className="text-lg font-black text-white mt-2 font-mono leading-none">
                    {totalCollectedReceipts.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-black text-amber-500 mt-1">ريال</span>
                </div>

                {totalCollectedReceipts === 0 ? (
                  <div className="text-center text-slate-500 font-bold text-xs space-y-1.5 z-20">
                    <p>🚫 لا توجد بيانات تحصيل حالياً لعرضها</p>
                    <p className="text-[10px] font-normal text-slate-600">سجل عمليات القبض لتحديث المخطط</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {methodDistribution.map((entry, index) => {
                          const name = entry.name as keyof typeof COLORS;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[name] || DEFAULT_COLOR}
                              stroke="#0f172a"
                              strokeWidth={3}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Premium Legend & Distribution % */}
              <div className="grid grid-cols-3 gap-2 text-center mt-4 border-t border-slate-850/60 pt-4">
                {methodDistribution.map((item, index) => {
                  const name = item.name as keyof typeof COLORS;
                  const percent = totalCollectedReceipts > 0 ? Math.round((item.value / totalCollectedReceipts) * 100) : 0;
                  return (
                    <div key={index} className="bg-slate-950/40 border border-slate-850/60 p-2 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-all">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[name] || DEFAULT_COLOR }}
                        />
                        <span className="text-[10px] font-black text-slate-400">{item.name}</span>
                      </div>
                      <div className="mt-1.5">
                        <b className="block text-xs font-black text-white font-mono">{item.value.toLocaleString()}</b>
                        <span className="block text-[9px] font-bold text-slate-500 mt-0.5">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* آخر 5 سندات قبض */}
        {visibility.latestReceipts && (
          <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
                <span className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">📌</span>
                آخر 5 سندات قبض مستلمة
              </h3>

              <div className="space-y-3">
                {latestReceiptsFeed.length > 0 ? (
                  latestReceiptsFeed.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center gap-4 bg-slate-950/40 p-3 rounded-2xl border border-slate-850"
                    >
                      <div>
                        <h4 className="text-sm font-black text-white leading-relaxed">{rec.from_name || "اسم غير مسجل"}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          تاريخ: {rec.date} • عقد: {rec.contract_no || "عام"}
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <b className="text-base font-black text-emerald-400 font-mono">+{Number(rec.amount || 0).toLocaleString()}</b>
                        <span className="block text-[8px] font-bold text-slate-500">ريال سعودي</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-slate-500 font-bold">لا توجد سندات قبض مسجلة حالياً.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* آخر أيام السداد القادمة */}
        {visibility.upcomingPayments && (
          <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
                <span className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">📅</span>
                آخر أيام السداد القادمة للعملاء
              </h3>

              <div className="space-y-3">
                {upcomingPaymentsFeed.length > 0 ? (
                  upcomingPaymentsFeed.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center gap-4 bg-slate-950/40 p-3 rounded-2xl border border-slate-850"
                    >
                      <div>
                        <h4 className="text-sm font-black text-white leading-relaxed">{item.contract.client}</h4>
                        <p className="text-[10px] font-bold text-slate-300 mt-1">رقم العقد: {item.contract.no}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <b className="text-sm font-semibold text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
                          {item.timing.lastPaid}
                        </b>
                        <span className="block text-[8px] font-bold text-slate-500 mt-1 text-center">أخر سداد</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-10 text-slate-500 font-bold">لا توجد سجلات مستحقة قادمة.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* التحليل المالي حسب الفروع والمناطق */}
        {visibility.branchAnalysis && (
          <div className="lg:col-span-12 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[28px] p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800/80 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2 font-sans">
                  <span className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">🇸🇦</span>
                  التحليل المالي والإحصائي للفروع والمناطق (الفروع)
                </h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5 font-sans">الحسابات والتدفقات النقدية مفرزة حسب الفروع والربط الإقليمي التلقائي</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/20 border-b border-slate-850 text-slate-400">
                    <th className="py-3 px-4 font-black">اسم الفرع / المنطقة</th>
                    <th className="py-3 px-4 font-black text-center">عدد العقود الجارية</th>
                    <th className="py-3 px-4 font-black">إجمالي قيمة العقود</th>
                    <th className="py-3 px-4 font-black">المبالغ المحصلة</th>
                    <th className="py-3 px-4 font-black">المصروفات والصرف</th>
                    <th className="py-3 px-4 font-black">الرصيد الفعلي (خزنة الفرع)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40">
                  {branchStats.length > 0 ? (
                    branchStats.map((branch, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2 font-sans">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                          📍 منطقة {branch.name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-300 font-bold">{branch.contractsCount}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-300 font-mono">{branch.contractsAmount.toLocaleString()} ريال</td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-400 font-mono">+{branch.collected.toLocaleString()} ريال</td>
                        <td className="py-3.5 px-4 font-extrabold text-rose-400 font-mono">-{branch.outflow.toLocaleString()} ريال</td>
                        <td className={`py-3.5 px-4 font-extrabold font-mono ${branch.balance >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                          {branch.balance.toLocaleString()} ريال
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-550 font-extrabold font-sans">
                        لا توجد بيانات مرتبطة بالفروع حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تحليل ومطابقة الشركات التابعة */}
        {visibility.companyAnalysis && (
          <div className="lg:col-span-12 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[28px] p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800/80 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2 font-sans">
                  <span className="p-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400">🏢</span>
                  ملاءة الحسابات ومطابقة الشركات المرخصة والنشطة
                </h3>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5 font-sans">
                  {selectedCompanyId === "all" 
                    ? "كشف مقارنة ومطابقة مالي شامل لجميع الكيانات والشركات التابعة النشطة تحت إدارتك"
                    : "كشف المطابقة الحسابي المعتمد للشركة المحددة قانونًا والنشطة حاليًا"
                  }
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/20 border-b border-slate-850 text-slate-400">
                    <th className="py-3 px-4 font-black">اسم الشركة</th>
                    <th className="py-3 px-4 font-black">رأس المال التأسيسي</th>
                    <th className="py-3 px-4 font-black text-center">عدد العقود الجارية</th>
                    <th className="py-3 px-4 font-black">إجمالي قيمة العقود</th>
                    <th className="py-3 px-4 font-black">المبالغ المحصلة (القبض)</th>
                    <th className="py-3 px-4 font-black">الصرف والتدفق الخارج</th>
                    <th className="py-3 px-4 font-black">رصيد الخزائن الحالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40">
                  {companyStats.length > 0 ? (
                    companyStats.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2 font-sans">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                          🏢 {comp.name}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-amber-400 font-mono">{comp.capital.toLocaleString()} ريال</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-300 font-bold">{comp.contractsCount}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-300 font-mono">{comp.contractsAmount.toLocaleString()} ريال</td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-400 font-mono">+{comp.collected.toLocaleString()} ريال</td>
                        <td className="py-3.5 px-4 font-extrabold text-rose-400 font-mono">-{comp.outflow.toLocaleString()} ريال</td>
                        <td className={`py-3.5 px-4 font-extrabold font-mono ${comp.balance >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                          {comp.balance.toLocaleString()} ريال
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-550 font-extrabold font-sans">
                        لا توجد أي بيانات شركات تابعة نشطة لعرضها حاليًا.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
