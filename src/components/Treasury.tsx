/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Wallet, Landmark, TrendingUp, Search, Plus, Trash2, AlertTriangle, Coins, Edit2, Check, X } from "lucide-react";
import { Receipt, Payment, Expense, Installment } from "../types";
import { sb, awExtractTreasury, awExtractCapital, awExtractCapitalSource, awExtractCapitalCompany, awExtractCapitalCollection, awGetSafeCapitalOutflow } from "../db";
import { safeStorage } from "../safeStorage";

const localStorage = safeStorage;

interface TreasuryProps {
  receipts: Receipt[];
  payments: Payment[];
  expenses: Expense[];
  installments: Installment[];
  authorizedTreasuries?: string[];
  isAdmin?: boolean;
  selectedCompanyId?: string;
  onUpdate?: () => void;
}

const getStoredTreasuries = (companyId?: string): string[] => {
  const defaults = ["خزنة الشركة", "خزنة التحصيل", "خزنة التحويل", "نقاط البيع", "خزنة المقاولات"];
  const suffix = companyId && companyId !== "all" ? `_${companyId}` : "";
  const saved = localStorage.getItem(`aw_treasuries${suffix}`);
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        return arr;
      }
    } catch {}
  }
  try {
    localStorage.setItem(`aw_treasuries${suffix}`, JSON.stringify(defaults));
  } catch {}
  return defaults;
};

export const Treasury: React.FC<TreasuryProps> = ({ receipts, payments, expenses, installments, authorizedTreasuries, isAdmin = false, selectedCompanyId, onUpdate }) => {
  const [treasuries, setTreasuries] = useState<string[]>(() => {
    const list = getStoredTreasuries(selectedCompanyId);
    if (authorizedTreasuries) {
      return list.filter(t => authorizedTreasuries.includes(t));
    }
    return list;
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (authorizedTreasuries && authorizedTreasuries.length > 0) {
      return authorizedTreasuries[0];
    }
    const list = getStoredTreasuries(selectedCompanyId);
    return list[0] || "خزنة الشركة";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [newTreasuryName, setNewTreasuryName] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [editingTreasuryName, setEditingTreasuryName] = useState<string | null>(null);
  const [editInputVal, setEditInputVal] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Reset/Reload treasuries when selectedCompanyId changes
    const list = getStoredTreasuries(selectedCompanyId);
    const filtered = authorizedTreasuries
      ? list.filter(t => authorizedTreasuries.includes(t))
      : list;
    setTreasuries(filtered);
    if (authorizedTreasuries && authorizedTreasuries.length > 0) {
      setActiveTab(authorizedTreasuries[0]);
    } else {
      setActiveTab(filtered[0] || "خزنة الشركة");
    }
  }, [selectedCompanyId, authorizedTreasuries]);

  useEffect(() => {
    // Reload if storage changes in other windows
    const handleStorageChange = () => {
      const freshList = getStoredTreasuries(selectedCompanyId);
      const filtered = authorizedTreasuries
        ? freshList.filter(t => authorizedTreasuries.includes(t))
        : freshList;
      setTreasuries(filtered);
      if (!filtered.includes(activeTab)) {
        setActiveTab(filtered[0] || "خزنة الشركة");
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [activeTab, authorizedTreasuries, selectedCompanyId]);

  // Handle adding a treasury
  const handleAddTreasury = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    const name = newTreasuryName.trim();
    if (!name) return;
    if (treasuries.includes(name)) {
      setInlineError("⚠️ هذه الخزنة مسجلة مسبقاً في النظام!");
      return;
    }
    const updated = [...treasuries, name];
    setTreasuries(updated);
    const suffix = selectedCompanyId && selectedCompanyId !== "all" ? `_${selectedCompanyId}` : "";
    localStorage.setItem(`aw_treasuries${suffix}`, JSON.stringify(updated));
    setNewTreasuryName("");
    // Dispatch to keep Installments synced
    window.dispatchEvent(new Event("storage"));
  };

  const updateNotesTreasury = (notes: string | undefined, oldT: string, newT: string, defaultT: string): string => {
    const text = String(notes || "").trim();
    // Check if contains exact [الخزنة: oldT]
    const escapedOldT = oldT.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\[الخزنة:\\s*${escapedOldT}\\s*\\]`);
    const hasOldExplicit = text.includes(`[الخزنة: ${oldT}]`) || text.match(regex);
    if (hasOldExplicit) {
      const globalRegex = new RegExp(`\\[الخزنة:\\s*${escapedOldT}\\s*\\]`, 'g');
      return text.replace(globalRegex, `[الخزنة: ${newT}]`);
    }
    
    const hasAnyExplicit = text.includes(`[الخزنة:`);
    if (hasAnyExplicit) {
      return text;
    }
    
    if (oldT === defaultT) {
      return `[الخزنة: ${newT}]` + (text ? ` ${text}` : "");
    }
    
    return text;
  };

  const handleEditTreasurySubmit = async (oldName: string) => {
    setInlineError(null);
    const cleanOld = oldName.trim();
    const cleanNew = editInputVal.trim();
    if (!cleanNew) {
      setInlineError("⚠️ اسم الخزنة الجديد لا يمكن أن يكون فارغاً!");
      return;
    }
    if (cleanOld === cleanNew) {
      setEditingTreasuryName(null);
      return;
    }
    if (treasuries.includes(cleanNew) && cleanNew !== cleanOld) {
      setInlineError("⚠️ يوجد خزنة أخرى مسجلة بنفس هذا الاسم!");
      return;
    }

    try {
      setIsUpdating(true);
      
      // 1. Update treasuries list in state & localStorage
      const updated = treasuries.map(t => t === cleanOld ? cleanNew : t);
      setTreasuries(updated);
      const suffix = selectedCompanyId && selectedCompanyId !== "all" ? `_${selectedCompanyId}` : "";
      localStorage.setItem(`aw_treasuries${suffix}`, JSON.stringify(updated));

      // 2. Update existing entries in Database
      // Receipts
      const affectedReceipts = receipts.filter(r => getReceiptTreasury(r) === cleanOld);
      for (const r of affectedReceipts) {
        const updatedNotes = updateNotesTreasury(r.notes, cleanOld, cleanNew, "خزنة التحصيل");
        await sb.from("receipts").update({ notes: updatedNotes }).eq("id", r.id);
      }

      // Payments
      const affectedPayments = payments.filter(p => getPaymentTreasury(p) === cleanOld);
      for (const p of affectedPayments) {
        const updatedNotes = updateNotesTreasury(p.notes, cleanOld, cleanNew, "خزنة الشركة");
        await sb.from("payments").update({ notes: updatedNotes }).eq("id", p.id);
      }

      // Expenses
      const affectedExpenses = expenses.filter(e => getExpenseTreasury(e) === cleanOld);
      for (const e of affectedExpenses) {
        const updatedNotes = updateNotesTreasury(e.notes, cleanOld, cleanNew, "خزنة الشركة");
        await sb.from("expenses").update({ notes: updatedNotes }).eq("id", e.id);
      }

      // Installments
      const affectedInstallments = installments.filter(inst => awExtractTreasury(inst.notes || "") === cleanOld);
      for (const inst of affectedInstallments) {
        const updatedNotes = updateNotesTreasury(inst.notes, cleanOld, cleanNew, "خزنة التحصيل");
        await sb.from("installments").update({ notes: updatedNotes }).eq("id", inst.id);
      }

      // 3. Keep active tab synced if it was renamed
      if (activeTab === cleanOld) {
        setActiveTab(cleanNew);
      }
      
      // 4. Dispatch storage event and trigger reload
      window.dispatchEvent(new Event("storage"));
      if (onUpdate) {
        onUpdate();
      }

      setEditingTreasuryName(null);
    } catch (err: any) {
      setInlineError(`⚠️ حدث خطأ أثناء تعديل الخزنة: ${err.message || err}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle deleting a treasury
  const handleDeleteTreasury = (name: string) => {
    setInlineError(null);
    if (treasuries.length <= 1) {
      setInlineError("⚠️ يجب إبقاء خزنة واحدة على الأقل في النظام لتسجيل المعاملات المالية!");
      return;
    }
    
    // Check if there are active transactions associated with it
    const txCount = getCompiledTransactionsForSafe(name).length;
    let confirmMsg = `هل أنت متأكد من إلغاء وحذف (${name}) نهائياً؟`;
    if (txCount > 0) {
      confirmMsg += `\nتنبيه: تحتوي هذه الخزنة على عدد ${txCount} معاملات نشطة بالدفتر! قد يؤثر حذفها على الترصيد الحسابي.`;
    }

    if (window.confirm(confirmMsg)) {
      const updated = treasuries.filter(t => t !== name);
      setTreasuries(updated);
      const suffix = selectedCompanyId && selectedCompanyId !== "all" ? `_${selectedCompanyId}` : "";
      localStorage.setItem(`aw_treasuries${suffix}`, JSON.stringify(updated));
      if (activeTab === name) {
        setActiveTab(updated[0] || "خزنة الشركة");
      }
      window.dispatchEvent(new Event("storage"));
    }
  };

  // Helper to resolve safe/treasury for any receipt
  const getReceiptTreasury = (r: Receipt): string => {
    const rDirect = awExtractTreasury(r.notes || "");
    if (rDirect) return rDirect;
    const linked = installments.find(inst => inst.id === r.installment_id || inst.no === r.contract_no);
    if (linked) {
      return awExtractTreasury(linked.notes || "") || "خزنة التحصيل";
    }
    return "خزنة التحصيل";
  };

  // Helper for payments
  const getPaymentTreasury = (p: Payment): string => {
    return awExtractTreasury(p.notes || "") || "خزنة الشركة";
  };

  // Helper for expenses
  const getExpenseTreasury = (e: Expense): string => {
    return awExtractTreasury(e.notes || "") || "خزنة الشركة";
  };

  // Calculations per Safe dynamically calculated
  const safeStats = treasuries.map(t => {
    const receiptsOfSafe = receipts.filter(r => getReceiptTreasury(r) === t);
    const paymentsOfSafe = payments.filter(p => getPaymentTreasury(p) === t);
    const expensesOfSafe = expenses.filter(e => getExpenseTreasury(e) === t);
    
    // Capital outflows for contracts belonging to this safe or funded specifically from it
    let capitalOut = 0;
    installments.forEach(x => {
      capitalOut += awGetSafeCapitalOutflow(x.notes || "", t);
    });
    
    const inbound = receiptsOfSafe.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const paymentsOut = paymentsOfSafe.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const expensesOut = expensesOfSafe.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const outbound = paymentsOut + expensesOut + capitalOut;
    const balance = inbound - outbound;
    
    return {
      name: t,
      inbound,
      outbound,
      balance,
      paymentsOut,
      expensesOut,
      capitalOut
    };
  });

  // Calculate transactions for a specific safe
  const getCompiledTransactionsForSafe = (safeName: string) => {
    let items: {
      date: string;
      type: "قبض" | "صرف" | "مصروف" | "رأس مال";
      desc: string;
      inbound: number;
      outbound: number;
      sourceTreasury: string;
    }[] = [];

    receipts.forEach((r) => {
      if (getReceiptTreasury(r) === safeName) {
        items.push({
          date: r.date || "",
          type: "قبض",
          desc: r.from_name ? `${r.from_name} — سند قبض لعقد ${r.contract_no || ""}` : `دفعة عقد ${r.contract_no || ""}`,
          inbound: Number(r.amount || 0),
          outbound: 0,
          sourceTreasury: safeName
        });
      }
    });

    payments.forEach((p) => {
      if (getPaymentTreasury(p) === safeName) {
        items.push({
          date: p.date || "",
          type: "صرف",
          desc: p.to_name ? `سند صرف إلى: ${p.to_name} — مبرر: ${p.notes || "مسجل في الخصم"}` : "سند صرف مالي",
          inbound: 0,
          outbound: Number(p.amount || 0),
          sourceTreasury: safeName
        });
      }
    });

    expenses.forEach((e) => {
      if (getExpenseTreasury(e) === safeName) {
        items.push({
          date: e.date || "",
          type: "مصروف",
          desc: `${e.name || "مصروف"} [${e.category || "عام"}] — المورد: ${e.supplier || "غير مسجل"}`,
          inbound: 0,
          outbound: Number(e.amount || 0),
          sourceTreasury: safeName
        });
      }
    });

    // Add capitals of contracts as outbound flows
    installments.forEach((x) => {
      const applicableCapOutflow = awGetSafeCapitalOutflow(x.notes || "", safeName);
      if (applicableCapOutflow > 0) {
        const source = awExtractCapitalSource(x.notes || "");
        let descSuffix = "";
        
        if (source === "كلاهما") {
          descSuffix = ` [مساهمة تقسيم: ${applicableCapOutflow.toLocaleString()} ريال]`;
        } else if (source === "شركة" && safeName === "خزنة الشركة") {
          descSuffix = " [كامل التمويل من الشركة]";
        } else if (source === "تحصيل" && safeName === "خزنة التحصيل") {
          descSuffix = " [كامل التمويل من التحصيل]";
        } else {
          descSuffix = ` [تمويل من ${safeName}: ${applicableCapOutflow.toLocaleString()} ريال]`;
        }

        items.push({
          date: x.start_date || "",
          type: "رأس مال",
          desc: `تأسيس رأس مال العقد رقم: ${x.no} — العميل: ${x.client}${descSuffix}`,
          inbound: 0,
          outbound: applicableCapOutflow,
          sourceTreasury: safeName
        });
      }
    });

    // Sort ascending to compute chronological running balances
    items.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    let running = 0;
    const itemsWithBalance = items.map((item) => {
      running += (item.inbound - item.outbound);
      return { ...item, balance: running };
    });

    itemsWithBalance.reverse();
    return itemsWithBalance;
  };

  // Compile transactions for active selected safe
  const getFilteredTransactions = () => {
    const rawTxs = getCompiledTransactionsForSafe(activeTab);

    // Filter by search query
    return rawTxs.filter((tx) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        tx.date.includes(q) ||
        tx.type.includes(q) ||
        tx.desc.toLowerCase().includes(q) ||
        String(tx.inbound).includes(q) ||
        String(tx.outbound).includes(q)
      );
    });
  };

  const filteredTxs = getFilteredTransactions();

  const totalBalance = safeStats.reduce((sum, s) => sum + s.balance, 0);
  const totalInbound = safeStats.reduce((sum, s) => sum + s.inbound, 0);
  const totalOutbound = safeStats.reduce((sum, s) => sum + s.outbound, 0);
  const totalCapitalOut = safeStats.reduce((sum, s) => sum + s.capitalOut, 0);

  return (
    <div className="space-y-8" dir="rtl">

      {/* Dynamic Main Consolidated Liquidity Widget */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-900/80 backdrop-blur-xl border border-emerald-500/40 shadow-2xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center justify-center">
                <Wallet className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h4 className="text-sm font-black text-slate-200">الرصيد المشترك الإجمالي لكافة الخزائن</h4>
                <p className="text-[10px] text-slate-400">إجمالي النقدية المتوفرة والمحتسبة بالدفتر في جميع الصناديق</p>
              </div>
            </div>
            
            <div className="pt-2">
              <h2 className="text-4xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-1.5">
                {totalBalance.toLocaleString()} <span className="text-sm font-normal font-sans text-slate-400">ريال سعودي</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="flex-1 min-w-[140px] bg-slate-950/60 rounded-2xl p-4 border border-emerald-500/15 text-right shadow-inner">
              <span className="block text-slate-500 text-[10px] font-black mb-1">وارد الخزائن المشترك</span>
              <b className="text-emerald-400 font-extrabold text-sm font-mono flex items-center justify-start gap-1">
                <span>+</span>{totalInbound.toLocaleString()} <span className="text-[9px] font-sans font-normal text-slate-450">ريال</span>
              </b>
            </div>
            <div className="flex-1 min-w-[140px] bg-slate-950/60 rounded-2xl p-4 border border-rose-500/15 text-right shadow-inner">
              <span className="block text-slate-500 text-[10px] font-black mb-1">صادر الخزائن المشترك</span>
              <b className="text-rose-400 font-extrabold text-sm font-mono flex items-center justify-start gap-1">
                <span>-</span>{totalOutbound.toLocaleString()} <span className="text-[9px] font-sans font-normal text-slate-450">ريال</span>
              </b>
            </div>
            {totalCapitalOut > 0 && (
              <div className="flex-1 min-w-[140px] bg-slate-950/60 rounded-2xl p-4 border border-purple-500/15 text-right shadow-inner">
                <span className="block text-slate-500 text-[10px] font-black mb-1">منها رأس مال ممول</span>
                <b className="text-purple-400 font-extrabold text-sm font-mono flex items-center justify-start gap-1">
                  <span>-</span>{totalCapitalOut.toLocaleString()} <span className="text-[9px] font-sans font-normal text-slate-450">ريال</span>
                </b>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Dynamic Main Premium Glass Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {safeStats.map((stat, idx) => {
          // cyclic styling for dynamic cards based on indices
          const styles = [
            { border: "border-blue-500/30 hover:border-blue-500/50", glow: "bg-blue-500/10", text: "text-blue-300", icon: "text-blue-400" },
            { border: "border-emerald-500/30 hover:border-emerald-500/50", glow: "bg-emerald-500/10", text: "text-emerald-300", icon: "text-emerald-400" },
            { border: "border-amber-500/30 hover:border-amber-500/50", glow: "bg-amber-500/10", text: "text-amber-300", icon: "text-amber-400" },
            { border: "border-purple-500/30 hover:border-purple-500/50", glow: "bg-purple-500/10", text: "text-purple-300", icon: "text-purple-400" },
            { border: "border-rose-500/30 hover:border-rose-500/50", glow: "bg-rose-500/10", text: "text-rose-300", icon: "text-rose-400" }
          ];
          const st = styles[idx % styles.length];

          return (
            <div key={stat.name} className={`relative overflow-hidden rounded-3xl p-6 bg-slate-900/60 backdrop-blur-xl border ${st.border} shadow-xl transition-all duration-300 flex flex-col justify-between`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${st.glow} rounded-full blur-3xl -mr-10 -mt-10`} />
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-xs md:text-sm font-black tracking-wide flex items-center gap-1.5 ${st.text}`}>
                    <Landmark className="w-4 h-4 text-blue-400" /> {stat.name}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white font-mono">
                    {stat.balance.toLocaleString()} <span className="text-xs font-normal font-sans text-slate-400">ريال</span>
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400">الرصيد النشط الفعلي بالدفتر</p>
                </div>
              </div>

              {/* Inflows vs Contract Capital Outflows breakdown */}
              <div className="mt-5 space-y-1.5 text-[11px] bg-slate-950/40 border border-slate-850/80 p-3 rounded-2xl">
                {stat.capitalOut > 0 && (
                  <div className="flex justify-between items-center text-amber-200">
                    <span>رؤوس أموال عقود ممولة:</span>
                    <span className="font-mono font-bold">-{stat.capitalOut.toLocaleString()} ريال</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-400">
                  <span>وارد متحصل وعقود تقسيط:</span>
                  <span className="font-mono text-emerald-400 font-bold">+{stat.inbound.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>سندات صرف ومصاريف أخرى:</span>
                  <span className="font-mono text-rose-400 font-bold">-{(stat.outbound - stat.capitalOut).toLocaleString()} ريال</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between gap-2 text-xs">
                <div className="flex-1 bg-slate-950/20 rounded-xl p-2 text-center border border-slate-850/50">
                  <span className="block text-slate-400 text-[10px] font-semibold mb-1">إجمالي الوارد</span>
                  <b className="text-emerald-400 font-black pr-0.5 font-mono">{stat.inbound.toLocaleString()}</b>
                </div>
                <div className="flex-1 bg-slate-950/20 rounded-xl p-2 text-center border border-slate-850/50">
                  <span className="block text-slate-400 text-[10px] font-semibold mb-1">إجمالي الصادر</span>
                  <b className="text-rose-400 font-black pr-0.5 font-mono">{stat.outbound.toLocaleString()}</b>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs and Filters Box */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        {/* Dynamic tabs list */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-850 w-full md:w-auto flex-wrap gap-1">
          {treasuries.map((tName, idx) => {
            const isActive = activeTab === tName;
            const colorClasses = [
              "bg-blue-600 text-white shadow-lg shadow-blue-500/20",
              "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20",
              "bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20",
              "bg-purple-600 text-white shadow-lg shadow-purple-500/20",
              "bg-rose-600 text-white shadow-lg shadow-rose-500/20"
            ];
            const activeColor = colorClasses[idx % colorClasses.length];

            return (
              <button
                key={tName}
                onClick={() => setActiveTab(tName)}
                className={`flex-grow md:flex-grow-0 px-5 py-2 rounded-lg text-xs md:text-sm font-extrabold select-none transition-all duration-200 ${
                  isActive
                    ? activeColor
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                💼 {tName}
              </button>
            );
          })}
        </div>

        {/* Query Input Box */}
        <div className="relative w-full md:w-72">
          <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="بحث في قيود الخزنة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Transaction Records Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
          📊 كشف حركة حساب الخزنة الحالية ({activeTab})
        </h3>
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-2xl shadow-xl">
          <table className="w-full text-right border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800">
                <th className="py-4 px-4 font-black text-slate-300">التاريخ</th>
                <th className="py-4 px-4 font-black text-slate-300">النوع</th>
                <th className="py-4 px-4 font-black text-slate-300">البيان الشروحات</th>
                <th className="py-4 px-4 font-black text-slate-300">وارد (قبض)</th>
                <th className="py-4 px-4 font-black text-slate-300">صادر (صرف / تمويل)</th>
                <th className="py-4 px-4 font-black text-slate-300">الرصيد المتراكم</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length > 0 ? (
                filteredTxs.map((tx, idx) => {
                  let badgeClass = "";
                  if (tx.type === "قبض") badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  if (tx.type === "صرف") badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  if (tx.type === "مصروف") badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
                  if (tx.type === "رأس مال") badgeClass = "bg-purple-500/10 text-purple-400 border border-purple-500/20";

                  return (
                    <tr
                      key={idx}
                      className="border-b border-slate-850/50 hover:bg-slate-800/10 transition-colors placeholder:text-slate-500"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">{tx.date}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] md:text-xs font-black ${badgeClass}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-bold max-w-xs truncate" title={tx.desc}>
                        {tx.desc}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-400 font-mono">
                        {tx.inbound > 0 ? `+${tx.inbound.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-rose-400 font-mono">
                        {tx.outbound > 0 ? `-${tx.outbound.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-100 font-mono">
                        {tx.balance.toLocaleString()} ريال
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-bold">
                    لا توجد حركات حسابية أو قيود مسجلة في هذه الخزنة بعد تلبي شروط كشف الحساب.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Treasury Management section */}
      {true && (
        <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-850 pb-4">
            <div>
              <h4 className="text-md font-black text-white flex items-center gap-2">
                🛠️ لوحة إدارة وهيكلة خزائن المنظومة النشطة
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك إضافة خزائن وصناديق مالية فرعية جديدة أو حذف الخزائن غير المستخدمة لجعل سياقات المحاسبة ديناميكية بالكامل.
              </p>
            </div>
          </div>

          {inlineError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {inlineError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form to add */}
            <form onSubmit={handleAddTreasury} className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300">تسجيل خزنة مالية جديدة</label>
                <input
                  type="text"
                  placeholder="مثال: خزنة الرياض، خزنة النقد الاحتياطي..."
                  value={newTreasuryName}
                  onChange={(e) => {
                    setNewTreasuryName(e.target.value);
                    setInlineError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> إضافة الخزنة المقترحة للقائمة
              </button>
            </form>

            {/* List and delete */}
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-4">
              <span className="block text-xs font-black text-slate-300">الخزائن المعرفة بالبرنامج حالياً</span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {treasuries.map((name) => {
                  const txCount = getCompiledTransactionsForSafe(name).length;
                  return (
                    <div key={name} className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                      <div className="flex items-center gap-2 flex-grow">
                        <Coins className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {editingTreasuryName === name ? (
                          <div className="flex items-center gap-2 flex-grow ml-2" dir="rtl">
                            <input
                              type="text"
                              value={editInputVal}
                              onChange={(e) => setEditInputVal(e.target.value)}
                              disabled={isUpdating}
                              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 w-full"
                            />
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleEditTreasurySubmit(name)}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition-colors cursor-pointer"
                              title="حفظ التعديل"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => setEditingTreasuryName(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-750 transition-colors cursor-pointer"
                              title="إلغاء التعديل"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-black text-white">{name}</span>
                            <span className="block text-[9px] text-slate-500">تحتوي على عدد {txCount} قيد بالدفتر</span>
                          </div>
                        )}
                      </div>
                      
                      {editingTreasuryName !== name && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTreasuryName(name);
                              setEditInputVal(name);
                            }}
                            className="p-1 px-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 hover:text-blue-300 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="تعديل اسم الخزنة"
                          >
                            <Edit2 className="w-3 h-3" /> تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTreasury(name)}
                            className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="حذف وإلغاء هذه الخزنة من القائمة"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
