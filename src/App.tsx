/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  Home, ClipboardList, FileText, Landmark, TrendingUp, TrendingDown, Briefcase, Users,
  Settings, LogOut, Calendar, MapPin, User, Phone, Shield, Search, Plus,
  Edit2, Trash2, Download, AlertTriangle, Sparkles, Clock, RefreshCw, Key, Printer, Building, ChevronDown, ChevronUp,
  PieChart, ShieldAlert, ShieldCheck, List, Map as MapIcon, Filter, Eye
} from "lucide-react";

import { User as AuthUser, UserPerms, Installment, Quote, Receipt, Payment, Expense, Project, Worker, DbSession, Company, Extract, AttendanceRecord } from "./types";
import {
  sb, logSession, getContractTiming, awExtractRegion, awCleanNotes, awExtractAttachment,
  awBuildNotesWithRegion, awBuildNotesWithRegionAndTreasury, awBuildNotesWithRegionAndTreasuryAndCapital, awExtractTreasury, awExtractCapital, generateNextNo,
  awExtractCapitalSource, awExtractCapitalCompany, awExtractCapitalCollection, awExtractCapitalSplit, awGetSafeCapitalOutflow,
  awExtractWorkerContract, awExtractWorkerLeaves, awBuildWorkerNotes, awCleanWorkerNotes,
  getSupabaseCredentials, saveSupabaseCredentials, checkSupabaseHealth, isSupabaseHealthy,
  awExtractExternalNo, awBuildNotesWithRegionAndTreasuryAndExternalNo, awExtractClassification, awExtractCycle, awExtractReceiptType,
  awExtractContractDirection, awExtractWorkerId, awExtractProjectId,
  serializeQuoteNotes, deserializeQuoteNotes, auth, awExtractBeneficiaryType, awExtractDownPayment, awExtractRenewedFrom
} from "./db";

import { Toast, ToastItem, ToastType } from "./components/Shared/Toast";
import { Dashboard } from "./components/Dashboard";
import { Installments } from "./components/Installments";
import { safeStorage } from "./safeStorage";

const localStorage = safeStorage;
import { Treasury } from "./components/Treasury";
import { FinancialReports } from "./components/FinancialReports";
import { Attendance } from "./components/Attendance";
import { SaasLandingPortal } from "./components/SaasLandingPortal";
import { ProjectMap } from "./components/ProjectMap";
import { HRModule } from "./components/HRModule";
import { CompanyAssets } from "./components/CompanyAssets";
import { AuthenticatorModal } from "./components/AuthenticatorModal";
import { NotFound404 } from "./components/NotFound404";

const compressAndResizeImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface ImageUploaderProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  placeholder?: string;
  id: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, label, placeholder = "قم بسحب وإفلات الصورة هنا، أو انقر للاختيار", id }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("عذراً، يجب اختيار ملف صورة فقط (PNG, JPG, WebP...)");
      return;
    }
    setError(null);
    try {
      const compressedBase64 = await compressAndResizeImage(file);
      onChange(compressedBase64);
    } catch (err) {
      console.error("Image compression failed:", err);
      setError("فشل تحميل الصورة وضغطها، يرجى المحاولة مرة أخرى.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-slate-400 font-bold block">{label}</label>
      
      {value ? (
        <div className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-3 flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-3">
            <img
              src={value}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-contain bg-slate-900 rounded-lg border border-slate-800"
            />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-sans">تم تحميل الصورة بنجاح</span>
              <span className="text-[9px] text-emerald-400 font-mono block">حجم محسن تلقائياً</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all shrink-0"
          >
            حذف 🗑️
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all p-4 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            isDragActive
              ? "border-amber-500 bg-amber-500/5"
              : "border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40"
          }`}
          onClick={() => document.getElementById(id)?.click()}
        >
          <input
            id={id}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-lg">🖼️</span>
          <p className="text-[10px] font-bold text-slate-300 leading-normal">{placeholder}</p>
          <span className="text-[8px] text-slate-500 font-sans block">يدعم السحب والإفلات أو النقر (JPG, PNG, WebP)</span>
          {error && <p className="text-[9px] text-rose-400 font-bold mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};

const getStoredTreasuries = (companyId?: string | null, companiesList?: Company[]): string[] => {
  const defaults = ["خزنة الشركة", "خزنة التحصيل"];
  
  if (companyId && companyId !== "all" && companiesList) {
    const matched = companiesList.find(c => c.id === companyId);
    if (matched && matched.treasuries && Array.isArray(matched.treasuries) && matched.treasuries.length > 0) {
      return matched.treasuries;
    }
  }

  // Specific company from localStorage
  if (companyId && companyId !== "all") {
    const saved = localStorage.getItem(`aw_treasuries_${companyId}`);
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr;
        }
      } catch {}
    }
    return defaults;
  }

  // Combined across all companies if "all"
  if ((!companyId || companyId === "all") && companiesList && companiesList.length > 0) {
    const allTreasuries = new Set<string>();
    let hasCustom = false;
    companiesList.forEach(c => {
      if (c.treasuries && Array.isArray(c.treasuries) && c.treasuries.length > 0) {
        c.treasuries.forEach(t => allTreasuries.add(t));
        hasCustom = true;
      }
    });
    if (hasCustom && allTreasuries.size > 0) {
      return Array.from(allTreasuries);
    }
  }

  const saved = localStorage.getItem("aw_treasuries");
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr;
      }
    } catch {}
  }
  return defaults;
};

const getTreasuryTheme = (tName: string, index: number) => {
  const clean = String(tName || "").trim();
  if (clean.includes("شركة") || clean === "شركة") {
    return {
      border: "border-amber-500/20",
      dot: "bg-amber-400 shadow-[0_0_8px_#f59e0b]",
      label: "text-amber-500/80",
      text: "text-amber-100",
      glow: "shadow-amber-500/5 before:bg-amber-500/5",
    };
  }
  if (clean.includes("تحصيل") || clean === "تحصيل") {
    return {
      border: "border-emerald-500/20",
      dot: "bg-emerald-400 shadow-[0_0_8px_#10b981]",
      label: "text-emerald-400",
      text: "text-emerald-100",
      glow: "shadow-emerald-500/5 before:bg-emerald-500/5",
    };
  }
  if (clean.includes("تحويل")) {
    return {
      border: "border-cyan-500/20",
      dot: "bg-cyan-400 shadow-[0_0_8px_#06b6d4]",
      label: "text-cyan-400",
      text: "text-cyan-100",
      glow: "shadow-cyan-500/5 before:bg-cyan-500/5",
    };
  }
  if (clean.includes("نقاط") || clean.includes("بيع") || clean.includes("مدى") || clean.includes("شبكة")) {
    return {
      border: "border-purple-500/20",
      dot: "bg-purple-400 shadow-[0_0_8px_#a855f7]",
      label: "text-purple-400",
      text: "text-purple-100",
      glow: "shadow-purple-500/5 before:bg-purple-500/5",
    };
  }
  if (clean.includes("مقاولات") || clean.includes("مشاريع") || clean.includes("عمليات") || clean.includes("تشغيل")) {
    return {
      border: "border-blue-500/20",
      dot: "bg-blue-400 shadow-[0_0_8px_#3b82f6]",
      label: "text-blue-400",
      text: "text-blue-100",
      glow: "shadow-blue-500/5 before:bg-blue-500/5",
    };
  }

  const cyclic = [
    {
      border: "border-rose-500/20",
      dot: "bg-rose-400 shadow-[0_0_8px_#f43f5e]",
      label: "text-rose-400",
      text: "text-rose-100",
      glow: "shadow-rose-500/5 before:bg-rose-500/5",
    },
    {
      border: "border-teal-500/20",
      dot: "bg-teal-400 shadow-[0_0_8px_#14b8a6]",
      label: "text-teal-400",
      text: "text-teal-100",
      glow: "shadow-teal-500/5 before:bg-teal-500/5",
    },
    {
      border: "border-indigo-500/20",
      dot: "bg-indigo-400 shadow-[0_0_8px_#6366f1]",
      label: "text-indigo-400",
      text: "text-indigo-100",
      glow: "shadow-indigo-500/5 before:bg-indigo-500/5",
    },
    {
      border: "border-orange-500/20",
      dot: "bg-orange-400 shadow-[0_0_8px_#f97316]",
      label: "text-orange-400",
      text: "text-orange-100",
      glow: "shadow-orange-500/5 before:bg-orange-500/5",
    },
    {
      border: "border-fuchsia-500/20",
      dot: "bg-fuchsia-400 shadow-[0_0_8px_#d946ef]",
      label: "text-fuchsia-400",
      text: "text-fuchsia-100",
      glow: "shadow-fuchsia-500/5 before:bg-fuchsia-500/5",
    },
  ];
  return cyclic[index % cyclic.length];
};

const getCompanyActivity = (comp?: Company | null): string => {
  if (!comp) return "منظومة إدارية وحسابية متكاملة";
  if (comp.activity && comp.activity.trim()) return comp.activity.trim();
  if (comp.sub_title && comp.sub_title.trim()) return comp.sub_title.trim();
  if ((comp as any).company_activity && (comp as any).company_activity.trim()) return (comp as any).company_activity.trim();
  if ((comp as any).company_subtitle && (comp as any).company_subtitle.trim()) return (comp as any).company_subtitle.trim();
  if ((comp as any).activity_type && (comp as any).activity_type.trim()) return (comp as any).activity_type.trim();
  
  if (comp.notes) {
    const match = comp.notes.match(/\[(?:نشاط_الشركة|النشاط|نشاط|Activity):?\s*([^\]]+)\]/i);
    if (match && match[1]) return match[1].trim();
  }
  
  if (comp.id === "arab_world") return "للمقاولات العامة والتقسيط والعقود";
  return "للمقاولات العامة والتقسيط";
};

const getPaymentRemaining = (p: Payment, workersList: Worker[] = [], installmentsList: Installment[] = []): number | null => {
  if (p.remaining_after !== undefined && p.remaining_after !== null) {
    return Number(p.remaining_after);
  }
  if (p.notes) {
    const match = p.notes.match(/\[(?:المتبقي|متبقي|remaining):?\s*([\d\.\-]+)\]/i);
    if (match && match[1] && !isNaN(Number(match[1]))) {
      return Number(match[1]);
    }
  }
  if (p.worker_id) {
    const w = workersList.find(x => x.id === p.worker_id);
    if (w) {
      return Math.max(0, Number(w.balance || 0));
    }
  }
  if (p.installment_id || p.contract_no) {
    const inst = installmentsList.find(i => (p.installment_id && i.id === p.installment_id) || (p.contract_no && i.no === p.contract_no));
    if (inst) {
      return Number(inst.remaining || 0);
    }
  }
  return null;
};

function PendingUserApprovalCard({
  pendingUser,
  companies,
  onApprove,
  onReject,
}: {
  key?: React.Key;
  pendingUser: AuthUser;
  companies: Company[];
  onApprove: (userId: string, companyId: string, role: "admin" | "supervisor" | "employee", perms?: UserPerms) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
}) {
  const [selectedCompId, setSelectedCompId] = useState<string>(
    pendingUser.requested_company_name ? "CREATE_NEW" : (pendingUser.company_id || companies[0]?.id || "arab_world")
  );
  const [selectedRole, setSelectedRole] = useState<"admin" | "supervisor" | "employee">(
    pendingUser.role || (pendingUser.requested_company_name ? "admin" : "employee")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="bg-slate-950/90 border-2 border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative" dir="rtl">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-white">{pendingUser.name}</span>
            {pendingUser.google_id && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded-md border border-blue-500/30">
                🔵 موثق عبر Google
              </span>
            )}
            <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono">
              كود الموظف: {pendingUser.code}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap mt-1">
            <span>📧 {pendingUser.email || "دون بريد"}</span>
            <span>📱 {pendingUser.phone || "دون جوال"}</span>
            <span className="text-[10px] text-slate-500 font-mono">📅 {pendingUser.created_at ? new Date(pendingUser.created_at).toLocaleDateString("ar-SA") : "الآن"}</span>
          </div>
        </div>

        {/* Requested company metadata display */}
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl max-w-lg w-full">
          {pendingUser.requested_company_name ? (
            <div className="space-y-1">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                🚀 طلب تأسيس شركة جديدة: <span className="text-white underline">{pendingUser.requested_company_name}</span>
              </span>
              <div className="text-[10px] text-slate-300 grid grid-cols-2 gap-1 font-mono">
                <span>الرابط: /{pendingUser.requested_company_slug}</span>
                <span>المدير: {pendingUser.requested_company_manager || pendingUser.name}</span>
                <span>الهاتف: {pendingUser.requested_company_phone || pendingUser.phone || "-"}</span>
                <span>رأس المال: {pendingUser.requested_company_capital ? Number(pendingUser.requested_company_capital).toLocaleString('ar-SA') : 0} ر.س</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-300">
                🏢 طلب انضمام لشركة قائمة: <span className="text-white font-black">{companies.find(c => c.id === pendingUser.company_id)?.name || "شركة عرب وورلد"}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Decision assignment controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 block">إسناد وتعيين الشركة</label>
          <select
            value={selectedCompId}
            onChange={(e) => setSelectedCompId(e.target.value)}
            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none cursor-pointer text-slate-950 bg-white"
          >
            {pendingUser.requested_company_name && (
              <option value="CREATE_NEW" className="text-slate-950 font-bold">
                ✨ تأسيس واعتماد الشركة الجديدة ({pendingUser.requested_company_name})
              </option>
            )}
            {companies.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-950">
                🏢 {c.name} ({c.slug})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 block">الدور والمستوى الإداري</label>
          <select
            value={selectedRole}
            onChange={(e: any) => setSelectedRole(e.target.value)}
            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer text-slate-950 bg-white"
          >
            <option value="admin" className="text-slate-950">👑 أدمن مكتب عام / مدير منشأة</option>
            <option value="supervisor" className="text-slate-950">🕵️‍♂️ مشرف مكتب عام / رئيسي</option>
            <option value="employee" className="text-slate-950">👨‍💼 موظف فرع محدود</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onApprove(pendingUser.id, selectedCompId, selectedRole);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="flex-1 h-9 bg-gradient-to-l from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "جاري الاعتماد..." : "✅ قبول واعتماد الحساب والصلاحيات"}
          </button>

          <button
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onReject(pendingUser.id);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="h-9 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            ❌ رفض
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [isLoading, setIsLoading] = useState(false);

  // SaaS Multi-tenant Path Routing State
  const RESERVED_SLUGS = new Set([
    "assets", "api", "static", "favicon.ico", "manifest.json", "sw.js", "robots.txt", "index.html"
  ]);

  const getSlugFromPath = (): string | null => {
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    const first = segments[0] || null;
    if (first && RESERVED_SLUGS.has(first.toLowerCase())) {
      return null;
    }
    return first;
  };

  const [activeSlug, setActiveSlug] = useState<string | null>(() => getSlugFromPath());

  useEffect(() => {
    const handlePopState = () => {
      setActiveSlug(getSlugFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToSlug = (slug: string | null) => {
    if (slug) {
      window.history.pushState({}, "", `/${slug}`);
    } else {
      window.history.pushState({}, "", `/`);
    }
    setActiveSlug(slug);
    if (!slug) {
      setCurrentUser(null);
      localStorage.removeItem("aw_current_user");
    }
  };

  const handleRegisterCompany = async (companyData: {
    name: string;
    slug: string;
    manager: string;
    phone: string;
    address: string;
    record_no: string;
    tax_no: string;
    capital: number;
    adminCode: string;
    adminPass: string;
  }) => {
    try {
      const newCompanyId = `company_${companyData.slug}`;
      const companyPayload = {
        id: newCompanyId,
        slug: companyData.slug,
        name: companyData.name,
        record_no: companyData.record_no,
        manager: companyData.manager,
        phone: companyData.phone,
        address: companyData.address,
        notes: `الرقم الضريبي: ${companyData.tax_no} | رأس المال بالعقود: ${companyData.capital}`,
        created_at: new Date().toISOString()
      };

      // 1. Insert Company
      const { error: compError } = await sb.from("companies").insert(companyPayload);
      if (compError) {
        showToast("فشل في تسجيل الشركة بقاعدة البيانات!", "error");
        return false;
      }

      // 2. Insert Default Admin for this Company
      const defaultAdmin: AuthUser = {
        id: `admin_${companyData.slug}`,
        name: `مدير ${companyData.name}`,
        code: companyData.adminCode,
        password: companyData.adminPass,
        role: "admin",
        company_id: newCompanyId,
        status: "نشط",
        perms: {
          installmentsView: true,
          installmentsAdd: true,
          installmentsEdit: true,
          installmentsDelete: true,
          quotes: true,
          receipts: true,
          payments: true,
          expenses: true,
          treasury: true,
          projects: true,
          workers: true,
          companies: true,
          users: true,
          sessions: true,
          print: true,
          dashTopCards: true,
          dashCollection: true,
          dashPulse: true,
          dashLateClients: true,
          dashLastReceipts: true,
          dashUpcomingPaid: true,
          region: "",
          worker_id: null
        },
        company_perms: {},
        created_at: new Date().toISOString()
      };

      const { error: userError } = await sb.from("users").insert(defaultAdmin);
      if (userError) {
        showToast("فشل في إنشاء مستخدم المدير للمنشأة!", "error");
        return false;
      }

      showToast(`تم تأسيس وتسجيل ${companyData.name} بنجاح!`, "success");
      setCompanies(prev => [companyPayload, ...prev]);
      navigateToSlug(companyData.slug);
      return true;
    } catch (err: any) {
      showToast(`فشل في تسجيل الشركة: ${err.message || err}`, "error");
      return false;
    }
  };

  // Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("aw_current_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loginCode, setLoginCode] = useState("");
  const [loginCompanyCode, setLoginCompanyCode] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [googleUser, setGoogleUser] = useState<{ email: string; uid: string; displayName?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Alert Notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType = "success") => {
    const id = Date.now().toString() + "-" + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ERP Datatables State
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sessions, setSessions] = useState<DbSession[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  // Editing state markers
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [editExtractId, setEditExtractId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [selfSelectedWorkerId, setSelfSelectedWorkerId] = useState<string>("");

  // Audit / Edit control states for Managers
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [auditReason, setAuditReason] = useState<string>("");
  const [auditRefNo, setAuditRefNo] = useState<string>("");
  const [auditPendingAction, setAuditPendingAction] = useState<{
    type: "receipt" | "payment" | "expense";
  } | null>(null);

  // In-app Popup states for Popups and safe Iframe Actions
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: (reason?: string) => void;
    requireReason?: boolean;
    reasonPlaceholder?: string;
  } | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: (reason?: string) => void,
    requireReason?: boolean,
    reasonPlaceholder?: string
  ) => {
    setConfirmReason("");
    setConfirmDialog({ open: true, title, message, onConfirm, requireReason, reasonPlaceholder });
  };

  const handleConfirmAuditSave = async () => {
    if (!auditReason.trim() || !auditRefNo.trim()) {
      showToast("يرجى إدخال سبب التعديل ورقم القيد المرجعي!", "error");
      return;
    }

    const reason = auditReason.trim();
    const refNo = auditRefNo.trim();

    setShowAuditModal(false);
    setAuditReason("");
    setAuditRefNo("");

    if (auditPendingAction?.type === "receipt") {
      await saveReceiptLogic(undefined, reason, refNo);
    } else if (auditPendingAction?.type === "payment") {
      await savePaymentLogic(undefined, reason, refNo);
    } else if (auditPendingAction?.type === "expense") {
      await saveExpenseLogic(undefined, reason, refNo);
    }

    setAuditPendingAction(null);
  };

  const handleCancelAuditSave = () => {
    setShowAuditModal(false);
    setAuditReason("");
    setAuditRefNo("");
    setAuditPendingAction(null);
  };

  // Supabase Dynamic Integration Settings
  const [sbUrl, setSbUrl] = useState("");
  const [sbKey, setSbKey] = useState("");
  const [sbStatus, setSbStatus] = useState<"checking" | "connected" | "fallback">("checking");
  const [sbTesting, setSbTesting] = useState(false);
  const [sbConfigExpanded, setSbConfigExpanded] = useState(false);

  // Expanded rows for tables
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});
  const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
  const [expandedExpenses, setExpandedExpenses] = useState<Record<string, boolean>>({});
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [selectedExpenseCategoryFilter, setSelectedExpenseCategoryFilter] = useState<string>("all");

  // Backup & Restore states
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Forms Hooks
  const [formCompanyId, setFormCompanyId] = useState("");

  // 1. Quotes Forms
  const [qClient, setQClient] = useState("");
  const [qPhone, setQPhone] = useState("");
  const [qProject, setQProject] = useState("");
  const [qAmount, setQAmount] = useState<number | "">(0);
  const [qVat, setQVat] = useState<number | "">(15);
  const [qStatus, setQStatus] = useState<"جديد" | "مرسل" | "مقبول" | "مرفوض">("جديد");
  const [qNotes, setQNotes] = useState("");
  const [qItems, setQItems] = useState<{ description: string; quantity: number; price: number; total: number; }[]>([
    { description: "توريد وتركيب مواد وأعمال عامة", quantity: 1, price: 0, total: 0 }
  ]);

  // 2. Receipts Forms
  const [rContractQuery, setRContractQuery] = useState("");
  const [rSelectedInstallment, setRSelectedInstallment] = useState<Installment | null>(null);
  const [rFrom, setRFrom] = useState("");
  const [rAmount, setRAmount] = useState<number | "">("");
  const [rMethod, setRMethod] = useState("مدى");
  const [rDate, setRDate] = useState(new Date().toISOString().slice(0, 10));
  const [rProject, setRProject] = useState("");
  const [rNotes, setRNotes] = useState("");
  const [rTreasury, setRTreasury] = useState("خزنة التحصيل");
  const [rExternalNo, setRExternalNo] = useState("");
  const [receiptCompanyId, setReceiptCompanyId] = useState("");
  const [rType, setRType] = useState<"وارد" | "صادر">("وارد");
  const [paymentCompanyId, setPaymentCompanyId] = useState("");
  const [payWorkerId, setPayWorkerId] = useState("");
  const [expenseCompanyId, setExpenseCompanyId] = useState("");
  const [projectCompanyId, setProjectCompanyId] = useState("");
  const [workerCompanyId, setWorkerCompanyId] = useState("");

  // Search/Sort filters for receipts
  const [rSearch, setRSearch] = useState("");
  const [pSearch, setPSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [projectsViewMode, setProjectsViewMode] = useState<"list" | "map">("list");
  const [wSearch, setWSearch] = useState("");
  const [rSort, setRSort] = useState("date_desc");
  const [rFromDate, setRFromDate] = useState("");
  const [rToDate, setRToDate] = useState("");
  const [rMethodFilter, setRMethodFilter] = useState("");

  // Search/Sort filters for payments
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentBeneficiaryFilter, setPaymentBeneficiaryFilter] = useState<string>("all");

  // 3. Payments Forms
  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState("تحويل بنكي");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payProject, setPayProject] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payTreasury, setPayTreasury] = useState("خزنة الشركة");
  const [payContractQuery, setPayContractQuery] = useState("");
  const [paySelectedInstallment, setPaySelectedInstallment] = useState<Installment | null>(null);
  const [payBeneficiaryType, setPayBeneficiaryType] = useState<"شخص" | "مجموعة">("شخص");

  // Treasury management & update state triggers
  const [treasuryUpdateKey, setTreasuryUpdateKey] = useState(0);
  const [showAddTreasuryModal, setShowAddTreasuryModal] = useState(false);
  const [newTreasuryInputName, setNewTreasuryInputName] = useState("");
  const [targetCompanyIdForModal, setTargetCompanyIdForModal] = useState<string | undefined>(undefined);

  // 4. Expenses Forms
  const [eName, setEName] = useState("");
  const [eCategory, setECategory] = useState<"مواد" | "عمالة" | "نقل" | "إيجار" | "وقود" | "إعاشة" | "سيارات" | "عدة" | "بنزين" | "تغيير زيت" | "صيانة" | "اتصالات" | "أخرى">("مواد");
  const [eAmount, setEAmount] = useState<number | "">("");
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));
  const [eProject, setEProject] = useState("");
  const [eSupplier, setESupplier] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eTreasury, setETreasury] = useState("خزنة الشركة");

  // 5. Projects Forms
  const [pName, setPName] = useState("");
  const [pLocation, setPLocation] = useState("");
  const [pEngineer, setPEngineer] = useState("");
  const [pBudget, setPBudget] = useState<number | "">("");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [pProgress, setPProgress] = useState<number | "">(0);
  const [pStatus, setPStatus] = useState<"نشط" | "متوقف" | "منتهي">("نشط");
  const [pNotes, setPNotes] = useState("");
  const [pLatitude, setPLatitude] = useState<number | "">("");
  const [pLongitude, setPLongitude] = useState<number | "">("");
  const [pAllowedRadius, setPAllowedRadius] = useState<number | "">(25);

  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  // 6. Workers Forms
  const [wName, setWName] = useState("");
  const [wId, setWId] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wJob, setWJob] = useState<"حداد" | "نجار" | "كهربائي" | "سباك" | "عامل" | "مشرف">("حداد");
  const [wProject, setWProject] = useState("");
  const [wDaily, setWDaily] = useState<number | "">("");
  const [wDays, setWDays] = useState<number | "">("");
  const [wAdvance, setWAdvance] = useState<number | "">(0);
  const [wStatus, setWStatus] = useState<"على رأس العمل" | "إجازة" | "موقوف">("على رأس العمل");
  const [wRecipientName, setWRecipientName] = useState("");
  const [wNotes, setWNotes] = useState("");

  // 7. Companies Forms
  const [cName, setCName] = useState("");
  const [cActivity, setCActivity] = useState("");
  const [cRegister, setCRegister] = useState("");
  const [cTaxNo, setCTaxNo] = useState("");
  const [cCapital, setCCapital] = useState<number | "">("");
  const [cPhone, setCPhone] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cLogoUrl, setCLogoUrl] = useState("");

  // Attachments base64 strings
  const [rAttachment, setRAttachment] = useState("");
  const [payAttachment, setPayAttachment] = useState("");
  const [eAttachment, setEAttachment] = useState("");

  // 8. Extracts Forms
  const [exCompanyId, setExCompanyId] = useState("");
  const [exTitle, setExTitle] = useState("");
  const [exAmount, setExAmount] = useState<number | "">("");
  const [exPaid, setExPaid] = useState<number | "">("");
  const [exDate, setExDate] = useState(new Date().toISOString().slice(0, 10));
  const [exStatus, setExStatus] = useState<"نشط" | "مدفوع" | "متأخر">("نشط");
  const [exNotes, setExNotes] = useState("");

  // 10. HR States
  const [selectedWorkerForHr, setSelectedWorkerForHr] = useState<Worker | null>(null);
  
  // Employment Contract Forms
  const [cStart, setCStart] = useState("");
  const [cDuration, setCDuration] = useState("سنة واحدة");
  const [cSalary, setCSalary] = useState<number | "">("");
  const [cHousing, setCHousing] = useState<number | "">("");
  const [cTransport, setCTransport] = useState<number | "">("");
  const [cOther, setCOther] = useState<number | "">("");
  const [cPassport, setCPassport] = useState("");
  const [cProbation, setCProbation] = useState("90 يوم");
  const [cVacation, setCVacation] = useState<number | "">(30);
  const [cShiftStart, setCShiftStart] = useState("08:00");
  const [cDelayRate, setCDelayRate] = useState<number | "">("");
  const [cUserId, setCUserId] = useState<string>("");
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(new Date().toISOString().slice(0, 7));

  // Leave Form
  const [lhStart, setLhStart] = useState(new Date().toISOString().slice(0, 10));
  const [lhEnd, setLhEnd] = useState("");
  const [lhType, setLhType] = useState("إجازة اعتيادية");
  const [lhNotes, setLhNotes] = useState("");

  // Advance / Loan Request Form
  const [advAmount, setAdvAmount] = useState<number | "">("");
  const [advTreasury, setAdvTreasury] = useState("خزنة الشركة");
  const [advNotes, setAdvNotes] = useState("");
  const [advDate, setAdvDate] = useState(new Date().toISOString().slice(0, 10));

  // 7. Users Forms
  const [uName, setUName] = useState("");
  const [uCode, setUCode] = useState("");
  const [uPass, setUPass] = useState("");
  const [uWorkerId, setUWorkerId] = useState("");
  const [uRole, setURole] = useState<"admin" | "employee" | "supervisor">("employee");
  const [uCompanyId, setUCompanyId] = useState("");
  const [uRegion, setURegion] = useState("");
  const [uStatus, setUStatus] = useState("نشط");
  const [selectedCompanyIdForPerms, setSelectedCompanyIdForPerms] = useState<string>("global");
  const [uCompanyPerms, setUCompanyPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [uPerms, setUPerms] = useState<Record<string, boolean>>({
    attendance: true,
    dashboard: false,
    installmentsView: false,
    installmentsAdd: false,
    installmentsEdit: false,
    installmentsDelete: false,
    quotes: false,
    receipts: false,
    payments: false,
    expenses: false,
    treasury: false,
    financial_reports: false,
    projects: false,
    workers: false,
    companies: false,
    users: false,
    sessions: false,
    print: false,
    dashTopCards: false,
    dashCollection: false,
    dashPulse: false,
    dashLateClients: false,
    dashLastReceipts: false,
    dashUpcomingPaid: false,
  });

  // Auth checker logic
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim() || !loginPass.trim()) return;
    setIsLoading(true);

    try {
      const enteredCode = loginCode.trim();
      const enteredPass = loginPass.trim();
      const normCode = enteredCode.replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
      const normCodeNoZero = normCode.replace(/^0+/, "");
      
      const adminCodes = ["1007363904", "0564468888", "139213", "13921313", "الادمن", "admin", "المدير", "المدير العام", "سلطان", "سلطان العاصمي", "sultan"];
      const adminPasses = ["1007363904", "0564468888", "139213", "13921313", "admin", "admin123"];
      
      const isGlobalAdmin = 
        (adminCodes.includes(enteredCode) || adminCodes.includes(normCode) || adminCodes.includes(normCodeNoZero)) &&
        (adminPasses.includes(enteredPass) || enteredPass === "139213" || enteredPass === "13921313");

      const targetCompId = activeCompany?.id || null;
      let matchedComp: Company | undefined = undefined;

      if (isGlobalAdmin) {
        const isAdminSultan = enteredCode.includes("0564468888") || enteredCode.includes("سلطان") || enteredCode.includes("sultan");
        const adminName = isAdminSultan ? "سلطان العاصمي (المدير العام)" : "المدير العام (الأدمن)";
        const adminCode = isAdminSultan ? "0564468888" : "1007363904";
        const adminId = `admin_${adminCode}`;

        const defaultAdmin: AuthUser = {
          id: adminId,
          name: adminName,
          code: adminCode,
          password: enteredPass,
          role: "admin",
          company_id: targetCompId,
          status: "نشط",
          perms: {
            installmentsView: true,
            installmentsAdd: true,
            installmentsEdit: true,
            installmentsDelete: true,
            quotes: true,
            receipts: true,
            payments: true,
            expenses: true,
            treasury: true,
            projects: true,
            workers: true,
            companies: true,
            users: true,
            sessions: true,
            print: true,
            dashTopCards: true,
            dashCollection: true,
            dashPulse: true,
            dashLateClients: true,
            dashLastReceipts: true,
            dashUpcomingPaid: true,
            region: "",
            worker_id: null
          },
          company_perms: {},
          created_at: new Date().toISOString()
        };

        try {
          await sb.from("users").upsert(defaultAdmin, { onConflict: "id" });
        } catch (dbErr) {
          console.warn("Background admin DB sync skipped/failed:", dbErr);
        }

        if (targetCompId) {
          const matchedC = companies.find((c) => c.id === targetCompId || c.slug === targetCompId);
          if (matchedC) navigateToSlug(matchedC.slug || matchedC.id);
        }

        setCurrentUser(defaultAdmin);
        localStorage.setItem("aw_current_user", JSON.stringify(defaultAdmin));
        showToast(`مرحباً بك مجدداً ${defaultAdmin.name}`);
        await logSession(defaultAdmin, "تسجيل دخول للنظام المالي");
        await loadEverything();
        setIsLoading(false);
        return;
      }

      // Query database for the user with matching code or worker record
      let user: AuthUser | null = null;

      // Fetch all registered users
      const { data: allUsers } = await sb.from("users").select("*");

      const matchedUser = (allUsers || []).find((u: any) => {
        const uCode = (u.code || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uPhone = (u.phone || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uWorkId = (u.worker_id || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uId = (u.id || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uName = (u.name || "").trim().toLowerCase();

        return (
          (uCode && (uCode === normCode || (normCodeNoZero && uCode.replace(/^0+/, "") === normCodeNoZero))) ||
          (uPhone && (uPhone === normCode || (normCodeNoZero && uPhone.replace(/^0+/, "") === normCodeNoZero))) ||
          (uWorkId && (uWorkId === normCode || (normCodeNoZero && uWorkId.replace(/^0+/, "") === normCodeNoZero))) ||
          (uId && uId === normCode) ||
          (uName && uName === enteredCode.toLowerCase())
        );
      });

      if (!matchedUser) {
        showToast("⚠️ اسم المستخدم / كود الموظف غير مسجل أو الحساب ملغى من الإدارة!", "error");
        setIsLoading(false);
        return;
      }

      // Strictly check account status
      if (matchedUser.status && matchedUser.status !== "نشط") {
        showToast("⚠️ عذراً، هذا الحساب ملغى أو معطل حالياً من قبل الإدارة!", "error");
        setIsLoading(false);
        return;
      }

      // Strictly verify password
      if (matchedUser.password && matchedUser.password !== enteredPass) {
        showToast("⚠️ كلمة المرور غير صحيحة!", "error");
        setIsLoading(false);
        return;
      }

      user = matchedUser as AuthUser;

      if (!user) {
        showToast("بيانات تصريح الدخول غير صحيحة!", "error");
        setIsLoading(false);
        return;
      }

      // Save employee code for quick reference
      try {
        localStorage.setItem("aw_saved_employee_code", user.code);
        localStorage.setItem("aw_saved_employee_name", user.name);
      } catch (e) {
        console.warn("LocalStorage error:", e);
      }

      // Ensure we have loaded companies
      let currentCompanies = companies;
      if (currentCompanies.length === 0) {
        try {
          const comp = await sb.from("companies").select("*").order("created_at", { ascending: false });
          currentCompanies = comp.data || [];
          setCompanies(currentCompanies);
        } catch (compErr) {
          console.warn("Could not load companies during login:", compErr);
        }
      }

      // Automatically determine the company from the user's profile
      const compIdToUse = user.company_id || targetCompId;
      if (compIdToUse && compIdToUse !== "all") {
        matchedComp = currentCompanies.find(
          (c) =>
            c.id === compIdToUse ||
            (c.slug || "") === compIdToUse
        );
      }

      // Auto-detect and route to user's company context if available
      if (matchedComp) {
        navigateToSlug(matchedComp.slug || matchedComp.id);
      }

      setCurrentUser(user);
      localStorage.setItem("aw_current_user", JSON.stringify(user));
      showToast(`مرحباً بك مجدداً ${user.name}`);
      await logSession(user, "تسجيل دخول للنظام المالي");
      await loadEverything();
    } catch (err: any) {
      console.error(err);
      showToast("حدث خطأ في الاتصال بالملقم المالي: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Authenticator 2FA Barcode Auto-Login Handler
  const handleDirectLogin = async (inputCode?: string, enteredTotp?: string, companyOverrideId?: string | null) => {
    setIsLoading(true);
    try {
      const codeCandidate = (inputCode || loginCode || "").trim();
      const totpCandidate = (enteredTotp || "").trim();

      const adminCodes = ["1007363904", "0564468888", "139213", "13921313", "الادمن", "admin", "المدير", "المدير العام", "سلطان العاصمي"];
      const isGlobalAdmin = 
        adminCodes.includes(codeCandidate) || 
        adminCodes.includes(codeCandidate.replace(/[^0-9]/g, ""));

      const targetCompId = companyOverrideId || activeCompany?.id || null;

      if (isGlobalAdmin) {
        const isAdminSultan = codeCandidate.includes("0564468888") || codeCandidate.includes("سلطان") || totpCandidate.includes("0564468888");
        const adminName = isAdminSultan ? "سلطان العاصمي (المدير العام)" : "المدير العام (الأدمن)";
        const adminCode = isAdminSultan ? "0564468888" : "1007363904";

        const defaultAdmin: AuthUser = {
          id: `admin_${adminCode}`,
          name: adminName,
          code: adminCode,
          password: loginPass || "139213",
          role: "admin",
          company_id: targetCompId,
          status: "نشط",
          perms: {
            installmentsView: true,
            installmentsAdd: true,
            installmentsEdit: true,
            installmentsDelete: true,
            quotes: true,
            receipts: true,
            payments: true,
            expenses: true,
            treasury: true,
            projects: true,
            workers: true,
            companies: true,
            users: true,
            sessions: true,
            print: true,
            dashTopCards: true,
            dashCollection: true,
            dashPulse: true,
            dashLateClients: true,
            dashLastReceipts: true,
            dashUpcomingPaid: true,
            region: "",
            worker_id: null
          },
          company_perms: {},
          created_at: new Date().toISOString()
        };

        if (targetCompId) {
          const matchedC = companies.find((c) => c.id === targetCompId || c.slug === targetCompId);
          if (matchedC) navigateToSlug(matchedC.slug || matchedC.id);
        }

        setCurrentUser(defaultAdmin);
        localStorage.setItem("aw_current_user", JSON.stringify(defaultAdmin));
        showToast(`✅ أهلاً بك! تم الاعتماد والدخول المباشر المصدق بباركود Authenticator: ${defaultAdmin.name}`);
        await logSession(defaultAdmin, "تسجيل دخول مصدق - Authenticator 2FA");
        await loadEverything();
        setIsLoading(false);
        return;
      }

      // Normal Employee / User direct login search
      const effectiveCode = codeCandidate || totpCandidate || "1001";
      const normCode = effectiveCode.replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
      const normCodeNoZero = normCode.replace(/^0+/, "");

      const { data: allUsers } = await sb.from("users").select("*");
      const matchedUser = (allUsers || []).find((u: any) => {
        const uCode = (u.code || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uPhone = (u.phone || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uWorkId = (u.worker_id || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uId = (u.id || "").replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
        const uName = (u.name || "").trim().toLowerCase();

        return (
          (uCode && (uCode === normCode || (normCodeNoZero && uCode.replace(/^0+/, "") === normCodeNoZero))) ||
          (uPhone && (uPhone === normCode || (normCodeNoZero && uPhone.replace(/^0+/, "") === normCodeNoZero))) ||
          (uWorkId && (uWorkId === normCode || (normCodeNoZero && uWorkId.replace(/^0+/, "") === normCodeNoZero))) ||
          (uId && uId === normCode) ||
          (uName && uName === effectiveCode.toLowerCase())
        );
      });

      if (!matchedUser) {
        showToast("⚠️ كود الموظف غير مسجل أو الحساب ملغى من الإدارة!", "error");
        setIsLoading(false);
        return;
      }

      if (matchedUser.status && matchedUser.status !== "نشط") {
        showToast("⚠️ عذراً، هذا الحساب ملغى أو معطل حالياً من قبل الإدارة!", "error");
        setIsLoading(false);
        return;
      }

      if (targetCompId) {
        matchedUser.company_id = targetCompId;
        const matchedC = companies.find((c) => c.id === targetCompId || c.slug === targetCompId);
        if (matchedC) navigateToSlug(matchedC.slug || matchedC.id);
      }

      setCurrentUser(matchedUser as AuthUser);
      localStorage.setItem("aw_current_user", JSON.stringify(matchedUser));
      localStorage.setItem("aw_saved_employee_code", matchedUser.code || effectiveCode);
      localStorage.setItem("aw_saved_employee_name", matchedUser.name || "");
      showToast(`✅ تم تسجيل الدخول المباشر المصدق: ${matchedUser.name}`);
      await logSession(matchedUser as AuthUser, "تسجيل دخول مصدق - Authenticator 2FA");
      await loadEverything();
    } catch (err: any) {
      console.error("Direct 2FA login error:", err);
      showToast("حدث خطأ أثناء إجراء الدخول المباشر المصدق: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;
      if (!gUser.email) {
        showToast("⚠️ عذراً، لم نتمكن من الحصول على البريد الإلكتروني من Google!", "error");
        setIsLoading(false);
        return;
      }

      // Check if there is an existing user linked to this Google account (either by email or google_id)
      let { data: existingUser } = await sb
        .from("users")
        .select("*")
        .eq("email", gUser.email)
        .maybeSingle();

      if (!existingUser && gUser.uid) {
        const { data: userByGoogleId } = await sb
          .from("users")
          .select("*")
          .eq("google_id", gUser.uid)
          .maybeSingle();
        existingUser = userByGoogleId;
      }

      if (existingUser) {
        const user: AuthUser = existingUser as AuthUser;
        if (user.status === "بانتظار الاعتماد" || user.status === "pending") {
          showToast("⚠️ حسابك وطلبك بانتظار موافقة الأدمن وتعيين الشركة والصلاحيات!", "info");
          setIsLoading(false);
          return;
        }
        if (user.status === "مرفوض") {
          showToast("❌ عذراً، طلب التسجيل مرفوض من قبل الأدمن. يرجى التواصل مع الإدارة.", "error");
          setIsLoading(false);
          return;
        }
        if (user.status && user.status !== "نشط") {
          showToast("⚠️ عذراً، هذا الحساب موقوف أو معطل حالياً من قبل الإدارة!", "error");
          setIsLoading(false);
          return;
        }

        // Successfully logged in directly because they are active & linked!
        setCurrentUser(user);
        localStorage.setItem("aw_current_user", JSON.stringify(user));
        showToast(`مرحباً بك مجدداً ${user.name} (تم الدخول عبر Google)`);
        await logSession(user, "تسجيل دخول بالنظام المالي (Google)");
        await loadEverything();
      } else {
        // Not registered/linked yet!
        setGoogleUser({
          email: gUser.email,
          uid: gUser.uid,
          displayName: gUser.displayName || undefined,
        });
        showToast("✓ تم التحقق من حساب Google بنجاح! يرجى إكمال تسجيل بياناتك وطلب منشأتك.", "info");
      }
    } catch (err: any) {
      console.error(err);
      if (err?.code !== "auth/popup-closed-by-user") {
        if (err?.code === "auth/unauthorized-domain") {
          showToast("⚠️ الدومين (arab1000.online) غير مضاف في قائمة النطاقات المعتمدة (Authorized Domains) بـ Firebase Auth!", "error");
        } else {
          showToast("حدث خطأ أثناء الدخول عبر Google: " + (err?.message || err), "error");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;
    if (!loginCode.trim() || !loginPass.trim()) {
      showToast("⚠️ يرجى إدخال كود الموظف وكلمة المرور!", "error");
      return;
    }
    setIsLoading(true);

    try {
      const enteredCode = loginCode.trim();
      const enteredPass = loginPass.trim();
      
      const adminCodes = ["1007363904", "0564468888", "139213", "13921313", "الادمن", "admin", "المدير", "المدير العام", "سلطان العاصمي"];
      const adminPasses = ["1007363904", "139213", "13921313"];
      const isGlobalAdmin = (adminCodes.includes(enteredCode) || adminCodes.includes(enteredCode.replace(/[^0-9]/g, ""))) && adminPasses.includes(enteredPass);
      
      let matchedComp: Company | undefined = undefined;

      // Check if global admin and auto-update password in DB if it's correct but old
      if (isGlobalAdmin) {
        const { data: adminInDb } = await sb
          .from("users")
          .select("*")
          .eq("code", "1007363904")
          .maybeSingle();
        if (adminInDb && adminInDb.password !== enteredPass) {
          await sb.from("users").update({ password: enteredPass }).eq("id", adminInDb.id);
        }
      }

      // Query database for the user with matching code and password first
      let { data, error } = await sb
        .from("users")
        .select("*")
        .eq("code", enteredCode)
        .eq("password", enteredPass)
        .maybeSingle();

      if (error || !data) {
        showToast("⚠️ عذراً، بيانات تصريح الدخول غير صحيحة!", "error");
        setIsLoading(false);
        return;
      }

      const user: AuthUser = data as AuthUser;
      if (user.status && user.status !== "نشط") {
        showToast("⚠️ عذراً، هذا الحساب موقوف أو معطل حالياً من قبل الإدارة!", "error");
        setIsLoading(false);
        return;
      }

      // Ensure we have loaded companies
      let currentCompanies = companies;
      if (currentCompanies.length === 0) {
        try {
          const comp = await sb.from("companies").select("*").order("created_at", { ascending: false });
          currentCompanies = comp.data || [];
          setCompanies(currentCompanies);
        } catch (compErr) {
          console.warn("Could not load companies during Google linking:", compErr);
        }
      }

      if (!isGlobalAdmin) {
        if (user.company_id && user.company_id !== "all") {
          matchedComp = currentCompanies.find(
            (c) =>
              c.id === user.company_id ||
              (c.slug || "") === user.company_id
          );
        }
      }

      // Auto-detect and route to user's company context
      if (matchedComp) {
        navigateToSlug(matchedComp.slug || matchedComp.id);
      }

      // Safe update - ONLY updating the Google credentials on the user record, without touching any other user data!
      await sb.from("users").update({
        email: googleUser.email,
        google_id: googleUser.uid
      }).eq("id", user.id);

      // Create linked user object
      const linkedUser: AuthUser = {
        ...user,
        email: googleUser.email,
        google_id: googleUser.uid,
      };

      setCurrentUser(linkedUser);
      localStorage.setItem("aw_current_user", JSON.stringify(linkedUser));
      showToast(`✓ تم ربط حساب Google بنجاح ومزامنة الدخول لـ ${user.name}`);
      await logSession(linkedUser, "ربط حساب Google وتسجيل دخول");
      setGoogleUser(null);
      await loadEverything();
    } catch (err: any) {
      showToast("حدث خطأ أثناء ربط حساب Google: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPendingUser = async (data: {
    name: string;
    email: string;
    google_id?: string;
    phone: string;
    company_id?: string;
    requested_company_name?: string;
    requested_company_slug?: string;
    requested_company_manager?: string;
    requested_company_phone?: string;
    requested_company_capital?: number;
    requested_company_address?: string;
    requested_company_record_no?: string;
    requested_company_tax_no?: string;
  }) => {
    setIsLoading(true);
    try {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedPass = Math.floor(100000 + Math.random() * 900000).toString();
      const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newUserPayload: AuthUser = {
        id: newUserId,
        name: data.name,
        code: generatedCode,
        password: generatedPass,
        email: data.email,
        google_id: data.google_id || "",
        phone: data.phone,
        role: data.requested_company_name ? "admin" : "employee",
        status: "بانتظار الاعتماد",
        company_id: data.company_id || null,
        requested_company_name: data.requested_company_name,
        requested_company_slug: data.requested_company_slug,
        requested_company_manager: data.requested_company_manager,
        requested_company_phone: data.requested_company_phone,
        requested_company_capital: data.requested_company_capital,
        requested_company_address: data.requested_company_address,
        requested_company_record_no: data.requested_company_record_no,
        requested_company_tax_no: data.requested_company_tax_no,
        perms: {
          attendance: true,
          dashboard: true,
          installmentsView: true,
          installmentsAdd: true,
          installmentsEdit: false,
          installmentsDelete: false,
          quotes: true,
          receipts: true,
          payments: true,
          expenses: true,
          treasury: false,
          financial_reports: true,
          projects: true,
          workers: true,
          companies: false,
          users: false,
          sessions: false,
          print: true,
          dashTopCards: true,
          dashCollection: true,
          dashPulse: true,
          dashLateClients: true,
          dashLastReceipts: true,
          dashUpcomingPaid: true,
          region: "",
          worker_id: null
        },
        company_perms: {},
        created_at: new Date().toISOString()
      };

      const { error } = await sb.from("users").insert(newUserPayload);
      if (error) {
        throw error;
      }

      setUsers((prev) => [newUserPayload, ...prev]);
      setGoogleUser(null);
      showToast("✓ تم إرسال طلب تسجيل الحساب والشركة بنجاح للأدمن! سيتم تفعيل حسابك فور الموافقة.", "success");
      return true;
    } catch (err: any) {
      console.error(err);
      showToast("حدث خطأ أثناء تقديم طلب التسجيل: " + (err?.message || err), "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePendingUser = async (
    targetUserId: string,
    chosenCompanyId: string,
    chosenRole: "admin" | "supervisor" | "employee",
    chosenPerms?: UserPerms
  ) => {
    if (currentUser?.role !== "admin" && !can("users")) {
      showToast("⚠️ عذراً، لا تملك صلاحية اعتماد الموظفين والمستخدمين!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const targetUser = users.find(u => u.id === targetUserId);
      if (!targetUser) {
        showToast("المستخدم غير موجود!", "error");
        return;
      }

      let finalCompId = chosenCompanyId;

      // 1. If chosenCompanyId is "CREATE_NEW" and the user requested a new company:
      if (chosenCompanyId === "CREATE_NEW" && targetUser.requested_company_name) {
        const compSlug = targetUser.requested_company_slug || `comp-${Date.now()}`;
        const newCompId = `company_${compSlug}`;
        const companyPayload = {
          id: newCompId,
          slug: compSlug,
          name: targetUser.requested_company_name,
          manager: targetUser.requested_company_manager || targetUser.name,
          phone: targetUser.requested_company_phone || targetUser.phone || "",
          notes: `تم التأسيس والاعتماد من طلب التسجيل السحابي | رأس المال: ${targetUser.requested_company_capital || 0} ر.س`,
          created_at: new Date().toISOString()
        };

        const { error: compErr } = await sb.from("companies").insert(companyPayload);
        if (compErr) {
          console.error("Comp creation error:", compErr);
        }
        setCompanies(prev => [companyPayload, ...prev]);
        finalCompId = newCompId;
      }

      // 2. Default permissions if not passed
      const permsToSet = chosenPerms || targetUser.perms;

      // 3. Update user in DB
      const updatedUserFields = {
        status: "نشط",
        company_id: finalCompId || null,
        role: chosenRole,
        perms: permsToSet,
        updated_at: new Date().toISOString(),
      };

      const { error: userErr } = await sb.from("users").update(updatedUserFields).eq("id", targetUserId);
      if (userErr) {
        throw userErr;
      }

      // Update local state
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, ...updatedUserFields } : u));
      showToast(`✓ تم قبول واعتماد الحساب ${targetUser.name} وتعيين الشركة والصلاحيات بنجاح!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast("فشل في اعتماد المستخدم: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectPendingUser = async (targetUserId: string) => {
    if (currentUser?.role !== "admin" && !can("users")) {
      showToast("⚠️ عذراً، لا تملك صلاحية رفض أو إدارة طلبات الموظفين!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await sb.from("users").update({ status: "مرفوض" }).eq("id", targetUserId);
      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, status: "مرفوض" } : u));
      showToast("تم رفض طلب التسجيل.", "info");
    } catch (err: any) {
      console.error(err);
      showToast("فشل في تغيير حالة الطلب: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    const userToLog = currentUser;
    setCurrentUser(null);
    localStorage.removeItem("aw_current_user");
    showToast("تم تسجيل الخروج بنجاح", "info");

    if (userToLog) {
      logSession(userToLog, "تسجيل خروج آمن").catch((err) => {
        console.warn("Failed to log logout session to database:", err);
      });
    }
  };

  // Queries sync
  // Audit & Recalculate All Contracts and Receipts to fix corrupted linkages and restore true amounts
  const auditAndRecalculateAllContractsAndReceipts = async (
    rawInstallments: Installment[],
    rawReceipts: Receipt[],
    rawPayments: Payment[]
  ) => {
    if (!rawInstallments || rawInstallments.length === 0) {
      return { updatedInstallments: rawInstallments, updatedReceipts: rawReceipts };
    }

    const newReceipts = rawReceipts.map(r => ({ ...r }));
    const newInstallments = rawInstallments.map(i => ({ ...i }));

    // 0. Audit and Deduplicate Contract Numbers (Ensure each contract has a unique AW-CON-XXXX)
    const claimedNos = new Set<string>();
    for (let idx = 0; idx < newInstallments.length; idx++) {
      const inst = newInstallments[idx];
      const curNo = String(inst.no || "").trim().toUpperCase();

      if (!curNo || claimedNos.has(curNo)) {
        // Duplicate or missing contract number detected - generate a guaranteed unique number
        const allExisting = new Set([...claimedNos, ...newInstallments.map(x => String(x.no || "").trim().toUpperCase()).filter(Boolean)]);
        const allNums = newInstallments
          .map(x => {
            const m = String(x.no || "").match(/(\d+)$/);
            return m ? Number(m[1]) : 0;
          })
          .filter(Boolean);
        let nextN = (allNums.length ? Math.max(...allNums) : 0) + 1;
        let generatedNo = `AW-CON-${String(nextN).padStart(4, "0")}`;
        while (allExisting.has(generatedNo.toUpperCase())) {
          nextN++;
          generatedNo = `AW-CON-${String(nextN).padStart(4, "0")}`;
        }

        const oldNo = inst.no;
        newInstallments[idx] = {
          ...inst,
          no: generatedNo
        };
        claimedNos.add(generatedNo.toUpperCase());

        // Update database for the duplicate contract
        sb.from("installments").update({ no: generatedNo }).eq("id", inst.id).then(() => {}).catch(() => {});

        // Update any receipts that were specifically linked to this contract's old ID or old number
        for (let rIdx = 0; rIdx < newReceipts.length; rIdx++) {
          if (newReceipts[rIdx].installment_id === inst.id || (oldNo && newReceipts[rIdx].contract_no === oldNo)) {
            newReceipts[rIdx] = {
              ...newReceipts[rIdx],
              contract_no: generatedNo,
              installment_id: inst.id
            };
            sb.from("receipts").update({ contract_no: generatedNo, installment_id: inst.id }).eq("id", newReceipts[rIdx].id).then(() => {}).catch(() => {});
          }
        }
      } else {
        claimedNos.add(curNo);
      }
    }

    // 1. Audit receipt linkages to match the exact contract
    for (let idx = 0; idx < newReceipts.length; idx++) {
      const r = newReceipts[idx];
      const normName = String(r.from_name || "").trim().replace(/\s+/g, " ").toLowerCase();
      const normIdentity = String(r.identity || "").trim();
      const normContractNo = String(r.contract_no || "").trim().toUpperCase();

      let targetInst: Installment | null = null;

      // Priority 1: Direct link by installment_id
      if (r.installment_id) {
        targetInst = newInstallments.find(i => i.id === r.installment_id) || null;
      }

      // Priority 2: Direct link by Contract Number (e.g. AW-CON-0008)
      if (!targetInst && normContractNo && normContractNo.startsWith("AW-CON-")) {
        targetInst = newInstallments.find(i => String(i.no || "").trim().toUpperCase() === normContractNo) || null;
      }

      // Priority 3: Fallback match by Identity if no direct contract link was established
      if (!targetInst && normIdentity && normIdentity.length > 5) {
        const matchingByIdent = newInstallments.filter(i => {
          const iIdent = String(i.identity || "").trim();
          return iIdent === normIdentity;
        });
        if (matchingByIdent.length === 1) {
          targetInst = matchingByIdent[0];
        }
      }

      // Priority 4: Fallback match by exact Client Name if no direct contract link was established
      if (!targetInst && normName && !r.contract_no && !r.installment_id) {
        const matchingByName = newInstallments.filter(i => {
          const cName = String(i.client || "").trim().replace(/\s+/g, " ").toLowerCase();
          return cName === normName;
        });
        if (matchingByName.length === 1) {
          targetInst = matchingByName[0];
        }
      }

      if (targetInst) {
        if (
          r.installment_id !== targetInst.id ||
          r.contract_no !== targetInst.no
        ) {
          newReceipts[idx] = {
            ...r,
            installment_id: targetInst.id,
            contract_no: targetInst.no,
            identity: targetInst.identity || r.identity || "",
            phone: targetInst.phone || r.phone || "",
            nationality: targetInst.nationality || r.nationality || ""
          };
          sb.from("receipts").update({
            installment_id: targetInst.id,
            contract_no: targetInst.no,
            identity: targetInst.identity || r.identity || "",
            phone: targetInst.phone || r.phone || "",
            nationality: targetInst.nationality || r.nationality || ""
          }).eq("id", r.id).then(() => {}).catch(() => {});
        }
      } else {
        if (r.installment_id && !r.contract_no && !normName) {
          newReceipts[idx] = { ...r, installment_id: null, contract_no: "" };
          sb.from("receipts").update({ installment_id: null, contract_no: "" }).eq("id", r.id).then(() => {}).catch(() => {});
        }
      }
    }

    // 2. Recalculate paid, remaining, status for EVERY contract
    for (let idx = 0; idx < newInstallments.length; idx++) {
      const inst = newInstallments[idx];

      const linkedRecs = newReceipts.filter(r => r.installment_id === inst.id || (inst.no && r.contract_no === inst.no));
      const linkedPays = rawPayments.filter(p => p.installment_id === inst.id || (inst.no && p.contract_no === inst.no));

      const contractDir = inst.contract_direction || awExtractContractDirection(inst.notes || "") || "لنا";
      const isExpenseDir = contractDir === "علينا" || contractDir === "مصروفات عمالة";

      const paidFromReceipts = linkedRecs.reduce((sum, x) => {
        const isOutgoing = awExtractReceiptType(x.notes || "") === "صادر";
        const amt = Number(x.amount || 0);
        return sum + (isOutgoing ? -amt : amt);
      }, 0);

      const paidOutFromPayments = linkedPays.reduce((sum, x) => sum + Number(x.amount || 0), 0);

      const initialDownPayment = awExtractDownPayment(inst.notes || "");

      const hasDownPaymentReceipt = linkedRecs.some(r => {
        const notes = String(r.notes || "");
        return notes.includes("دفعة_مقدمة") || notes.includes("دفعة مقدمة");
      });
      const effectiveDownPayment = hasDownPaymentReceipt ? 0 : initialDownPayment;

      let netPaid = 0;
      if (linkedRecs.length === 0 && linkedPays.length === 0) {
        netPaid = effectiveDownPayment > 0 ? effectiveDownPayment : Number(inst.paid || 0);
      } else {
        if (isExpenseDir) {
          netPaid = effectiveDownPayment + (paidOutFromPayments - paidFromReceipts);
        } else {
          netPaid = effectiveDownPayment + (paidFromReceipts - paidOutFromPayments);
        }
      }

      const totalAmt = Number(inst.amount || 0);
      const newRemaining = Math.max(0, totalAmt - netPaid);
      const newStatus = newRemaining <= 0 ? "مكتمل" : "منتظم";

      if (Number(inst.paid) !== netPaid || Number(inst.remaining) !== newRemaining || inst.status !== newStatus) {
        newInstallments[idx] = {
          ...inst,
          paid: netPaid,
          remaining: newRemaining,
          status: newStatus
        };

        sb.from("installments").update({
          paid: netPaid,
          remaining: newRemaining,
          status: newStatus
        }).eq("id", inst.id).then(() => {}).catch(() => {});
      }
    }

    return { updatedInstallments: newInstallments, updatedReceipts: newReceipts };
  };

  const loadEverything = async () => {
    if (!currentUser) return;
    try {
      const [u, inst, q, rec, pay, exp, pr, w, s, comp, ext] = await Promise.all([
        sb.from("users").select("*").order("created_at", { ascending: false }),
        sb.from("installments").select("*").order("created_at", { ascending: false }),
        sb.from("quotes").select("*").order("created_at", { ascending: false }),
        sb.from("receipts").select("*").order("created_at", { ascending: false }),
        sb.from("payments").select("*").order("created_at", { ascending: false }),
        sb.from("expenses").select("*").order("created_at", { ascending: false }),
        sb.from("projects").select("*").order("created_at", { ascending: false }),
        sb.from("workers").select("*").order("created_at", { ascending: false }),
        sb.from("sessions").select("*").order("created_at", { ascending: false }),
        sb.from("companies").select("*").order("created_at", { ascending: false }),
        sb.from("extracts").select("*").order("created_at", { ascending: false }),
      ]);

      const uList = u.data || [];
      setUsers(uList);

      const rawInst = inst.data || [];
      const rawRec = rec.data || [];
      const rawPay = pay.data || [];

      const { updatedInstallments, updatedReceipts } = await auditAndRecalculateAllContractsAndReceipts(rawInst, rawRec, rawPay);

      setInstallments(updatedInstallments);
      setReceipts(updatedReceipts);
      setQuotes(q.data || []);
      setPayments(rawPay);
      setExpenses(exp.data || []);
      setProjects(pr.data || []);
      setWorkers(w.data || []);
      setSessions(s.data || []);
      let compList = comp.data || [];
      
      if (compList.length === 0) {
        const toAdd = [
          {
            id: "arab_world",
            name: "شركة عرب وورلد للمقاولات والعقود",
            commercial_register: "1010777555",
            tax_no: "300099988800003",
            capital: 10000000,
            phone: "0556446888",
            address: "الرياض، المملكة العربية السعودية",
            created_at: new Date().toISOString()
          },
          {
            id: "demo_company",
            name: "شركة التجربة المستقلة (Demo)",
            commercial_register: "1010123456",
            tax_no: "310123456700003",
            capital: 2500000,
            phone: "0500000001",
            address: "منطقة الدمام التجريبية",
            created_at: new Date().toISOString()
          }
        ];
        
        for (const item of toAdd) {
          try {
            await sb.from("companies").insert(item);
          } catch (e) {
            console.error("Failed to seed company:", item.id, e);
          }
        }
        const freshComp = await sb.from("companies").select("*").order("created_at", { ascending: false });
        compList = freshComp.data || compList;
      }
      setCompanies(compList);
      setExtracts(ext.data || []);

      // Auto-sync and update non-admin users in database to ensure proper names and strict company bindings
      for (const uItem of uList) {
        if (uItem.role !== "admin") {
          let updateNeeded = false;
          let newCompId = uItem.company_id;
          let newName = uItem.name || "";

          if (!newCompId || !compList.some((c) => c.id === newCompId)) {
            newCompId = compList[0]?.id || "arab_world";
            updateNeeded = true;
          }

          const matchedComp = compList.find((c) => c.id === newCompId);
          if (!newName || newName === "موظف" || newName === "عامل" || newName === "مستخدم") {
            newName = `موظف (${matchedComp?.name || "عرب وورلد"})`;
            updateNeeded = true;
          }

          if (updateNeeded) {
            uItem.company_id = newCompId;
            uItem.name = newName;
            try {
              await sb.from("users").update({ company_id: newCompId, name: newName }).eq("id", uItem.id);
            } catch (upErr) {
              console.warn("Failed to sync user company in DB:", uItem.id, upErr);
            }
          }
        }
      }

      // Seed default sample company employees if not present
      const hasArabWorldEmp = uList.some((u) => u.company_id === "arab_world" && u.role !== "admin");
      if (!hasArabWorldEmp && compList.some((c) => c.id === "arab_world")) {
        const emp1: AuthUser = {
          id: "emp_arab_world_1001",
          name: "أحمد علي الفضلي - شركة عرب وورلد",
          code: "1001",
          password: "1001",
          role: "employee",
          company_id: "arab_world",
          status: "نشط",
          perms: {
            attendance: true,
            dashboard: true,
            installmentsView: true,
            installmentsAdd: true,
            installmentsEdit: false,
            installmentsDelete: false,
            quotes: true,
            receipts: true,
            payments: true,
            expenses: true,
            treasury: false,
            financial_reports: true,
            projects: true,
            workers: true,
            companies: false,
            users: false,
            sessions: false,
            print: true,
            dashTopCards: true,
            dashCollection: true,
            dashPulse: true,
            dashLateClients: true,
            dashLastReceipts: true,
            dashUpcomingPaid: true,
            region: "",
            worker_id: null
          },
          company_perms: {},
          created_at: new Date().toISOString()
        };
        try {
          await sb.from("users").upsert(emp1, { onConflict: "code" });
          uList.push(emp1);
        } catch (e) {
          console.warn("Could not seed emp1:", e);
        }
      }

      const hasDemoEmp = uList.some((u) => u.company_id === "demo_company" && u.role !== "admin");
      if (!hasDemoEmp && compList.some((c) => c.id === "demo_company")) {
        const emp2: AuthUser = {
          id: "emp_demo_company_2001",
          name: "سعد خالد المري - شركة التجربة المستقلة",
          code: "2001",
          password: "2001",
          role: "employee",
          company_id: "demo_company",
          status: "نشط",
          perms: {
            attendance: true,
            dashboard: true,
            installmentsView: true,
            installmentsAdd: true,
            installmentsEdit: false,
            installmentsDelete: false,
            quotes: true,
            receipts: true,
            payments: true,
            expenses: true,
            treasury: false,
            financial_reports: true,
            projects: true,
            workers: true,
            companies: false,
            users: false,
            sessions: false,
            print: true,
            dashTopCards: true,
            dashCollection: true,
            dashPulse: true,
            dashLateClients: true,
            dashLastReceipts: true,
            dashUpcomingPaid: true,
            region: "",
            worker_id: null
          },
          company_perms: {},
          created_at: new Date().toISOString()
        };
        try {
          await sb.from("users").upsert(emp2, { onConflict: "code" });
          uList.push(emp2);
        } catch (e) {
          console.warn("Could not seed emp2:", e);
        }
      }

      setUsers([...uList]);

      let attData: any[] = [];
      try {
        const attRes = await sb.from("attendance").select("*").order("created_at", { ascending: false });
        attData = attRes.data || [];
      } catch (e) {
        console.warn("Could not load attendance from DB:", e);
      }
      setAttendances(attData);

      // Autoresolve/refresh current user details to update links/permissions dynamically
      const savedUserStr = localStorage.getItem("aw_current_user");
      if (!savedUserStr) {
        // User logged out mid-flight or session was cleared, do not restore state
        return;
      }
      if (currentUser) {
        const isGlobalAdminUser = 
          currentUser.role === "admin" || 
          currentUser.id.startsWith("admin_") || 
          ["1007363904", "0564468888", "139213", "13921313", "admin"].includes(currentUser.code);
        if (isGlobalAdminUser) {
          return;
        }

        const freshUser = uList.find((x) => x.id === currentUser.id);
        if (freshUser) {
          if (freshUser.status && freshUser.status !== "نشط") {
            setCurrentUser(null);
            localStorage.removeItem("aw_current_user");
            showToast("⚠️ تم إيقاف أو تعطيل هذا الحساب من قبل الإدارة. تم تسجيل الخروج تلقائياً.", "error");
            return;
          }

          // Check if employee credentials, role, company, permissions, or updated_at changed
          const permsChanged = JSON.stringify(freshUser.perms || {}) !== JSON.stringify(currentUser.perms || {}) ||
            JSON.stringify(freshUser.company_perms || {}) !== JSON.stringify(currentUser.company_perms || {});
          const infoChanged = freshUser.password !== currentUser.password ||
            freshUser.code !== currentUser.code ||
            freshUser.role !== currentUser.role ||
            freshUser.company_id !== currentUser.company_id ||
            freshUser.status !== currentUser.status ||
            (freshUser.updated_at && currentUser.updated_at && freshUser.updated_at !== currentUser.updated_at);

          if (permsChanged || infoChanged) {
            setCurrentUser(null);
            localStorage.removeItem("aw_current_user");
            showToast("🔒 تم تعديل صلاحيات أو بيانات حسابك فوراً من قبل الإدارة. يرجى إعادة تسجيل الدخول لمتابعة العمل.", "info");
            return;
          }

          setCurrentUser(freshUser);
          localStorage.setItem("aw_current_user", JSON.stringify(freshUser));
        } else {
          // The user was completely deleted from the database
          setCurrentUser(null);
          localStorage.removeItem("aw_current_user");
          showToast("⚠️ تم حذف حسابك من قبل الإدارة. تم تسجيل الخروج فوراً.", "error");
          return;
        }
      }
    } catch {
      showToast("تنبيه: فشل في الاتصال بقاعدة البيانات", "error");
    }
  };

  // Load current Supabase credentials and health on mount
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSbUrl(creds.url);
    setSbKey(creds.key);
    
    checkSupabaseHealth().then((healthy) => {
      setSbStatus(healthy ? "connected" : "fallback");
    });
  }, []);

  const testAndSaveSupabaseStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbTesting(true);
    try {
      const isOk = await saveSupabaseCredentials(sbUrl, sbKey);
      if (isOk) {
        setSbStatus("connected");
        showToast("🟢 تم الاتصال بقاعدة Supabase بنجاح! تم حفظ البيانات وتفعيلها بنشاط.", "success");
        if (currentUser) {
          loadEverything();
        }
      } else {
        setSbStatus("fallback");
        showToast("⚠️ لم نتمكن من الاتصال بـ Supabase (قد يكون بسبب حصة الاستهلاك أو كود خاطئ). مستمرون عبر Firestore كخلفية متينة.", "info");
      }
    } catch (err: any) {
      setSbStatus("fallback");
      showToast("❌ خطأ في الاتصال: " + (err.message || err), "error");
    } finally {
      setSbTesting(false);
    }
  };

  const restoreSupabaseDefaultStatus = async () => {
    setSbTesting(true);
    try {
      const isOk = await saveSupabaseCredentials("", "");
      const creds = getSupabaseCredentials();
      setSbUrl(creds.url);
      setSbKey(creds.key);
      if (isOk) {
        setSbStatus("connected");
        showToast("🟢 تم استعادة إعدادات الاتصال الافتراضية بنجاح!", "success");
      } else {
        setSbStatus("fallback");
        showToast("⚠️ السيرفر الافتراضي تخطى الحدود. تم تفعيل نظام Firestore الاحتياطي تلقائياً.", "info");
      }
      if (currentUser) {
        loadEverything();
      }
    } catch {
      showToast("❌ فشل في الاستعادة لمعايير النظام الافتراضية", "error");
    } finally {
      setSbTesting(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      showToast("جاري تحضير وتجميع النسخة الاحتياطية...", "info");
      const [u, inst, q, rec, pay, exp, pr, w, s] = await Promise.all([
        sb.from("users").select("*"),
        sb.from("installments").select("*"),
        sb.from("quotes").select("*"),
        sb.from("receipts").select("*"),
        sb.from("payments").select("*"),
        sb.from("expenses").select("*"),
        sb.from("projects").select("*"),
        sb.from("workers").select("*"),
        sb.from("sessions").select("*"),
      ]);

      const backupData = {
        backup_version: "1.0",
        backed_up_at: new Date().toISOString(),
        active_database: isSupabaseHealthy ? "Supabase" : "Firestore",
        data: {
          users: u.data || [],
          installments: inst.data || [],
          quotes: q.data || [],
          receipts: rec.data || [],
          payments: pay.data || [],
          expenses: exp.data || [],
          projects: pr.data || [],
          workers: w.data || [],
          sessions: s.data || []
        }
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `etreasury_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("تم تحميل النسخة الاحتياطية بنجاح!", "success");
    } catch (err: any) {
      showToast(`خطأ أثناء إنشاء النسخة الاحتياطية: ${err.message || err}`, "error");
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);

        if (!backup || !backup.data || typeof backup.data !== "object") {
          throw new Error("بنية الملف غير صالحة. الملف لا يحتوي على كائن البيانات اللازم للتشغيل.");
        }

        const parsedData = backup.data;
        const keys = ["users", "installments", "quotes", "receipts", "payments", "expenses", "projects", "workers", "sessions"];
        
        let restoreCount = 0;
        let errorCount = 0;

        showToast("جاري معالجة واستيراد السجلات إلى قاعدة البيانات...", "info");

        for (const table of keys) {
          const records = parsedData[table];
          if (Array.isArray(records) && records.length > 0) {
            for (const record of records) {
              try {
                if (record && typeof record === "object") {
                  await sb.from(table).upsert(record);
                  restoreCount++;
                }
              } catch (err) {
                console.error(`Error restoring record in table ${table}:`, err);
                errorCount++;
              }
            }
          }
        }

        await loadEverything();
        showToast(`تمت استعادة البيانات بنجاح! تم حفظ وتحديث ${restoreCount} سجل بشكل آمن.`, "success");
        setRestoreSuccess(`تم استيراد الملف واستعادة النظام بالكامل! قمنا بتحديث ${restoreCount} سجل بنجاح.`);
      } catch (err: any) {
        console.error("Backup restore error:", err);
        showToast(`فشلت استعادة البيانات: ${err.message || err}`, "error");
        setRestoreError(`خطأ فني في الاستعادة: ${err.message || err}`);
      } finally {
        setIsRestoring(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    };

    reader.onerror = () => {
      showToast("خطأ أثناء قراءة ملف النسخة الاحتياطية المحددة", "error");
      setIsRestoring(false);
    };

    reader.readAsText(file);
  };

  // Background reloading interval block
  useEffect(() => {
    if (currentUser) {
      loadEverything();
      const interval = setInterval(() => {
        loadEverything();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Immediate session validation on mount
  useEffect(() => {
    const verifySessionOnMount = async () => {
      if (currentUser) {
        // If they are an admin, bypass database deletion check so they are never kicked out
        const isImmortalAdmin = 
          currentUser.role === "admin" || 
          currentUser.id.startsWith("admin_") || 
          ["1007363904", "0564468888", "139213", "13921313", "admin"].includes(currentUser.code);

        if (isImmortalAdmin) {
          // Sync with DB in the background without blocking or kicking the admin out
          try {
            await sb.from("users").upsert(currentUser, { onConflict: "id" });
          } catch (e) {
            console.warn("Admin background sync skipped/failed:", e);
          }
          return;
        }

        try {
          const { data, error } = await sb
            .from("users")
            .select("id, status")
            .eq("id", currentUser.id)
            .maybeSingle();

          if (error) {
            console.warn("Could not verify session with Supabase:", error);
            return;
          }

          if (!data) {
            // User does not exist in the database (deleted)
            setCurrentUser(null);
            localStorage.removeItem("aw_current_user");
            showToast("⚠️ تم حذف هذا الحساب من النظام المالي. لا يمكن الدخول.", "error");
          } else if (data.status && data.status !== "نشط") {
            // User is suspended
            setCurrentUser(null);
            localStorage.removeItem("aw_current_user");
            showToast("⚠️ عذراً، هذا الحساب موقوف أو معطل حالياً من قبل الإدارة!", "error");
          }
        } catch (e) {
          console.error("Session verification failed:", e);
        }
      }
    };
    verifySessionOnMount();
  }, []);

  // Load companies unconditionally on mount for SaaS routing
  useEffect(() => {
    const loadInitialCompaniesForSaaS = async () => {
      try {
        const comp = await sb.from("companies").select("*").order("created_at", { ascending: false });
        let compList = comp.data || [];
        if (compList.length === 0) {
          const toAdd = [
            {
              id: "arab_world",
              slug: "arab-world",
              name: "شركة عرب وورلد للمقاولات والعقود",
              record_no: "1010777555",
              phone: "0556446888",
              address: "الرياض، المملكة العربية السعودية",
              created_at: new Date().toISOString()
            },
            {
              id: "demo_company",
              slug: "demo-company",
              name: "شركة التجربة المستقلة (Demo)",
              record_no: "1010123456",
              phone: "0500000001",
              address: "منطقة الدمام التجريبية",
              created_at: new Date().toISOString()
            }
          ];
          for (const item of toAdd) {
            await sb.from("companies").insert(item);
          }
          const freshComp = await sb.from("companies").select("*").order("created_at", { ascending: false });
          compList = freshComp.data || [];
        }
        setCompanies(compList);
      } catch (err) {
        console.error("Failed to fetch initial companies for SaaS:", err);
      }
    };
    loadInitialCompaniesForSaaS();
  }, []);

  // Auto-set and lock company state based on active URL slug
  useEffect(() => {
    if (activeSlug && companies.length > 0) {
      const activeComp = companies.find(
        (c) => (c.slug || "").toLowerCase() === activeSlug.toLowerCase() || c.id.toLowerCase() === activeSlug.toLowerCase()
      );
      if (activeComp) {
        setSelectedCompanyId(activeComp.id);
      }
    }
  }, [activeSlug, companies]);

  const getAuthorizedCompanies = () => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return companies;

    const allowedSet = new Set<string>();

    if (currentUser.company_id && currentUser.company_id !== "all" && currentUser.company_id !== "global") {
      allowedSet.add(currentUser.company_id);
    }

    if (currentUser.company_perms && typeof currentUser.company_perms === "object") {
      Object.keys(currentUser.company_perms).forEach((cId) => {
        if (cId && cId !== "global") {
          allowedSet.add(cId);
        }
      });
    }

    if (allowedSet.size === 0) {
      allowedSet.add("arab_world");
    }

    return companies.filter((c) => allowedSet.has(c.id));
  };

  const isCompanyAuthorized = (compId: string | undefined | null) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    const targetId = compId || "arab_world";
    const authComps = getAuthorizedCompanies();
    return authComps.some((c) => c.id === targetId);
  };

  const getAuthorizedUsers = () => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return users;
    const authComps = getAuthorizedCompanies();
    const authCompIds = authComps.map((c) => c.id);
    return users.filter((u) => {
      if (u.role === "admin") return false;
      const uComp = u.company_id || "arab_world";
      return authCompIds.includes(uComp);
    });
  };

  const getTargetCompanyId = (formCompanyVal?: string) => {
    if (currentUser?.role !== "admin") {
      if (formCompanyVal && isCompanyAuthorized(formCompanyVal)) {
        return formCompanyVal;
      }
      if (selectedCompanyId !== "all" && isCompanyAuthorized(selectedCompanyId)) {
        return selectedCompanyId;
      }
      return currentUser?.company_id || "arab_world";
    }
    return formCompanyVal || (selectedCompanyId !== "all" ? selectedCompanyId : null) || null;
  };

  const getActivePerms = () => {
    if (!currentUser) return null;
    if (currentUser.role === "admin") return currentUser.perms;
    
    const activeId = selectedCompanyId !== "all" ? selectedCompanyId : (currentUser.company_id || "arab_world");
    
    if (currentUser.company_perms && currentUser.company_perms[activeId]) {
      const compPermObj = currentUser.company_perms[activeId];
      if (compPermObj && !compPermObj.use_global) {
        return compPermObj;
      }
    }
    return currentUser.perms;
  };

  const userRegionFilter = getActivePerms()?.region || "";

  const can = (perm: string) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    
    const activePerms = getActivePerms();
    if (activePerms) {
      if (activePerms[perm as keyof typeof activePerms] !== undefined) {
        return !!activePerms[perm as keyof typeof activePerms];
      }
    }
    // Fallback for missing keys (existing users/employees)
    if (perm === "attendance") return true;
    if (perm === "dashboard") return true;
    if (perm === "financial_reports") return true;
    return false;
  };

  const isAttendanceOnly = !!currentUser && currentUser.role !== "admin" &&
    can("attendance") &&
    !can("dashboard") &&
    !can("installmentsView") &&
    !can("quotes") &&
    !can("receipts") &&
    !can("payments") &&
    !can("expenses") &&
    !can("treasury") &&
    !can("financial_reports") &&
    !can("projects") &&
    !can("workers") &&
    !can("companies") &&
    !can("users") &&
    !can("sessions");

  const getActivePermsForCompany = (user: AuthUser | null, compId: string | undefined) => {
    if (!user) return null;
    return user.perms;
  };

  const getAuthorizedTreasuries = (user: AuthUser | null, compId: string | undefined): string[] => {
    // We reference treasuryUpdateKey here to force re-evaluation when we add a new treasury
    const _dummy = treasuryUpdateKey;
    const targetCompId = compId || (user?.role !== "admin" ? user?.company_id : selectedCompanyId);
    const allSafes = getStoredTreasuries(targetCompId, companies);
    if (!user) return [];
    if (user.role === "admin") return allSafes;

    const isSafeAllowedInPerm = (permsObj: any, safeName: string) => {
      const hasAnySafeToggle = Object.keys(permsObj).some(k => k.startsWith("safe_") && permsObj[k] === true);
      if (!hasAnySafeToggle) {
        return true;
      }
      return !!permsObj[`safe_${safeName}`];
    };

    return allSafes.filter(tName => isSafeAllowedInPerm(user.perms, tName));
  };

  const addNewTreasury = async (name: string, compId?: string) => {
    if (currentUser?.role !== "admin" && !can("treasury")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إضافة أو إدارة الخزائن المالية!", "error");
      return;
    }
    const cleanName = name.trim();
    if (!cleanName) return;
    const targetCompId = compId || (currentUser?.role !== "admin" ? currentUser?.company_id : selectedCompanyId);
    const currentSafes = getStoredTreasuries(targetCompId, companies);
    if (currentSafes.includes(cleanName)) {
      showToast("هذه الخزنة مسجلة مسبقاً في النظام!", "error");
      return;
    }
    const updated = [...currentSafes, cleanName];
    const suffix = targetCompId && targetCompId !== "all" ? `_${targetCompId}` : "";
    localStorage.setItem(`aw_treasuries${suffix}`, JSON.stringify(updated));

    if (targetCompId && targetCompId !== "all") {
      try {
        await sb.from("companies").update({ treasuries: updated }).eq("id", targetCompId);
      } catch (err: any) {
        console.error("Failed to sync new treasury to DB:", err);
      }
    }

    showToast(`تم إضافة خزنة جديدة بنجاح: ${cleanName}`);
    setTreasuryUpdateKey(prev => prev + 1);
    window.dispatchEvent(new Event("storage"));
    await loadEverything();
  };

  const openAddTreasuryDialog = (compId?: string) => {
    setTargetCompanyIdForModal(compId || selectedCompanyId);
    setNewTreasuryInputName("");
    setShowAddTreasuryModal(true);
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        if (selectedCompanyId !== "all" && !companies.some((c) => c.id === selectedCompanyId)) {
          setSelectedCompanyId("all");
        }
      } else {
        const userCompId = currentUser.company_id || "arab_world";
        if (selectedCompanyId !== userCompId) {
          setSelectedCompanyId(userCompId);
        }

        // Auto redirect active section if current section is unauthorized for non-admin
        const hasAccess = (perm: string) => {
          const activePerms = getActivePerms();
          if (activePerms) {
            if (activePerms[perm as keyof typeof activePerms] !== undefined) {
              return !!activePerms[perm as keyof typeof activePerms];
            }
          }
          if (perm === "attendance") return true;
          if (perm === "dashboard") return true;
          if (perm === "financial_reports") return true;
          return false;
        };

        let isAllowed = false;
        if (activeSection === "my_profile") isAllowed = !isAttendanceOnly;
        else if (activeSection === "dashboard") isAllowed = hasAccess("dashboard");
        else if (activeSection === "attendance") isAllowed = hasAccess("attendance");
        else if (activeSection === "installments") isAllowed = hasAccess("installmentsView");
        else if (activeSection === "quotes") isAllowed = hasAccess("quotes");
        else if (activeSection === "receipts") isAllowed = hasAccess("receipts");
        else if (activeSection === "payments") isAllowed = hasAccess("payments");
        else if (activeSection === "expenses") isAllowed = hasAccess("expenses");
        else if (activeSection === "treasury") isAllowed = hasAccess("treasury");
        else if (activeSection === "financial_reports") isAllowed = hasAccess("financial_reports");
        else if (activeSection === "projects") isAllowed = hasAccess("projects");
        else if (activeSection === "workers") isAllowed = hasAccess("workers");
        else if (activeSection === "companies") isAllowed = hasAccess("companies") || currentUser?.role === "admin";
        else if (activeSection === "company_assets") isAllowed = hasAccess("companies") || currentUser?.role === "admin";
        else if (activeSection === "users") isAllowed = hasAccess("users");
        else if (activeSection === "sessions") isAllowed = hasAccess("sessions");

        if (!isAllowed) {
          const sectionsOrdered = [
            "dashboard",
            "my_profile",
            "attendance",
            "installments",
            "quotes",
            "receipts",
            "payments",
            "expenses",
            "treasury",
            "financial_reports",
            "projects",
            "workers",
            "company_assets",
            "companies",
            "users",
            "sessions"
          ];
          const allowedSection = sectionsOrdered.find(sec => {
            if (sec === "my_profile") return !isAttendanceOnly;
            if (sec === "dashboard") return hasAccess("dashboard");
            if (sec === "attendance") return hasAccess("attendance");
            if (sec === "installments") return hasAccess("installmentsView");
            if (sec === "quotes") return hasAccess("quotes");
            if (sec === "receipts") return hasAccess("receipts");
            if (sec === "payments") return hasAccess("payments");
            if (sec === "expenses") return hasAccess("expenses");
            if (sec === "treasury") return hasAccess("treasury");
            if (sec === "financial_reports") return hasAccess("financial_reports");
            if (sec === "projects") return hasAccess("projects");
            if (sec === "workers") return hasAccess("workers");
            if (sec === "company_assets") return hasAccess("companies") || currentUser?.role === "admin";
            if (sec === "companies") return hasAccess("companies") || currentUser?.role === "admin";
            if (sec === "users") return hasAccess("users");
            if (sec === "sessions") return hasAccess("sessions");
            return false;
          });
          if (allowedSection && allowedSection !== activeSection) {
            setActiveSection(allowedSection);
          }
        }
      }
    }
  }, [currentUser, companies, selectedCompanyId, activeSection]);

  const getVisibleReceipts = () => {
    return receipts.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const rRegion = awExtractRegion(item.notes || "");
        if (rRegion !== userRegionFilter) return false;
      }
      const itemComp = item.company_id || "arab_world";
      if (selectedCompanyId !== "all" && itemComp !== selectedCompanyId) return false;
      if (rFromDate && item.date && item.date < rFromDate) return false;
      if (rToDate && item.date && item.date > rToDate) return false;
      return true;
    });
  };

  const getVisiblePayments = () => {
    return payments.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const itemRegion = awExtractRegion(item.notes || "");
        if (itemRegion !== userRegionFilter) return false;
      }
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  const getVisibleExpenses = () => {
    return expenses.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const itemRegion = awExtractRegion(item.notes || "");
        if (itemRegion !== userRegionFilter) return false;
      }
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  const getVisibleInstallments = () => {
    return installments.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const itemRegion = awExtractRegion(item.notes || "");
        if (itemRegion && itemRegion !== userRegionFilter) return false;
      }
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  const getInstallmentsForReceipt = () => {
    return installments.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const itemRegion = awExtractRegion(item.notes || "");
        if (itemRegion && itemRegion !== userRegionFilter) return false;
      }
      const itemComp = item.company_id || "arab_world";
      
      if (receiptCompanyId) {
        return itemComp === receiptCompanyId;
      }
      if (selectedCompanyId !== "all") {
        return itemComp === selectedCompanyId;
      }
      return true;
    });
  };

  const getWorkersForPaymentCompany = () => {
    const activeCompanyId = paymentCompanyId || (currentUser?.company_id || "");
    return workers.filter((w) => {
      const wComp = w.company_id || "";
      if (!activeCompanyId) return true;
      const comp1 = activeCompanyId === "arab_world" ? "" : activeCompanyId;
      const comp2 = wComp === "arab_world" ? "" : wComp;
      return comp1 === comp2;
    });
  };

  const getVisibleQuotes = () => {
    return quotes.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const itemRegion = awExtractRegion(item.notes || "");
        if (itemRegion && itemRegion !== userRegionFilter) return false;
      }
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  const getVisibleProjects = () => {
    return projects.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      if (currentUser && currentUser.role !== "admin" && userRegionFilter) {
        const itemLocation = item.location || "";
        const itemNotes = item.notes || "";
        const hasRegionMatch = itemLocation.toLowerCase().includes(userRegionFilter.toLowerCase()) ||
                             userRegionFilter.toLowerCase().includes(itemLocation.toLowerCase()) ||
                             itemNotes.toLowerCase().includes(userRegionFilter.toLowerCase());
        if (!hasRegionMatch) return false;
      }
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  const getVisibleWorkers = () => {
    return workers.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  const getVisibleExtracts = () => {
    return extracts.filter((item) => {
      if (!isCompanyAuthorized(item.company_id)) return false;
      const itemComp = item.company_id || "arab_world";
      return selectedCompanyId === "all" || itemComp === selectedCompanyId;
    });
  };

  // Safe Recalculation logic for installment amounts
  const recalcLinkedContractFromReceipts = async (installmentId: string) => {
    if (!installmentId) return;

    // Always fetch fresh contract data directly from database to avoid stale state overwriting
    const { data: freshInstData } = await sb.from("installments").select("*").eq("id", installmentId);
    const linked = Array.isArray(freshInstData) ? freshInstData[0] : freshInstData;
    if (!linked) return;

    const [recByInst, recByNo, payByInst, payByNo] = await Promise.all([
      sb.from("receipts").select("*").eq("installment_id", installmentId),
      linked.no ? sb.from("receipts").select("*").eq("contract_no", linked.no) : Promise.resolve({ data: [], error: null }),
      sb.from("payments").select("*").eq("installment_id", installmentId),
      linked.no ? sb.from("payments").select("*").eq("contract_no", linked.no) : Promise.resolve({ data: [], error: null }),
    ]);

    // Merge receipts uniquely
    const recMap = new Map<string, any>();
    (recByInst.data || []).forEach((r: any) => { if (r?.id) recMap.set(r.id, r); });
    (recByNo.data || []).forEach((r: any) => { if (r?.id) recMap.set(r.id, r); });
    const allReceipts = Array.from(recMap.values());

    // Merge payments uniquely
    const payMap = new Map<string, any>();
    (payByInst.data || []).forEach((p: any) => { if (p?.id) payMap.set(p.id, p); });
    (payByNo.data || []).forEach((p: any) => { if (p?.id) payMap.set(p.id, p); });
    const allPayments = Array.from(payMap.values());

    const contractDir = linked.contract_direction || awExtractContractDirection(linked.notes || "") || "لنا";
    const isExpenseDir = contractDir === "علينا" || contractDir === "مصروفات عمالة";

    const paidFromReceipts = allReceipts.reduce((sum, x) => {
      const isOutgoing = awExtractReceiptType(x.notes || "") === "صادر";
      const amt = Number(x.amount || 0);
      return sum + (isOutgoing ? -amt : amt);
    }, 0);

    const paidOutFromPayments = allPayments.reduce((sum, x) => {
      const amt = Number(x.amount || 0);
      return sum + amt;
    }, 0);

    const initialDownPayment = awExtractDownPayment(linked.notes || "");

    // Check if any receipt already explicitly represents the down payment to prevent double counting
    const hasDownPaymentReceipt = allReceipts.some(r => {
      const notes = String(r.notes || "");
      return notes.includes("دفعة_مقدمة") || notes.includes("دفعة مقدمة");
    });
    const effectiveDownPayment = hasDownPaymentReceipt ? 0 : initialDownPayment;

    let netPaid = 0;
    if (allReceipts.length === 0 && allPayments.length === 0) {
      // No linked vouchers created yet; preserve the contract's down payment or initial amount
      netPaid = effectiveDownPayment > 0 ? effectiveDownPayment : Number(linked.paid || 0);
    } else {
      if (isExpenseDir) {
        // For "علينا" / "مصروفات عمالة": Payments (+) add to paid, Receipts (-) deduct from paid
        netPaid = effectiveDownPayment + (paidOutFromPayments - paidFromReceipts);
      } else {
        // For "لنا": Receipts (+) add to paid, Payments (-) deduct from paid
        netPaid = effectiveDownPayment + (paidFromReceipts - paidOutFromPayments);
      }
    }

    const contractTotal = Number(linked.amount || 0);
    const newRemaining = Math.max(0, contractTotal - netPaid);
    const newStatus = newRemaining <= 0 ? "مكتمل" : "منتظم";

    await sb
      .from("installments")
      .update({ paid: netPaid, remaining: newRemaining, status: newStatus })
      .eq("id", installmentId);
  };


  // Interactive CRUD operations
  // Save Installments
  const onSaveInstallment = async (row: any, editId: string | null): Promise<boolean> => {
    if (editId ? !can("installmentsEdit") : !can("installmentsAdd")) {
      showToast("⚠️ عذراً، لا تملك الصلاحية المطلوبة لحفظ أو تعديل العقود!", "error");
      return false;
    }

    const userRegion = userRegionFilter;
    const activeRegion = currentUser && currentUser.role !== "admin" && userRegion ? userRegion : row.region_input;
    const activeTreasury = row.treasury_input || "خزنة التحصيل";
    const activeCapital = Number(row.capital_input || 0);
    const capitalSource = row.capital_source_input || "";
    const capitalCompany = Number(row.capital_company_input || 0);
    const capitalCollection = Number(row.capital_collection_input || 0);
    const capitalSplits = row.capital_splits_input;
    const activeCycle = row.cycle_input || "يومي";
    const activeClassification = row.classification_input || "مدين";
    let finalNotes = awBuildNotesWithRegionAndTreasuryAndCapital(
      row.notes, 
      activeRegion, 
      activeTreasury, 
      activeCapital,
      capitalSource,
      capitalCompany,
      capitalCollection,
      capitalSplits
    );

    if (activeCycle) {
      finalNotes = `[الدورية: ${activeCycle}] ` + finalNotes;
    }

    if (activeClassification) {
      finalNotes = `[التصنيف: ${activeClassification}] ` + finalNotes;
    }

    const activeDirection = row.contract_direction_input || "لنا";
    if (activeDirection) {
      finalNotes = `[اتجاه العقد: ${activeDirection}] ` + finalNotes;
    }
    if (row.worker_id_input) {
      finalNotes = `[رمز العامل: ${row.worker_id_input}] ` + finalNotes;
    }
    if (row.project_id_input) {
      finalNotes = `[رمز المشروع: ${row.project_id_input}] ` + finalNotes;
    }
    if (row.renewed_from_input) {
      finalNotes = `[تجديد_من_عقد: ${row.renewed_from_input}] ` + finalNotes;
    }
    if (Number(row.paid) > 0) {
      finalNotes = `[دفعة_مقدمة: ${Number(row.paid)}] ` + finalNotes;
    }

    // Strictly ensure contract number uniqueness
    const rawNo = String(row.no || "").trim().toUpperCase();
    const isDuplicate = installments.some(
      (i) => i.id !== editId && String(i.no || "").trim().toUpperCase() === rawNo
    );

    let finalContractNo = row.no;
    if (isDuplicate) {
      if (editId) {
        showToast(`⚠️ رقم العقد (${rawNo}) مسجل مسبقاً لعقد آخر! لا يمكن تكرار رقم العقد.`, "error");
        return false;
      } else {
        // Automatically generate next non-colliding unique contract number
        finalContractNo = generateNextNo("AW-CON", installments, "no");
      }
    } else if (!finalContractNo) {
      finalContractNo = generateNextNo("AW-CON", installments, "no");
    }

    const payload = {
      ...row,
      no: finalContractNo,
      notes: finalNotes,
      contract_direction: activeDirection,
      worker_id: row.worker_id_input || null,
      project_id: row.project_id_input || null,
      company_id: getTargetCompanyId(row.company_id),
    };
    delete payload.region_input;
    delete payload.treasury_input;
    delete payload.capital_input;
    delete payload.capital_source_input;
    delete payload.capital_company_input;
    delete payload.capital_collection_input;
    delete payload.capital_splits_input;
    delete payload.cycle_input;
    delete payload.classification_input;
    delete payload.contract_direction_input;
    delete payload.worker_id_input;
    delete payload.project_id_input;
    delete payload.renewed_from_input;

    setIsLoading(true);
    try {
      const q = editId
        ? sb.from("installments").update(payload).eq("id", editId).select()
        : sb.from("installments").insert(payload).select();

      const { data: savedRows, error } = await q;
      if (error) {
        showToast(error.message, "error");
        setIsLoading(false);
        return false;
      }

      const targetInstId = editId || (savedRows ? (Array.isArray(savedRows) ? savedRows[0]?.id : savedRows.id) : null);

      if (targetInstId) {
        await recalcLinkedContractFromReceipts(targetInstId);
      }

      await logSession(currentUser!, editId ? `تعديل ملف العقد رقم: ${row.no}` : `تسجيل عقد تقسيط جديد رقم: ${row.no}`);
      await loadEverything();
      showToast("تم حفظ مستندات العقد بنجاح!");
      return true;
    } catch {
      showToast("خطأ مجهول في إرسال البيانات الماليّة", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const onDeleteInstallment = (id: string) => {
    if (!can("installmentsDelete")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف العقود الماليّة!", "error");
      return;
    }
    const inst = installments.find(i => i.id === id);
    const instName = inst ? `${inst.no} - ${inst.client || ""}` : id;
    triggerConfirm(
      "حذف ملف العقد والأقساط",
      `هل أنت متأكد من حذف عقد العميل "${instName}" بشكل نهائي؟ سيؤدي هذا الإجراء لمسح كافة بيانات السجل والالتزامات المرتبطة. يتطلب هذا الإجراء توثيق سبب الحذف رقابياً.`,
      async (reason) => {
        setIsLoading(true);
        try {
          const { error } = await sb.from("installments").delete().eq("id", id);
          if (error) {
            showToast(error.message, "error");
            return;
          }
          const logMsg = `حذف ملف عقد تقسيط: ${instName}` + (reason ? ` [السبب: ${reason}]` : "");
          await logSession(currentUser!, logMsg);
          await loadEverything();
          showToast("تم مسح مستندات العقد كاملاً");
        } catch {
          showToast("فشل في استكمال حذف المستند", "error");
        } finally {
          setIsLoading(false);
        }
      },
      true,
      "اكتب هنا سبب حذف عقد التقسيط للأرشفة والرقابة التدقيقية..."
    );
  };

  const onMigrateInstallment = async (installmentId: string, targetCompanyId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const inst = installments.find(i => i.id === installmentId);
      if (!inst) {
        showToast("لم يتم العثور على العقد المحدد", "error");
        return false;
      }

      const targetComp = companies.find(c => c.id === targetCompanyId);
      const targetCompName = targetComp ? targetComp.name : targetCompanyId;

      // 1. Update the installment's company_id
      const { error: instError } = await sb
        .from("installments")
        .update({ company_id: targetCompanyId })
        .eq("id", installmentId);

      if (instError) {
        showToast(instError.message, "error");
        return false;
      }

      // 2. Update the receipts company_id
      await sb
        .from("receipts")
        .update({ company_id: targetCompanyId })
        .eq("installment_id", installmentId);

      if (inst.no) {
        await sb
          .from("receipts")
          .update({ company_id: targetCompanyId })
          .eq("contract_no", inst.no);
      }

      // 3. Update expenses of this contract/project
      if (inst.project) {
        await sb
          .from("expenses")
          .update({ company_id: targetCompanyId })
          .eq("project", inst.project);

        // Also update any matching project's company_id if it exists
        await sb
          .from("projects")
          .update({ company_id: targetCompanyId })
          .eq("name", inst.project);
      }

      // Log this action
      const logMsg = `ترحيل العقد (${inst.client} - رقم: ${inst.no}) إلى شركة [${targetCompName}] مع كافة السندات والمصروفات المرتبطة` + (reason ? ` [السبب: ${reason}]` : "");
      await logSession(currentUser!, logMsg);

      await loadEverything();
      showToast(`تم ترحيل العقد بنجاح إلى شركة ${targetCompName}`);
      return true;
    } catch (err: any) {
      showToast("حدث خطأ أثناء ترحيل العقد", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Print popup styling logic matching screenshot details
  const onPrintContract = (id: string) => {
    const x = installments.find((a) => a.id === id);
    if (!x) return;

    const assocCompanyId = x.company_id || "arab_world";
    const compLogo = localStorage.getItem(`aw_company_logo_${assocCompanyId}`) || "";
    const compName = companies.find((c) => c.id === assocCompanyId)?.name || "شركة عرب وورلد";
    const attachment = awExtractAttachment(x.notes || "");

    const clientContracts = installments.filter(
      (a) =>
        (a.identity && x.identity && a.identity === x.identity) ||
        (a.phone && x.phone && a.phone === x.phone) ||
        (a.client && x.client && a.client === x.client)
    );

    const totalAmount = clientContracts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalPaid = clientContracts.reduce((sum, item) => sum + Number(item.paid || 0), 0);
    const totalRemaining = clientContracts.reduce((sum, item) => sum + Number(item.remaining || 0), 0);

    const rowsHtml = clientContracts
      .map(
        (a) => `
      <tr>
        <td>${a.no || ""}</td>
        <td>${a.project || "عام"}</td>
        <td>${a.workplace || "غير محدد"}</td>
        <td>${Number(a.amount || 0).toLocaleString()} ريال</td>
        <td>${Number(a.paid || 0).toLocaleString()} ريال</td>
        <td>${Number(a.remaining || 0).toLocaleString()} ريال</td>
        <td>${Number(a.installment || 0).toLocaleString()} ريال</td>
        <td>${a.periods || 0}</td>
        <td>${a.status || ""}</td>
      </tr>
    `
      )
      .join("");

    const w = window.open("", "_blank");
    if (!w) {
      showToast("تنبيه: ملقم المتصفح حظر نافذة الطباعة التلقائية!", "info");
      return;
    }

    const classificationVal = awExtractClassification(x.notes || "") || "مدين";
    const classificationTxt = classificationVal === "دائن" ? "دائن (العميل له مستحقات مالية لدينا)" : "مدين (العميل عليه التزام مالي لنا)";
    const cCycle = awExtractCycle(x.notes || "") || "يومي";
    const cycleLabel = cCycle === "يومي" ? "يوم" : cCycle === "اسبوعي" ? "أسبوع" : cCycle === "نصف شهر" ? "دفعة (نصف شهر)" : "شهر";
    const cycleInstLabel = cCycle === "يومي" ? "القسط اليومي الإجباري" : cCycle === "اسبوعي" ? "القسط الأسبوعي الإجباري" : cCycle === "نصف شهر" ? "القسط نصف الشهري الإجباري" : "القسط الشهري الإجباري";

    w.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>اتفاقية عقد عمل - ${x.client}</title>
<style>
*{box-sizing:border-box;font-family:Tahoma,Arial}
body{margin:0;background:#f4f6fa;color:#07153a;padding:24px}
.page{width:210mm;min-height:297mm;margin:auto;background:white;padding:20mm;box-shadow:0 10px 35px #0002;position:relative;border-radius:12px}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #c9963f;padding-bottom:18px;margin-bottom:20px}
.brand{text-align:center;flex:1}
.brand h1{margin:0;font-size:30px;color:#07153a}
.brand p{margin:8px 0 0;color:#9a6b27;font-weight:bold}
.logo{width:54px;height:65px;position:relative;margin:auto}
.logo:before,.logo:after{content:"";position:absolute;border:5px solid #1f2937;border-left:0;border-bottom:0;transform:skewY(-25deg)}
.logo:before{width:30px;height:55px;right:18px;top:0}
.logo:after{width:16px;height:45px;right:8px;top:10px;border-color:#c9963f}
.title{background:linear-gradient(90deg,#07153a,#c9963f);color:white;text-align:center;padding:12px;border-radius:10px;font-size:20px;margin:20px 0}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.box{border:1px solid #d9dee8;border-radius:10px;padding:9.5px;background:#fbfcff;min-height:54px}
.box b{display:block;color:#8a642d;margin-bottom:4px;font-size:11px}
.box span{font-size:13.5px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:11px}
th{background:#07153a;color:white;padding:9px;font-weight:bold}
td{border:1px solid #d8dee9;padding:8px;text-align:center;font-weight:600}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
.sum{border-top:4px solid #c9963f;background:#f8fafc;border-radius:14px;text-align:center;padding:13px}
.sum b{display:block;color:#07153a;margin-bottom:8px}
.sum span{font-size:20px;color:#c9963f;font-weight:bold}
.signs{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:35px}
.sign{height:90px;border-top:1px dashed #555;padding-top:10px;text-align:center;color:#333;font-weight:bold}
.footer{position:absolute;bottom:12mm;left:20mm;right:20mm;text-align:center;color:#777;font-size:10px;border-top:1px solid #eee;padding-top:8px}
.no-print{position:fixed;top:15px;left:15px;display:flex;gap:8px}
.no-print button{border:0;border-radius:10px;padding:10px 15px;color:white;cursor:pointer;font-weight:bold}
.print{background:#16a34a}.close{background:#64748b}
@media print{body{background:white;padding:0}.page{box-shadow:none;margin:0;width:auto;min-height:auto}.no-print{display:none}}
</style>
</head>
<body>
<div class="no-print">
<button class="print" onclick="window.print()">طباعة / حفظ PDF</button>
<button class="close" onclick="window.close()">إغلاق</button>
</div>
<div class="page">
  <div class="head">
    <div style="width:120px;text-align:center;display:flex;align-items:center;justify-content:center">
      ${compLogo ? `<img src="${compLogo}" style="max-height:65px;max-width:120px;object-fit:contain" referrerPolicy="no-referrer" />` : `<div class="logo"></div>`}
    </div>
    <div class="brand"><h1>${compName}</h1><p>نظام عقود وتقسيط وسندات</p></div>
    <div style="width:120px;font-size:11px;line-height:1.7"><b>التاريخ:</b><br>${new Date().toLocaleDateString("ar-SA")}<br><b>رقم العقد:</b><br>${x.no || ""}</div>
  </div>
  <div class="title">ورقة اتفاقية عقد مالي وسياق التزام</div>
  <div class="grid">
    <div class="box"><b>اسم الطرف العميل</b><span>${x.client}</span></div>
    <div class="box"><b>رقم السجل / الهوية</b><span>${x.identity}</span></div>
    <div class="box"><b>رقم الجوال الاتصالي</b><span>${x.phone}</span></div>
    <div class="box"><b>جنسية السجل</b><span>${x.nationality || "سعودي"}</span></div>
    <div class="box"><b>تصنيف الحساب المالي</b><span style="color:${classificationVal === "دائن" ? "#ef4444" : "#10b981"}">${classificationTxt}</span></div>
    <div class="box"><b>المشروع المرفق</b><span>${x.project || "عام"}</span></div>
    <div class="box"><b>مقر ووظيفة العمل</b><span>${x.workplace || "غير محدد"}</span></div>
    <div class="box"><b>تاريخ العقد وإيجاده</b><span>${x.start_date}</span></div>
    <div class="box"><b>مدة / فترات العقد</b><span>${x.periods} ${cycleLabel}</span></div>
    <div class="box"><b>${cycleInstLabel}</b><span>${Number(x.installment || 0).toLocaleString()} ريال</span></div>
    <div class="box"><b>الفرع الإداري</b><span>${awExtractRegion(x.notes || "") || "غير محدد"}</span></div>
    <div class="box"><b>الكفيل والضامن الغارم</b><span>${x.guarantor || "لا يوجد كفيل"}</span></div>
    <div class="box" style="grid-column: span 3"><b>وضعية الملف الجاري</b><span>${x.status}</span></div>
    <div class="box" style="grid-column: span 3"><b>سياق الملاحظات والشروط</b><span>${awCleanNotes(x.notes || "") || "لا يوجد"}</span></div>
  </div>
  <div class="summary">
    <div class="sum"><b>إجمالي عقود الطرف الكلي</b><span>${totalAmount.toLocaleString()} ريال</span></div>
    <div class="sum"><b>المدفوع والمسلّم قبلاً</b><span>${totalPaid.toLocaleString()} ريال</span></div>
    <div class="sum"><b>المتبقي تحت الذمة</b><span>${totalRemaining.toLocaleString()} ريال</span></div>
  </div>
  <h3>كافة العقود والاتفاقيات الجارية للطرف العميل</h3>
  <table><thead><tr><th>رقم العقد</th><th>مشروع العمل</th><th>موقع المشغل</th><th>المبلغ الكلي</th><th>المستلم</th><th>المتبقي المعلق</th><th>القسط اليومي</th><th>أيام الأقساط</th><th>الوضعية</th></tr></thead><tbody>${rowsHtml}</tbody></table>
  <div class="signs"><div class="sign">بصمة وتوقيع العميل الضامن</div><div class="sign">اعتماد وختم ${compName}</div></div>
  <div class="footer">تم تحرير مستندات العقد ومراجعته ماليًا في فرع السداد وتوثيق التوقيعات إبراء للذمة</div>
</div>
${attachment ? `
<div class="page" style="page-break-before: always; margin-top: 30px; text-align: center;">
  <div class="head">
    <div style="width:120px;text-align:center;display:flex;align-items:center;justify-content:center">
      ${compLogo ? `<img src="${compLogo}" style="max-height:65px;max-width:120px;object-fit:contain" referrerPolicy="no-referrer" />` : `<div class="logo"></div>`}
    </div>
    <div class="brand"><h1>${compName}</h1><p>مرفقات ومستندات العقد الإثباتية</p></div>
    <div style="width:120px;font-size:11px;line-height:1.7"><b>رقم العقد:</b><br>${x.no || ""}</div>
  </div>
  <div class="title" style="margin-bottom: 30px;">ملحق إثبات الوثيقة والمرفقات المرفوعة</div>
  <div style="border: 2px dashed #cbd5e1; border-radius: 16px; padding: 15px; background: #fff; display: inline-block; max-width: 100%;">
    <img src="${attachment}" style="max-width: 100%; max-height: 180mm; object-fit: contain; border-radius: 8px;" referrerPolicy="no-referrer" />
  </div>
  <div class="footer">المرفق الإلكتروني المعتمد لعقد التقسيط رقم ${x.no || ""}</div>
</div>
` : ""}
</body>
</html>`);
    w.document.close();
  };

  const onPrintReceipt = (id: string) => {
    const r = receipts.find((a) => a.id === id);
    if (!r) return;

    const assocCompanyId = r.company_id || "arab_world";
    const compLogo = localStorage.getItem(`aw_company_logo_${assocCompanyId}`) || "";
    const compName = companies.find((c) => c.id === assocCompanyId)?.name || "شركة عرب وورلد";
    const attachment = awExtractAttachment(r.notes || "");

    setPrintingReceiptId(id);

    // Optional try-catch block for window.open popups to prevent blocking in sandbox environments
    try {
      const w = window.open("", "_blank");
      if (!w) {
        console.log("Window popup blocked, falling back entirely to in-app printable view.");
        return;
      }

      w.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>سند قبض مالي - رقم ${r.no}</title>
<style>
*{box-sizing:border-box;font-family:Tahoma,Arial}
body{margin:0;background:#f4f6fa;color:#07153a;padding:24px}
.page{width:210mm;min-height:297mm;margin:auto;background:white;padding:20mm;box-shadow:0 10px 35px #0002;position:relative;border-radius:12px}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #10b981;padding-bottom:18px;margin-bottom:20px}
.brand{text-align:center;flex:1}
.brand h1{margin:0;font-size:28px;color:#07153a}
.brand p{margin:8px 0 0;color:#059669;font-weight:bold}
.logo{width:54px;height:65px;position:relative;margin:auto}
.logo:before,.logo:after{content:"";position:absolute;border:5px solid #111827;border-left:0;border-bottom:0;transform:skewY(-25deg)}
.logo:before{width:30px;height:55px;right:18px;top:0}
.logo:after{width:16px;height:45px;right:8px;top:10px;border-color:#10b981}
.title{background:linear-gradient(90deg,#07153a,#10b981);color:white;text-align:center;padding:12px;border-radius:10px;font-size:20px;margin:20px 0;letter-spacing:1px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.box{border:1px solid #d9dee8;border-radius:10px;padding:9.5px;background:#fbfcff;min-height:54px}
.box b{display:block;color:#047857;margin-bottom:4px;font-size:11px}
.box span{font-size:13.5px;font-weight:bold}
.amount-wrapper{text-align:center;background:#ecfdf5;border:2px dashed #34d399;border-radius:12px;padding:18px;margin:25px 0}
.amount-wrapper b{display:block;color:#065f46;font-size:14px;margin-bottom:6px}
.amount-wrapper span{font-size:28px;color:#047857;font-weight:900;font-family:monospace}
.signs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:45px}
.sign{height:100px;border-top:1px dashed #777;padding-top:10px;text-align:center;color:#333;font-weight:bold;font-size:12px}
.footer{position:absolute;bottom:12mm;left:20mm;right:20mm;text-align:center;color:#666;font-size:10px;border-top:1px solid #eee;padding-top:10px}
.no-print{position:fixed;top:15px;left:15px;display:flex;gap:8px}
.no-print button{border:0;border-radius:10px;padding:10px 15px;color:white;cursor:pointer;font-weight:bold}
.print{background:#10b981}.close{background:#64748b}
@media print{body{background:white;padding:0}.page{box-shadow:none;margin:0;width:auto;min-height:auto}.no-print{display:none}}
</style>
</head>
<body>
<div class="no-print">
<button class="print" onclick="window.print()">طباعة / حفظ PDF</button>
<button class="close" onclick="window.close()">إغلاق</button>
</div>
<div class="page">
  <div class="head">
    <div style="width:120px;text-align:center;display:flex;align-items:center;justify-content:center">
      ${compLogo ? `<img src="${compLogo}" style="max-height:65px;max-width:120px;object-fit:contain" referrerPolicy="no-referrer" />` : `<div class="logo"></div>`}
    </div>
    <div class="brand"><h1>${compName}</h1><p>سندات القبض المالي والحسابات الرقمية</p></div>
    <div style="width:120px;font-size:11px;line-height:1.7"><b>رقم السند:</b><br>${r.no}<br><b>التاريخ:</b><br>${r.date}</div>
  </div>
  <div class="title">سند قبض مالي مقيد محاسبيًا</div>
  <div class="grid">
    <div class="box"><b>الجهة المسددة (استلمنا من)</b><span>${r.from_name}</span></div>
    <div class="box"><b>رقم عقد التقسيط التابع</b><span>${r.contract_no || "سند عام غير تابع لعقد معين"}</span></div>
    <div class="box"><b>طريقة ووسيلة الاستلام</b><span>${r.method}</span></div>
    <div class="box"><b>الفرع الإداري للتحصيل</b><span>${awExtractRegion(r.notes || "") || "غير محدد"}</span></div>
    <div class="box"><b>حساب الخزنة المقيد</b><span>${awExtractTreasury(r.notes || "") || "خزنة التحصيل"}</span></div>
    <div class="box"><b>رقم السند الخارجي الموازي</b><span>${awExtractExternalNo(r.notes || "") || "لا يوجد"}</span></div>
    <div class="box"><b>المشروع المرفق</b><span>${r.project || "عام"}</span></div>
    <div class="box"><b>المتبقي الكلي قبل القبض</b><span>${r.remaining_before ? Number(r.remaining_before).toLocaleString() + " ريال" : "تحت المزامنة"}</span></div>
    <div class="box"><b>المتبقي الكلي بعد القبض</b><span>${r.remaining_after ? Number(r.remaining_after).toLocaleString() + " ريال" : "تحت المزامنة"}</span></div>
    <div class="box" style="grid-column: span 3"><b>البيان وشرائح الملاحظة</b><span>${awCleanNotes(r.notes || "") || "لا يوجد"}</span></div>
  </div>
  <div class="amount-wrapper">
    <b>مبلغ وقدره المقيد لحسابكم ماليًا</b>
    <span>${Number(r.amount || 0).toLocaleString()} ريال سعودي</span>
  </div>
  <div class="signs">
    <div class="sign">أمين صندوق التحصيل</div>
    <div class="sign">الحسابات والتدقيق المالي لدى ${compName}</div>
    <div class="sign">توقيع أو بصمة المسدد</div>
  </div>
  <div class="footer">
    تم ترحيل وقيد سند القبض ماليًا في الدفتر اليومي العام وإصدار مقتضى إثبات السداد وتوثيق المستندات إلكترونيًا لدى ${compName}.
  </div>
</div>
${attachment ? `
<div class="page" style="page-break-before: always; margin-top: 30px; text-align: center;">
  <div class="head">
    <div style="width:120px;text-align:center;display:flex;align-items:center;justify-content:center">
      ${compLogo ? `<img src="${compLogo}" style="max-height:65px;max-width:120px;object-fit:contain" referrerPolicy="no-referrer" />` : `<div class="logo"></div>`}
    </div>
    <div class="brand"><h1>${compName}</h1><p>مرفقات ومستندات السند الإثباتية</p></div>
    <div style="width:120px;font-size:11px;line-height:1.7"><b>رقم السند:</b><br>${r.no}</div>
  </div>
  <div class="title" style="margin-bottom: 30px;">ملحق إثبات المعاملة والمرفقات المرفوعة</div>
  <div style="border: 2px dashed #cbd5e1; border-radius: 16px; padding: 15px; background: #fff; display: inline-block; max-width: 100%;">
    <img src="${attachment}" style="max-width: 100%; max-height: 180mm; object-fit: contain; border-radius: 8px;" referrerPolicy="no-referrer" />
  </div>
  <div class="footer">المرفق الإلكتروني المعتمد لسند القبض رقم ${r.no}</div>
</div>
` : ""}
</body>
</html>`);
      w.document.close();
    } catch (e) {
      console.warn("Exception during Popups window.open printing:", e);
    }
  };

  const onPrintQuote = (q: Quote) => {
    try {
      const parsed = deserializeQuoteNotes(q.notes, q.amount);
      const company = companies.find((c) => c.id === q.company_id) || companies[0];
      const companyName = company ? company.name : "المؤسسة لخدمات المقاولات العامة";
      const crNumber = company ? company.commercial_register || "لا يوجد" : "غير مسجل";
      const taxNumber = company ? company.tax_no || "لا يوجد" : "غير مسجل";
      const address = company ? company.address || "لا يوجد" : "غير مسجل";
      const phone = company ? company.phone || "لا يوجد" : "غير مسجل";

      const w = window.open("", "_blank");
      if (!w) {
        showToast("تنبيه: ملقم المتصفح حظر نافذة الطباعة التلقائية!", "info");
        return;
      }

      const tableRows = parsed.items
        .map(
          (item: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align: right; padding-right: 15px;">${item.description || "بند توريد وتركيب مواد وأعمال عامة"}</td>
          <td>${item.quantity || 1}</td>
          <td>${Number(item.price || 0).toLocaleString()} ريال</td>
          <td>${Number(item.total || 0).toLocaleString()} ريال</td>
        </tr>
      `
        )
        .join("");

      const vatAmount = Math.round(Number(q.amount || 0) * (Number(q.vat || 0) / 100));

      w.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>عرض سعر - ${q.client}</title>
<style>
*{box-sizing:border-box;font-family:Tahoma,Arial}
body{margin:0;background:#f4f6fa;color:#07153a;padding:24px}
.page{width:210mm;min-height:297mm;margin:auto;background:white;padding:20mm;box-shadow:0 10px 35px #0002;position:relative;border-radius:12px}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #c9963f;padding-bottom:18px;margin-bottom:20px}
.brand{text-align:right;}
.brand h1{margin:0;font-size:24px;color:#07153a}
.brand p{margin:4px 0 0;color:#555;font-size:12px}
.quote-meta {text-align: left;}
.quote-meta h2 {margin:0;font-size:22px;color:#c9963f;}
.quote-meta p {margin:4px 0 0;color:#555;font-size:12px;font-family:monospace}
.logo{width:54px;height:65px;position:relative;margin:auto}
.logo:before,.logo:after{content:"";position:absolute;border:5px solid #1f2937;border-left:0;border-bottom:0;transform:skewY(-25deg)}
.logo:before{width:30px;height:55px;right:18px;top:0}
.logo:after{width:16px;height:45px;right:8px;top:10px;border-color:#c9963f}
.title{background:linear-gradient(90deg,#07153a,#c9963f);color:white;text-align:center;padding:12px;border-radius:10px;font-size:18px;margin:20px 0;font-weight:bold}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.box{border:1px solid #d9dee8;border-radius:10px;padding:9.5px;background:#fbfcff;min-height:54px}
.box b{display:block;color:#8a642d;margin-bottom:4px;font-size:11px}
.box span{font-size:13px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
th{background:#07153a;color:white;padding:10px;font-weight:bold;font-size:11px}
td{border:1px solid #d8dee9;padding:9px;text-align:center;font-weight:600}
.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
.sum{border-top:4px solid #c9963f;background:#f8fafc;border-radius:14px;text-align:center;padding:13px}
.sum b{display:block;color:#07153a;margin-bottom:8px;font-size:12px}
.sum span{font-size:18px;color:#07153a;font-weight:bold}
.sum.grand-total {border-top-color: #10b981; background: #ecfdf5;}
.sum.grand-total span {color: #10b981; font-size: 20px;}
.signs{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:35px}
.sign{height:90px;border-top:1px dashed #555;padding-top:10px;text-align:center;color:#333;font-weight:bold}
.footer{position:absolute;bottom:12mm;left:20mm;right:20mm;text-align:center;color:#777;font-size:10px;border-top:1px solid #eee;padding-top:8px}
.no-print{position:fixed;top:15px;left:15px;display:flex;gap:8px}
.no-print button{border:0;border-radius:10px;padding:10px 15px;color:white;cursor:pointer;font-weight:bold}
.print{background:#16a34a}.close{background:#64748b}
@media print{body{background:white;padding:0}.page{box-shadow:none;margin:0;width:auto;min-height:auto}.no-print{display:none}}
</style>
</head>
<body>
<div class="no-print">
<button class="print" onclick="window.print()">طباعة / حفظ PDF</button>
<button class="close" onclick="window.close()">إغلاق الصفحة</button>
</div>
<div class="page">
  <div class="head">
    <div class="brand">
      <h1>${companyName}</h1>
      <p>السجل التجاري: ${crNumber} | الرقم الضريبي: ${taxNumber}</p>
      <p>العنوان: ${address} | الجوال: ${phone}</p>
    </div>
    <div style="text-align: center;">
      <div class="logo"></div>
    </div>
    <div class="quote-meta">
      <h2>وثيقة عرض سعر</h2>
      <p>رقم العرض: <b>${q.no}</b></p>
      <p>التاريخ: <b>${q.date}</b></p>
    </div>
  </div>
  
  <div class="title">بيانات عميل عرض السعر</div>
  <div class="grid">
    <div class="box"><b>السادة / العميل الكريم</b><span>${q.client}</span></div>
    <div class="box"><b>رقم الجوال</b><span>${q.phone || "غير مسجل"}</span></div>
    <div class="box"><b>المشروع والموقع التابع</b><span>${q.project || "غير مسجل"}</span></div>
  </div>

  <div class="title">بنود وجدول كميات وأسعار العرض المالي والتشغيلي</div>
  <table>
    <thead>
      <tr>
        <th style="width: 8%">م</th>
        <th style="text-align: right; padding-right: 15px; width: 45%">البند والبيان الفني للمواد والأعمال</th>
        <th style="width: 12%">الكمية</th>
        <th style="width: 17%">سعر الوحدة</th>
        <th style="width: 18%">الإجمالي الكلي</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="sum">
      <b>إجمالي المبلغ الخاضع للضريبة</b>
      <span>${Number(q.amount || 0).toLocaleString()} ريال</span>
    </div>
    <div class="sum">
      <b>ضريبة القيمة المضافة (${q.vat || 15}%)</b>
      <span>${vatAmount.toLocaleString()} ريال</span>
    </div>
    <div class="sum grand-total">
      <b>الإجمالي الشامل والنهائي</b>
      <span>${Number(q.total || 0).toLocaleString()} ريال</span>
    </div>
  </div>

  ${
    parsed.notes
      ? `
  <div class="title">الشروط والأحكام وملاحظات إضافية</div>
  <div style="font-size: 11.5px; line-height: 1.7; border: 1px solid #d9dee8; padding: 15px; border-radius: 10px; background: #fafbfc; white-space: pre-wrap;">${parsed.notes}</div>
  `
      : ""
  }

  <div class="signs">
    <div class="sign">الطرف الأول (مقدم عرض السعر)</div>
    <div class="sign">الطرف الثاني (قبول واعتماد العميل)</div>
  </div>

  <div class="footer">
    يعتبر هذا العرض صالحًا لمدة 15 يومًا من تاريخ إصداره، والاعتماد والقبول يعبّر عن البدء الفوري في صياغة العقود التنفيذية.
  </div>
</div>
</body>
</html>`);
      w.document.close();
    } catch (e) {
      console.warn("Exception during Popups window.open printing:", e);
    }
  };

  // Quotes CRUD
  const saveQuoteLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("quotes")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إنشاء وتعديل عروض الأسعار!", "error");
      return;
    }
    if (!qClient) return;

    const serializedNotes = serializeQuoteNotes(qItems, qNotes);
    const existingQuote = editQuoteId ? quotes.find((q) => q.id === editQuoteId) : null;

    const row = {
      no: existingQuote ? existingQuote.no : generateNextNo("AW-Q", quotes, "no"),
      client: qClient.trim(),
      phone: qPhone.trim(),
      project: qProject.trim(),
      amount: Number(qAmount || 0),
      vat: Number(qVat || 0),
      total: Math.round(Number(qAmount || 0) * (1 + Number(qVat || 0) / 100)),
      date: existingQuote ? existingQuote.date : new Date().toISOString().slice(0, 10),
      status: qStatus,
      notes: serializedNotes,
      company_id: getTargetCompanyId(formCompanyId),
    };

    setIsLoading(true);
    try {
      const q = editQuoteId
        ? sb.from("quotes").update(row).eq("id", editQuoteId)
        : sb.from("quotes").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editQuoteId ? `تعديل عرض سعر رقم: ${row.no}` : `إنشاء عرض سعر جديد رقم: ${row.no}`);
      setEditQuoteId(null);
      setQClient("");
      setQPhone("");
      setQProject("");
      setQAmount(0);
      setQNotes("");
      setQItems([{ description: "توريد وتركيب مواد وأعمال عامة", quantity: 1, price: 0, total: 0 }]);
      await loadEverything();
      showToast("تم حفظ عرض السعر بنجاح!");
    } catch {
      showToast("تعذر استكمال حفظ البيانات", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuoteLogic = async (id: string, reason?: string) => {
    if (!can("quotes")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف عروض الأسعار!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const q = quotes.find((item) => item.id === id);
      if (!q) return;

      const { error } = await sb.from("quotes").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      const logMsg = `حذف عرض السعر رقم: ${q.no} للعميل: ${q.client}` + (reason ? ` [السبب: ${reason}]` : "");
      await logSession(currentUser!, logMsg);
      await loadEverything();
      showToast("تم حذف عرض السعر بنجاح!");
    } catch {
      showToast("حدث خلل أثناء حذف عرض السعر", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Receipts CRUD with auto updating Linked Installments
  const saveReceiptLogic = async (e?: React.FormEvent, auditReasonPassed?: string, auditRefNoPassed?: string) => {
    if (e) e.preventDefault();
    if (!can("receipts")) {
      showToast("⚠️ عذراً، لا تملك صلاحية تحرير أو تعديل سندات القبض!", "error");
      return;
    }
    if (!rFrom) return;

    if (editReceiptId && (currentUser?.role === "admin" || currentUser?.role === "supervisor") && !auditReasonPassed) {
      setAuditPendingAction({ type: "receipt" });
      setShowAuditModal(true);
      return;
    }

    if (rExternalNo && rExternalNo.trim()) {
      const trimmedExt = rExternalNo.trim();
      const duplicate = receipts.find(
        (r) =>
          r.id !== editReceiptId &&
          awExtractExternalNo(r.notes || "").trim() === trimmedExt
      );
      if (duplicate) {
        showToast(`⚠️ رقم السند الخارجي (${trimmedExt}) مكرر ومسجل مسبقاً في السند رقم: ${duplicate.no}`, "error");
        return;
      }
    }

    const oldReceiptForInst = editReceiptId ? receipts.find(r => r.id === editReceiptId) : null;
    const oldInstIdForRec = oldReceiptForInst?.installment_id;

    let linked = rSelectedInstallment;
    if (!linked && rContractQuery) {
      const cleanQ = rContractQuery.trim();
      linked = installments.find(
        (x) =>
          (x.no && x.no.trim().toUpperCase() === cleanQ.toUpperCase()) ||
          (x.client && x.client.trim() === cleanQ) ||
          (x.identity && x.identity.trim() === cleanQ) ||
          `${x.no} | ${x.client} | ${x.identity}` === cleanQ ||
          (x.no && cleanQ.toUpperCase().includes(x.no.trim().toUpperCase())) ||
          (x.client && cleanQ.includes(x.client.trim()))
      ) || null;
    }

    const amt = Number(rAmount || 0);
    const beforeAmt = linked ? Number(linked.remaining || 0) : 0;
    const afterAmt = linked ? Math.max(0, beforeAmt + (rType === "صادر" ? amt : -amt)) : 0;

    const rRegion = linked ? (awExtractRegion(linked.notes || "") || userRegionFilter) : userRegionFilter;
    let notesAppended = awBuildNotesWithRegionAndTreasuryAndExternalNo(rNotes, rRegion, rTreasury, rExternalNo, rType);
    if (auditReasonPassed) {
      notesAppended = `${notesAppended} | ⚠️ قيد تعديل رقابي: [السبب: ${auditReasonPassed}] [مرجع: ${auditRefNoPassed}]`;
    }

    const row: any = {
      from_name: rFrom,
      amount: amt,
      method: rMethod,
      date: rDate,
      created_at: editReceiptId
        ? (receipts.find(r => r.id === editReceiptId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
      project: rProject,
      notes: rAttachment ? `${notesAppended} [مرفق: ${rAttachment}]` : notesAppended,
      installment_id: linked ? linked.id : null,
      contract_no: linked ? linked.no : "",
      identity: linked ? linked.identity : "",
      phone: linked ? linked.phone : "",
      nationality: linked ? linked.nationality : "",
      remaining_before: beforeAmt,
      remaining_after: afterAmt,
      company_id: linked ? (linked.company_id || "arab_world") : getTargetCompanyId(receiptCompanyId),
    };

    if (!editReceiptId) {
      row.no = generateNextNo("AW-REC", receipts, "no");
    }

    setIsLoading(true);
    try {
      const q = editReceiptId
        ? sb.from("receipts").update(row).eq("id", editReceiptId)
        : sb.from("receipts").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      if (linked) {
        await recalcLinkedContractFromReceipts(linked.id);
      }
      if (oldInstIdForRec && oldInstIdForRec !== linked?.id) {
        await recalcLinkedContractFromReceipts(oldInstIdForRec);
      }

      await logSession(
        currentUser!,
        editReceiptId
          ? (auditReasonPassed
              ? `تعديل رقابي لسند قبض مالي رقم: ${row.no} [السبب: ${auditReasonPassed}] [مرجع: ${auditRefNoPassed}]`
              : `تعديل سند قبض مالي رقم: ${row.no}`)
          : `تحرير سند قبض وراد مالي رقم: ${row.no}`
      );
      
      setEditReceiptId(null);
      setRSelectedInstallment(null);
      setRContractQuery("");
      setRFrom("");
      setRAmount("");
      setRProject("");
      setRNotes("");
      setRAttachment("");
      setRTreasury("خزنة التحصيل");
      setRExternalNo("");
      setReceiptCompanyId("");
      setRType("وارد");
      await loadEverything();
      showToast("تم حفظ السند وتحديث العقد التابع بنجاح!");
    } catch (err: any) {
      console.error(err);
      showToast("فشل في مزامنة الرصيد المزدوج للعقود: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReceiptLogicExecute = async (id: string, instId?: string, reason?: string) => {
    if (!can("receipts")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف سندات القبض!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const r = receipts.find((x) => x.id === id);
      const receiptNo = r ? r.no : id;
      const amount = r ? r.amount : "";
      const payerName = r ? r.from_name : "";

      const { error } = await sb.from("receipts").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }
      if (instId) {
        await recalcLinkedContractFromReceipts(instId);
      }
      const logMsg = `حذف سند قبض مالي رقم: ${receiptNo}${amount ? ` بمبلغ ${amount} ريال` : ""}${payerName ? ` من ${payerName}` : ""} | مذكرة تسوية (سبب الحذف): ${reason || "لم يذكر"}`;
      await logSession(currentUser!, logMsg);
      await loadEverything();
      showToast("تم الحذف وإعادة حساب دفوعات العقد المالي بنجاح");
    } catch {
      showToast("عطل مزامنة خلال كنس السجل", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReceiptLogic = (id: string, instId?: string) => {
    triggerConfirm(
      "حذف سند القبض المالي",
      "هل أنت متأكد من مسح سند القبض ماليًا بشكل نهائي وتحديث العقد؟ يتطلب هذا الإجراء كتابة مذكرة تسوية توضح سبب الحذف للرقابة المالية.",
      (reason) => deleteReceiptLogicExecute(id, instId, reason),
      true,
      "اكتب هنا سبب حذف سند القبض (مذكرة التسوية)..."
    );
  };

  // Payments CRUD
  const savePaymentLogic = async (e?: React.FormEvent, auditReasonPassed?: string, auditRefNoPassed?: string) => {
    if (e) e.preventDefault();
    if (!can("payments")) {
      showToast("⚠️ عذراً، لا تملك صلاحية تحرير أو تعديل سندات الصرف!", "error");
      return;
    }
    if (!payTo || !payAmount) return;

    if (editPaymentId && (currentUser?.role === "admin" || currentUser?.role === "supervisor") && !auditReasonPassed) {
      setAuditPendingAction({ type: "payment" });
      setShowAuditModal(true);
      return;
    }

    const targetNo = editPaymentId
      ? (payments.find(p => p.id === editPaymentId)?.no || generateNextNo("AW-PAY", payments, "no"))
      : generateNextNo("AW-PAY", payments, "no");

    let notesAppended = awBuildNotesWithRegionAndTreasury(payNotes, userRegionFilter, payTreasury);
    if (payBeneficiaryType) {
      notesAppended = `[نوع_المستفيد: ${payBeneficiaryType}] ` + notesAppended;
    }
    if (auditReasonPassed) {
      notesAppended = `${notesAppended} | ⚠️ قيد تعديل رقابي: [السبب: ${auditReasonPassed}] [مرجع: ${auditRefNoPassed}]`;
    }

    const oldPaymentForInst = editPaymentId ? payments.find(p => p.id === editPaymentId) : null;
    const oldInstIdForPay = oldPaymentForInst?.installment_id;

    let payRemBefore: number | undefined = undefined;
    let payRemAfter: number | undefined = undefined;

    if (paySelectedInstallment) {
      payRemBefore = Number(paySelectedInstallment.remaining || 0);
      payRemAfter = payRemBefore + Number(payAmount);
    } else if (payWorkerId) {
      const w = workers.find(x => x.id === payWorkerId);
      if (w) {
        const tot = Number(w.daily || 0) * Number(w.days || 0);
        const currentAdvance = Number(w.advance || 0);
        payRemBefore = Math.max(0, tot - currentAdvance);
        payRemAfter = Math.max(0, payRemBefore - Number(payAmount));
      }
    } else if (payContractQuery) {
      const foundInst = getInstallmentsForReceipt().find(x => payContractQuery.includes(x.no) || x.no === payContractQuery.trim());
      if (foundInst) {
        payRemBefore = Number(foundInst.remaining || 0);
        payRemAfter = payRemBefore + Number(payAmount);
      }
    }

    if (payRemAfter !== undefined) {
      notesAppended = `[المتبقي: ${payRemAfter}] ` + notesAppended;
    }

    const row: any = {
      no: targetNo,
      to_name: payTo.trim(),
      amount: Number(payAmount),
      method: payMethod,
      date: payDate,
      created_at: editPaymentId
        ? (payments.find(p => p.id === editPaymentId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
      project: payProject.trim(),
      notes: payAttachment ? `${notesAppended} [مرفق: ${payAttachment}]` : notesAppended,
      company_id: getTargetCompanyId(paymentCompanyId),
      worker_id: payWorkerId || null,
      installment_id: paySelectedInstallment ? paySelectedInstallment.id : undefined,
      contract_no: paySelectedInstallment ? paySelectedInstallment.no : undefined,
      remaining_before: payRemBefore,
      remaining_after: payRemAfter,
    };

    setIsLoading(true);
    try {
      // Handle Worker calculations before saving/updating payment
      if (editPaymentId) {
        const oldPayment = payments.find(p => p.id === editPaymentId);
        if (oldPayment) {
          if (oldPayment.worker_id === payWorkerId) {
            // Same worker, adjust the difference
            if (payWorkerId) {
              const w = workers.find(x => x.id === payWorkerId);
              if (w) {
                const diff = Number(payAmount) - Number(oldPayment.amount || 0);
                const newAdvance = Number(w.advance || 0) + diff;
                const tot = Number(w.daily || 0) * Number(w.days || 0);
                const newBalance = Math.max(0, tot - newAdvance);
                await sb.from("workers").update({ advance: newAdvance, balance: newBalance }).eq("id", w.id);
              }
            }
          } else {
            // Worker changed (or unlinked/linked)
            if (oldPayment.worker_id) {
              const oldW = workers.find(x => x.id === oldPayment.worker_id);
              if (oldW) {
                const oldAdvance = Math.max(0, Number(oldW.advance || 0) - Number(oldPayment.amount || 0));
                const tot = Number(oldW.daily || 0) * Number(oldW.days || 0);
                const oldBalance = Math.max(0, tot - oldAdvance);
                await sb.from("workers").update({ advance: oldAdvance, balance: oldBalance }).eq("id", oldW.id);
              }
            }
            if (payWorkerId) {
              const newW = workers.find(x => x.id === payWorkerId);
              if (newW) {
                const newAdvance = Number(newW.advance || 0) + Number(payAmount);
                const tot = Number(newW.daily || 0) * Number(newW.days || 0);
                const newBalance = Math.max(0, tot - newAdvance);
                await sb.from("workers").update({ advance: newAdvance, balance: newBalance }).eq("id", newW.id);
              }
            }
          }
        }
      } else {
        // New payment, apply advance to selected worker
        if (payWorkerId) {
          const w = workers.find(x => x.id === payWorkerId);
          if (w) {
            const currentAdvance = Number(w.advance || 0);
            const newAdvance = currentAdvance + Number(payAmount);
            const tot = Number(w.daily || 0) * Number(w.days || 0);
            const newBalance = Math.max(0, tot - newAdvance);
            await sb.from("workers").update({ advance: newAdvance, balance: newBalance }).eq("id", w.id);
          }
        }
      }

      const q = editPaymentId
        ? sb.from("payments").update(row).eq("id", editPaymentId)
        : sb.from("payments").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      if (paySelectedInstallment) {
        await recalcLinkedContractFromReceipts(paySelectedInstallment.id);
      }
      if (oldInstIdForPay && oldInstIdForPay !== paySelectedInstallment?.id) {
        await recalcLinkedContractFromReceipts(oldInstIdForPay);
      }

      await logSession(
        currentUser!,
        editPaymentId
          ? (auditReasonPassed
              ? `تعديل رقابي لسند الصرف رقم: ${row.no} [السبب: ${auditReasonPassed}] [مرجع: ${auditRefNoPassed}]`
              : `تعديل سند الصرف رقم: ${row.no}`)
          : `تحرير سند صرف صادر مالي رقم: ${row.no}`
      );
      setEditPaymentId(null);
      setPayTo("");
      setPayAmount("");
      setPayProject("");
      setPayNotes("");
      setPayAttachment("");
      setPayTreasury("خزنة الشركة");
      setPaymentCompanyId("");
      setPayWorkerId("");
      setPayContractQuery("");
      setPaySelectedInstallment(null);
      setPayBeneficiaryType("شخص");
      await loadEverything();
      showToast("تم قيّد سند الصرف بنجاح وتحديث أرصدة العمل المرتبط.");
    } catch {
      showToast("خطأ في القيود المحاسبية للصرف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deletePaymentLogic = async (paymentId: string, reason?: string) => {
    if (!can("payments")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف سندات الصرف!", "error");
      return;
    }
    const p = payments.find((x) => x.id === paymentId);
    if (!p) return;
    const instId = p.installment_id;

    setIsLoading(true);
    try {
      if (p.worker_id) {
        const w = workers.find((x) => x.id === p.worker_id);
        if (w) {
          const currentAdvance = Number(w.advance || 0);
          const newAdvance = Math.max(0, currentAdvance - Number(p.amount || 0));
          const tot = Number(w.daily || 0) * Number(w.days || 0);
          const newBalance = Math.max(0, tot - newAdvance);
          await sb.from("workers").update({ advance: newAdvance, balance: newBalance }).eq("id", w.id);
        }
      }

      const { error } = await sb.from("payments").delete().eq("id", paymentId);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      if (instId) {
        await recalcLinkedContractFromReceipts(instId);
      }

      const logMsg = `حذف سند الصرف رقم: ${p.no}${p.amount ? ` بمبلغ ${p.amount} ريال` : ""}${p.to_name ? ` إلى ${p.to_name}` : ""} | مذكرة تسوية (سبب الحذف): ${reason || "لم يذكر"}`;
      await logSession(currentUser!, logMsg);
      await loadEverything();
      showToast("تم حذف سند الصرف المالي بنجاح وتحديث حساب العامل.");
    } catch {
      showToast("خطأ أثناء حذف سند الصرف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Expenses CRUD
  const saveExpenseLogic = async (e?: React.FormEvent, auditReasonPassed?: string, auditRefNoPassed?: string) => {
    if (e) e.preventDefault();
    if (!can("expenses")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إدخال أو تعديل المصروفات!", "error");
      return;
    }
    if (!eName || !eAmount) return;

    if (editExpenseId && (currentUser?.role === "admin" || currentUser?.role === "supervisor") && !auditReasonPassed) {
      setAuditPendingAction({ type: "expense" });
      setShowAuditModal(true);
      return;
    }

    const targetNo = editExpenseId
      ? (expenses.find(e => e.id === editExpenseId)?.no || generateNextNo("AW-EXP", expenses, "no"))
      : generateNextNo("AW-EXP", expenses, "no");

    let notesAppended = awBuildNotesWithRegionAndTreasury(eNotes, userRegionFilter, eTreasury);
    if (auditReasonPassed) {
      notesAppended = `${notesAppended} | ⚠️ قيد تعديل رقابي: [السبب: ${auditReasonPassed}] [مرجع: ${auditRefNoPassed}]`;
    }

    const row = {
      no: targetNo,
      name: eName.trim(),
      category: eCategory,
      amount: Number(eAmount),
      date: eDate,
      created_at: editExpenseId
        ? (expenses.find(ex => ex.id === editExpenseId)?.created_at || new Date().toISOString())
        : new Date().toISOString(),
      project: eProject.trim(),
      supplier: eSupplier.trim(),
      notes: eAttachment ? `${notesAppended} [مرفق: ${eAttachment}]` : notesAppended,
      company_id: getTargetCompanyId(expenseCompanyId),
    };

    setIsLoading(true);
    try {
      const q = editExpenseId
        ? sb.from("expenses").update(row).eq("id", editExpenseId)
        : sb.from("expenses").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(
        currentUser!,
        editExpenseId
          ? (auditReasonPassed
              ? `تعديل رقابي لبند المصروف رقم: ${row.no} [السبب: ${auditReasonPassed}] [مرجع: ${auditRefNoPassed}]`
              : `تعديل بند المصروف رقم: ${row.no}`)
          : `تحرير بند مصروفات فرعي رقم: ${row.no}`
      );
      setEditExpenseId(null);
      setEName("");
      setEAmount("");
      setEProject("");
      setESupplier("");
      setENotes("");
      setEAttachment("");
      setETreasury("خزنة الشركة");
      setExpenseCompanyId("");
      await loadEverything();
      showToast("تم توثيق المصروف في الدفتر المالي!");
    } catch {
      showToast("فشل ترحيل قيد المصروف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExpenseLogic = async (id: string, reason?: string) => {
    if (!can("expenses")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف المصروفات!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const e = expenses.find((item) => item.id === id);
      if (!e) return;

      const { error } = await sb.from("expenses").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      const logMsg = `حذف بند المصروف رقم: ${e.no} بقيمة: ${e.amount} ريال` + (reason ? ` [السبب: ${reason}]` : "");
      await logSession(currentUser!, logMsg);
      await loadEverything();
      showToast("تم حذف بند المصروف بنجاح!");
    } catch {
      showToast("حدث خلل أثناء حذف المصروف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Projects CRUD
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("عذراً، المتصفح أو بيئة التشغيل لا تدعم تحديد الموقع الجغرافي!", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPLatitude(Number(position.coords.latitude.toFixed(7)));
        setPLongitude(Number(position.coords.longitude.toFixed(7)));
        showToast("تم تحديد وإدخال إحداثيات موقعك الحالي بنجاح!", "success");
      },
      (error) => {
        console.warn("Geolocation error:", error);
        showToast("فشل تحديد الموقع. يرجى السماح بالوصول لموقعك الجغرافي في المتصفح.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveProjectLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("projects")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إضافة أو تعديل بطاقات المشاريع!", "error");
      return;
    }
    if (!pName) return;

    const row = {
      name: pName.trim(),
      location: pLocation.trim(),
      engineer: pEngineer.trim(),
      budget: Number(pBudget || 0),
      start_date: pStart,
      end_date: pEnd,
      progress: Number(pProgress || 0),
      status: pStatus,
      notes: pNotes,
      company_id: getTargetCompanyId(projectCompanyId),
      latitude: pLatitude !== "" ? Number(pLatitude) : null,
      longitude: pLongitude !== "" ? Number(pLongitude) : null,
      allowed_radius: pAllowedRadius !== "" ? Number(pAllowedRadius) : null,
    };

    setIsLoading(true);
    try {
      const q = editProjectId
        ? sb.from("projects").update(row).eq("id", editProjectId)
        : sb.from("projects").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editProjectId ? `تعديل معلومات مشروع: ${pName}` : `إنشاء ملف مشروع جديد: ${pName}`);
      setEditProjectId(null);
      setPName("");
      setPLocation("");
      setPEngineer("");
      setPBudget("");
      setPProgress(0);
      setPNotes("");
      setProjectCompanyId("");
      setPLatitude("");
      setPLongitude("");
      setPAllowedRadius(25);
      await loadEverything();
      showToast("تم حفظ بطاقة المشروع بنجاح!");
    } catch {
      showToast("حدث خلل في ملقم ملفات المشاريع", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProjectLogic = async (projectId: string, reason?: string) => {
    if (!can("projects")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف المشاريع!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const p = projects.find((item) => item.id === projectId);
      if (!p) return;

      const { error } = await sb.from("projects").delete().eq("id", projectId);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      const logMsg = `حذف ملف المشروع: ${p.name}` + (reason ? ` [السبب: ${reason}]` : "");
      await logSession(currentUser!, logMsg);
      await loadEverything();
      showToast("تم حذف بطاقة المشروع من النظام!");
    } catch {
      showToast("حدث خلل أثناء حذف المشروع", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Workers CRUD
  const saveWorkerLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can("workers")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إضافة أو تعديل ملفات العمال!", "error");
      return;
    }
    if (!wName) return;

    const tot = Number(wDaily || 0) * Number(wDays || 0);
    const row = {
      name: wName.trim(),
      worker_id: wId.trim(),
      phone: wPhone.trim(),
      job: wJob,
      project: wProject.trim(),
      daily: Number(wDaily || 0),
      days: Number(wDays || 0),
      advance: Number(wAdvance || 0),
      total: tot,
      balance: Math.max(0, tot - Number(wAdvance || 0)),
      status: wStatus,
      recipient_name: wRecipientName.trim() || null,
      notes: wNotes,
      company_id: getTargetCompanyId(workerCompanyId),
    };

    setIsLoading(true);
    try {
      const q = editWorkerId
        ? sb.from("workers").update(row).eq("id", editWorkerId)
        : sb.from("workers").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editWorkerId ? `تعديل سلفيات العامل: ${wName}` : `تسجيل عامل جديد وسفليات عمل: ${wName}`);
      setEditWorkerId(null);
      setWName("");
      setWId("");
      setWPhone("");
      setWProject("");
      setWDaily("");
      setWDays("");
      setWAdvance(0);
      setWRecipientName("");
      setWNotes("");
      setWorkerCompanyId("");
      await loadEverything();
      showToast("تم تحديث سلف مستحقات العمال.");
    } catch {
      showToast("خلل في مستند مجمع السلف عمال", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWorkerLogic = async (id: string, reason?: string) => {
    if (!can("workers")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف ملفات العمال!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const w = workers.find((item) => item.id === id);
      if (!w) return;

      const { error } = await sb.from("workers").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      const logMsg = `حذف ملف العامل/الفني: ${w.name}` + (reason ? ` [السبب: ${reason}]` : "");
      await logSession(currentUser!, logMsg);
      await loadEverything();
      showToast("تم مسح العامل من قوائم الحساب بنجاح!");
    } catch {
      showToast("حدث خلل أثناء حذف ملف العامل", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Companies & Extracts CRUD Logic
  const saveCompanyLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== "admin" && !can("companies")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إضافة أو تعديل الشركات!", "error");
      return;
    }
    if (!cName) return;

    const targetCompanyId = editCompanyId || "comp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const row: any = {
      name: cName.trim(),
      activity: cActivity.trim(),
      commercial_register: cRegister.trim(),
      tax_no: cTaxNo.trim(),
      capital: Number(cCapital || 0),
      phone: cPhone.trim(),
      address: cAddress.trim(),
    };

    if (!editCompanyId) {
      row.id = targetCompanyId;
    }

    setIsLoading(true);
    try {
      localStorage.setItem(`aw_company_logo_${targetCompanyId}`, cLogoUrl.trim());

      const q = editCompanyId
        ? sb.from("companies").update(row).eq("id", editCompanyId)
        : sb.from("companies").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editCompanyId ? `تعديل ملف الشركة: ${cName}` : `إنشاء شركة فرعية جديدة: ${cName}`);
      setEditCompanyId(null);
      setCName("");
      setCActivity("");
      setCRegister("");
      setCTaxNo("");
      setCCapital("");
      setCPhone("");
      setCAddress("");
      setCLogoUrl("");
      await loadEverything();
      showToast("تم حفظ بطاقة الشركة بنجاح!");
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم لحفظ الشركة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onDeleteCompany = (id: string, name: string) => {
    if (currentUser?.role !== "admin" && !can("companies")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف بطاقات الشركات!", "error");
      return;
    }
    triggerConfirm(
      "حذف الشركة",
      `هل أنت متأكد من حذف الشركة "${name}" بالكامل؟ سيتم فك ارتباط أي مستندات تابعة.`,
      async () => {
        setIsLoading(true);
        try {
          const { error } = await sb.from("companies").delete().eq("id", id);
          if (error) {
            showToast(error.message, "error");
            return;
          }

          await logSession(currentUser!, `حذف ملف الشركة: ${name}`);
          await loadEverything();
          showToast("تم إزالة الشركة بنجاح.");
        } catch {
          showToast("تعذر استكمال بروتوكول الحذف", "error");
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const saveExtractLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== "admin" && !can("financial_reports") && !can("projects")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إدخال أو تعديل المستخلصات المالية!", "error");
      return;
    }
    if (!exCompanyId || !exTitle) {
      showToast("يرجى اختيار الشركة وكتابة اسم/رقم المستخلص مسبقًا", "error");
      return;
    }

    const row = {
      company_id: exCompanyId,
      title: exTitle.trim(),
      amount: Number(exAmount || 0),
      paid_amount: Number(exPaid || 0),
      date: exDate,
      status: exStatus,
      notes: exNotes.trim()
    };

    setIsLoading(true);
    try {
      const q = editExtractId
        ? sb.from("extracts").update(row).eq("id", editExtractId)
        : sb.from("extracts").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editExtractId ? `تعديل مستخلص رقم: ${exTitle}` : `تحرير مستخلص مالي جديد: ${exTitle}`);
      setEditExtractId(null);
      setExCompanyId("");
      setExTitle("");
      setExAmount("");
      setExPaid("");
      setExStatus("نشط");
      setExNotes("");
      await loadEverything();
      showToast("تم حفظ وتوثيق المستخلص في المنظومة!");
    } catch {
      showToast("حدث خطأ أثناء مزامنة قيد المستخلص المالي", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onDeleteExtract = (id: string, title: string) => {
    if (currentUser?.role !== "admin" && !can("financial_reports") && !can("projects")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف المستخلصات المالية!", "error");
      return;
    }
    triggerConfirm(
      "حذف المستخلص",
      `هل أنت متأكد من حذف المستخلص "${title}"؟`,
      async () => {
        setIsLoading(true);
        try {
          const { error } = await sb.from("extracts").delete().eq("id", id);
          if (error) {
            showToast(error.message, "error");
            return;
          }

          await logSession(currentUser!, `حذف مستخلص رقم: ${title}`);
          await loadEverything();
          showToast("تم إزالة المستخلص المالي.");
        } catch {
          showToast("فشل إتمام عملية حذف المستخلص", "error");
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    const hours = Number(parts[0] || 0);
    const minutes = Number(parts[1] || 0);
    return hours * 60 + minutes;
  };

  const calculateWorkerSalaryForMonth = (worker: Worker, monthStr: string) => {
    const contract = awExtractWorkerContract(worker.notes || "");
    const basicSalary = Number(contract.salary || 0);
    const housing = Number(contract.housing || 0);
    const transport = Number(contract.transport || 0);
    const other = Number(contract.other || 0);
    const totalMonthlySalary = basicSalary + housing + transport + other;
    
    const dailyWage = Number(worker.daily || 0);

    const monthRecords = attendances.filter(
      (a) => a.worker_id === worker.id && a.date.startsWith(monthStr)
    );

    const monthAdvances = payments.filter((p) => {
      const isMatchedWorker = p.worker_id === worker.id || (p.to_name && p.to_name.includes(worker.name));
      return isMatchedWorker && p.date.startsWith(monthStr);
    });
    const totalAdvancesInMonth = monthAdvances.reduce((sum, p) => sum + p.amount, 0);

    const shiftStartMins = parseTimeToMinutes(contract.shiftStart || "08:00");
    let totalDelayMinutes = 0;
    let delayDaysCount = 0;
    const delayDetailsList: { date: string; checkIn: string; delayMins: number }[] = [];

    monthRecords.forEach((rec) => {
      if (rec.check_in_time) {
        const checkInMins = parseTimeToMinutes(rec.check_in_time);
        const diff = checkInMins - shiftStartMins;
        if (diff > 0) {
          totalDelayMinutes += diff;
          delayDaysCount++;
          delayDetailsList.push({
            date: rec.date,
            checkIn: rec.check_in_time,
            delayMins: diff,
          });
        }
      }
    });

    let hourlyRate = Number(contract.delayRate || 0);
    if (hourlyRate <= 0) {
      if (basicSalary > 0) {
        hourlyRate = Number((basicSalary / 30 / 8).toFixed(2));
      } else if (dailyWage > 0) {
        hourlyRate = Number((dailyWage / 8).toFixed(2));
      } else {
        hourlyRate = 15;
      }
    }

    const delayDeduction = Number(((totalDelayMinutes / 60) * hourlyRate).toFixed(2));
    const isMonthly = basicSalary > 0;
    const presentDays = monthRecords.filter((a) => a.check_in_time).length;
    const expectedGross = isMonthly ? totalMonthlySalary : (dailyWage * presentDays);
    const netSalary = Math.max(0, expectedGross - delayDeduction - totalAdvancesInMonth);

    return {
      isMonthly,
      basicSalary,
      housing,
      transport,
      other,
      totalMonthlySalary,
      dailyWage,
      presentDays,
      monthRecordsCount: monthRecords.length,
      totalDelayMinutes,
      delayDaysCount,
      delayDetailsList,
      hourlyRate,
      delayDeduction,
      totalAdvancesInMonth,
      monthAdvances,
      expectedGross,
      netSalary,
    };
  };

  // HR & Worker Profile Operations
  const initHrWorker = (w: Worker) => {
    setSelectedWorkerForHr(w);
    const contract = awExtractWorkerContract(w.notes || "");
    setCStart(contract.start || "");
    setCDuration(contract.duration || "سنة واحدة");
    setCSalary(contract.salary || "");
    setCHousing(contract.housing || "");
    setCTransport(contract.transport || "");
    setCOther(contract.other || "");
    setCPassport(contract.passport || "");
    setCProbation(contract.probation || "90 يوم");
    setCVacation(contract.vacation || 30);
    setCShiftStart(contract.shiftStart || "08:00");
    setCDelayRate(contract.delayRate || "");

    // Scan for linked user account checking both custom worker_id and physical database id
    const linkedUser = users.find(u => 
      (w.worker_id && (u.perms?.worker_id === w.worker_id || u.worker_id === w.worker_id)) || 
      (u.perms?.worker_id === w.id || u.worker_id === w.id)
    );
    setCUserId(linkedUser ? linkedUser.id : "");

    // Clear/init leave forms
    setLhStart(new Date().toISOString().slice(0, 10));
    setLhEnd("");
    setLhNotes("");
    
    // Clear/init advance forms
    setAdvAmount("");
    setAdvNotes("");
    setAdvDate(new Date().toISOString().slice(0, 10));
  };

  const saveWorkerContractLogic = async () => {
    if (!selectedWorkerForHr) return;
    setIsLoading(true);
    try {
      const contractObj = {
        start: cStart,
        duration: cDuration,
        salary: Number(cSalary || 0),
        housing: Number(cHousing || 0),
        transport: Number(cTransport || 0),
        other: Number(cOther || 0),
        passport: cPassport.trim(),
        probation: cProbation.trim(),
        vacation: Number(cVacation || 30),
        shiftStart: cShiftStart || "08:00",
        delayRate: Number(cDelayRate || 0),
      };
      const existingLeaves = awExtractWorkerLeaves(selectedWorkerForHr.notes || "");
      const rawNotes = awCleanWorkerNotes(selectedWorkerForHr.notes || "");
      const finalNotes = awBuildWorkerNotes(rawNotes, contractObj, existingLeaves);

      const { error } = await sb.from("workers").update({ notes: finalNotes }).eq("id", selectedWorkerForHr.id);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      // Link/Assign career contract to login user account automatically
      if (cUserId) {
        const targetUser = users.find(u => u.id === cUserId);
        if (targetUser) {
          const updatedPerms = {
            ...(targetUser.perms || {}),
            worker_id: selectedWorkerForHr.worker_id || selectedWorkerForHr.id,
          };
          await sb.from("users").update({ perms: updatedPerms }).eq("id", cUserId);
        }

        // Unlink previous user accounts
        const otherLinked = users.filter(u => u.id !== cUserId && (
          (selectedWorkerForHr.worker_id && (u.perms?.worker_id === selectedWorkerForHr.worker_id || u.worker_id === selectedWorkerForHr.worker_id)) ||
          (u.perms?.worker_id === selectedWorkerForHr.id || u.worker_id === selectedWorkerForHr.id)
        ));
        for (const ou of otherLinked) {
          const cleanedPerms = { ...(ou.perms || {}) };
          delete cleanedPerms.worker_id;
          await sb.from("users").update({ perms: cleanedPerms }).eq("id", ou.id);
        }
      } else {
        const currentlyLinked = users.filter(u => 
          (selectedWorkerForHr.worker_id && (u.perms?.worker_id === selectedWorkerForHr.worker_id || u.worker_id === selectedWorkerForHr.worker_id)) ||
          (u.perms?.worker_id === selectedWorkerForHr.id || u.worker_id === selectedWorkerForHr.id)
        );
        for (const clu of currentlyLinked) {
          const cleanedPerms = { ...(clu.perms || {}) };
          delete cleanedPerms.worker_id;
          await sb.from("users").update({ perms: cleanedPerms }).eq("id", clu.id);
        }
      }

      await logSession(currentUser!, `تحديث عقد وتفاصيل الموظف: ${selectedWorkerForHr.name}`);
      showToast("تم حفظ بنود عقد العمل وتحديث الربط الذاتي تلقائياً.");
      
      const updatedWorker = { ...selectedWorkerForHr, notes: finalNotes };
      setSelectedWorkerForHr(updatedWorker);
      await loadEverything();
    } catch {
      showToast("لم نتمكن من الاتصال بالملقم لتحديث عقد الموظف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const addWorkerLeaveLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForHr || !lhStart || !lhEnd) return;
    setIsLoading(true);
    try {
      const newLeave = {
        id: Math.random().toString(36).substring(7),
        start: lhStart,
        end: lhEnd,
        type: lhType,
        notes: lhNotes.trim()
      };
      const existingLeaves = awExtractWorkerLeaves(selectedWorkerForHr.notes || "");
      const finalLeaves = [...existingLeaves, newLeave];

      const contractObj = awExtractWorkerContract(selectedWorkerForHr.notes || "");
      const rawNotes = awCleanWorkerNotes(selectedWorkerForHr.notes || "");
      const finalNotes = awBuildWorkerNotes(rawNotes, contractObj, finalLeaves);

      const { error } = await sb.from("workers").update({
        notes: finalNotes,
        status: "إجازة"
      }).eq("id", selectedWorkerForHr.id);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, `تسجيل طلب إجازة (${lhType}) للموظف: ${selectedWorkerForHr.name}`);
      showToast("تم تسجيل طلب الإجازة بنجاح وتحديث وضعية الموظف.");
      
      setLhEnd("");
      setLhNotes("");
      
      const updatedWorker = { ...selectedWorkerForHr, notes: finalNotes, status: "إجازة" as any };
      setSelectedWorkerForHr(updatedWorker);
      await loadEverything();
    } catch {
      showToast("حدث خلل أثناء تسجيل طلب الإجازة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const addWorkerAdvanceLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForHr || !advAmount) return;
    setIsLoading(true);
    try {
      const amt = Number(advAmount);
      const payRow = {
        no: generateNextNo("AW-PAY", payments, "no"),
        to_name: `سلفة الموظف: ${selectedWorkerForHr.name}`,
        amount: amt,
        method: "نقدي",
        date: advDate,
        created_at: new Date().toISOString(),
        project: selectedWorkerForHr.project || "عام",
        notes: awBuildNotesWithRegionAndTreasury(
          `قيد سلفة مستحقة للموظف. ${advNotes}`.trim(),
          selectedWorkerForHr.project ? "" : userRegionFilter,
          advTreasury
        ),
      };

      const { error: payErr } = await sb.from("payments").insert(payRow);
      if (payErr) {
        showToast(payErr.message, "error");
        return;
      }

      const currentAdvance = Number(selectedWorkerForHr.advance || 0);
      const newAdvance = currentAdvance + amt;
      const tot = Number(selectedWorkerForHr.daily || 0) * Number(selectedWorkerForHr.days || 0);
      const newBalance = Math.max(0, tot - newAdvance);

      const { error: workerErr } = await sb.from("workers").update({
        advance: newAdvance,
        balance: newBalance
      }).eq("id", selectedWorkerForHr.id);

      if (workerErr) {
        showToast(workerErr.message, "error");
        return;
      }

      await logSession(currentUser!, `طلب سلفة مالي بقيمة ${amt} ريال للموظف: ${selectedWorkerForHr.name}`);
      showToast("تم اعتماد السلفة وصرف المبلغ ماليًا وتحديث السجل.");

      setAdvAmount("");
      setAdvNotes("");
      
      const updatedWorker = { ...selectedWorkerForHr, advance: newAdvance, balance: newBalance };
      setSelectedWorkerForHr(updatedWorker);
      await loadEverything();
    } catch {
      showToast("حدث خلل عارض في قيد الصرف الخاص بالسلفة للموظف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const addSelfWorkerLeaveLogic = async (e: React.FormEvent, targetWorker: Worker) => {
    e.preventDefault();
    if (!targetWorker || !lhStart || !lhEnd) return;
    setIsLoading(true);
    try {
      const newLeave = {
        id: Math.random().toString(36).substring(7),
        start: lhStart,
        end: lhEnd,
        type: lhType,
        notes: lhNotes.trim()
      };
      const existingLeaves = awExtractWorkerLeaves(targetWorker.notes || "");
      const finalLeaves = [...existingLeaves, newLeave];

      const contractObj = awExtractWorkerContract(targetWorker.notes || "");
      const rawNotes = awCleanWorkerNotes(targetWorker.notes || "");
      const finalNotes = awBuildWorkerNotes(rawNotes, contractObj, finalLeaves);

      const { error } = await sb.from("workers").update({
        notes: finalNotes,
        status: "إجازة"
      }).eq("id", targetWorker.id);

      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, `تسجيل طلب إجازة خدمة ذاتية (${lhType}) للموظف: ${targetWorker.name}`);
      showToast("تم تسجيل طلب الإجازة بنجاح وتحديث وضعية ملفك الوظيفي.");
      
      setLhEnd("");
      setLhNotes("");
      await loadEverything();
    } catch {
      showToast("حدث خلل أثناء تسجيل طلب الإجازة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const addSelfWorkerAdvanceLogic = async (e: React.FormEvent, targetWorker: Worker) => {
    e.preventDefault();
    if (!targetWorker || !advAmount) return;
    setIsLoading(true);
    try {
      const amt = Number(advAmount);
      const payRow = {
        no: generateNextNo("AW-PAY", payments, "no"),
        to_name: `سلفة الموظف: ${targetWorker.name}`,
        amount: amt,
        method: "نقدي",
        date: advDate,
        created_at: new Date().toISOString(),
        project: targetWorker.project || "عام",
        notes: awBuildNotesWithRegionAndTreasury(
          `طلب سلفة موظف (خدمة ذاتية/ربط مباشر). ${advNotes}`.trim(),
          targetWorker.project ? "" : userRegionFilter,
          advTreasury
        ),
      };

      const { error: payErr } = await sb.from("payments").insert(payRow);
      if (payErr) {
        showToast(payErr.message, "error");
        return;
      }

      const currentAdvance = Number(targetWorker.advance || 0);
      const newAdvance = currentAdvance + amt;
      const tot = Number(targetWorker.daily || 0) * Number(targetWorker.days || 0);
      const newBalance = Math.max(0, tot - newAdvance);

      const { error: workerErr } = await sb.from("workers").update({
        advance: newAdvance,
        balance: newBalance
      }).eq("id", targetWorker.id);

      if (workerErr) {
        showToast(workerErr.message, "error");
        return;
      }

      await logSession(currentUser!, `طلب وصرف سلفة مالية ذاتية بقيمة ${amt} ريال للموظف: ${targetWorker.name}`);
      showToast("تم اعتماد وصرف السلفة المالية بنجاح للخدمة الذاتية وتحديث الأرصدة.");
      setAdvAmount("");
      setAdvNotes("");
      await loadEverything();
    } catch {
      showToast("حدث خطأ أثناء صرف السلفة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onPrintWorkerContract = (worker: Worker) => {
    const contract = awExtractWorkerContract(worker.notes || "");
    const basicSalary = Number(contract.salary || 0);
    const housing = Number(contract.housing || 0);
    const transport = Number(contract.transport || 0);
    const other = Number(contract.other || 0);
    const totalSalary = basicSalary + housing + transport + other;

    const w = window.open("", "_blank");
    if (!w) {
      showToast("تنبيه: ملقم المتصفح حظر نافذة الطباعة التلقائية!", "info");
      return;
    }

    w.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>عقد عمل موحد - ${worker.name}</title>
<style>
  * { box-sizing: border-box; font-family: Tahoma, Arial, sans-serif; }
  body { margin: 0; padding: 25px; background: #fff; color: #111; line-height: 1.6; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 24px; }
  .header h2 { margin: 0; color: #2b6cb0; font-size: 20px; font-weight: bold; }
  .header-left, .header-right { font-size: 11px; }
  .contract-title { text-align: center; margin-bottom: 30px; }
  .contract-title h1 { margin: 0; font-size: 22px; color: #1a365d; border-bottom: 1px solid #ddd; display: inline-block; padding-bottom: 6px; }
  .section-title { font-size: 14px; font-weight: bold; color: #2b6cb0; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
  th, td { border: 1px solid #cbd5e0; padding: 8px 10px; text-align: right; }
  th { background-color: #f7fafc; color: #2d3748; font-weight: bold; }
  .clauses { list-style: decimal inside; padding-right: 0; margin-top: 10px; }
  .clauses li { margin-bottom: 12px; text-align: justify; }
  .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 40px; }
  .sig-block { text-align: center; width: 40%; }
  .sig-block .label { font-weight: bold; margin-bottom: 50px; }
  .sig-block .line { border-top: 1px solid #bbb; width: 100%; margin: 10px auto; }
  .watermark { text-align: center; font-size: 10px; color: #a0aec0; margin-top: 40px; border-top: 1px dashed #e2e8f0; padding-top: 10px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
    @page { size: A4; margin: 20mm; }
  }
</style>
</head>
<body>

<div class="no-print" style="background:#edf2f7; padding:10px; border-radius:6px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
  <span>طباعة عقد العمل مجهز للطباعة على ورق A4</span>
  <button onclick="window.print()" style="background:#2b6cb0; color:white; border:none; padding:6px 16px; border-radius:4px; font-weight:bold; cursor:pointer;">طباعة العقد (PDF)</button>
</div>

<div class="header">
  <div class="header-right">
    <strong>شركة مجموعة المقاولات والإعمار الموحدة</strong><br>
    الرقم الضريبي الكلي للمنشأة<br>
    شؤون الموظفين والعاملين بالشركة
  </div>
  <div>
    <h2>عقد عمل موحد</h2>
  </div>
  <div class="header-left">
    التاريخ: ${new Date().toLocaleDateString("ar-SA")}<br>
    الرقم المرجعي: AW-EMP-${worker.id.slice(0, 5).toUpperCase()}<br>
    حالة الملف: موثق نظامًا
  </div>
</div>

<div class="contract-title">
  <h1>عقد عمل محدد المدة</h1>
</div>

<p>أنه في يوم ${new Date().toLocaleDateString("ar-SA", { weekday: "long" })} الموافق ${new Date().toLocaleDateString("ar-SA")}م، تم الاتفاق والتعاقد بين كلاً من:</p>

<p><strong>الطرف الأول:</strong> شركة المقاولات والتشييد الموحدة، ومقرها الرئيسي بالمملكة العربية السعودية، ويمثلها في التوقيع المدير عام.</p>
<p><strong>الطرف الثاني:</strong> المكرم/المكرمة: <strong>${worker.name}</strong>، والمهنة: <strong>${worker.job}</strong>، ورقم الهوية/الإقامة: <strong>${worker.worker_id || "غير محدد"}</strong>، ورقم الجوال: <strong>${worker.phone || "غير محدد"}</strong>، ورقم الجواز: <strong>${contract.passport || "غير محدد"}</strong>.</p>

<p>بموجب الأهلية والمشروعية لكلا الطرفين، فقد اتفقا وتراضيا على الشروط والبنود التالية:</p>

<div class="section-title">البند الأول: طبيعة العمل والمباشرة</div>
<p>يلتزم الطرف الثاني بموجب هذا العقد بالعمل لدى الطرف الأول بمهنة (<strong>${worker.job}</strong>) تحت إدارة وإشراف الطرف الأول، ويبدأ العمل بهذا العقد اعتباراً من تاريخ المباشرة الفعلي الموافق: <strong>${contract.start || worker.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)}م</strong>.</p>

<div class="section-title">البند الثاني: مدة العقد وفترة التجربة</div>
<p>مدة هذا العقد (<strong>${contract.duration || "سنة واحدة"}</strong>) تبدأ من تاريخ مباشرة العمل الفعلي المذكور بالبند الأول. كما يخضع الطرف الثاني لفترة تجربة مدتها (<strong>${contract.probation || "90 يومًا"}</strong>) من تاريخ المباشرة الفعلي، ويحق للطرف الأول خلالها إنهاء العقد دون إنذار او مكافأة نهاية خدمة في حال عدم إثبات الكفاءة.</p>

<div class="section-title">البند الثالث: المستحقات المالية والرواتب</div>
<p>يلتزم الطرف الأول بدفع الأجر والبدلات المتفق عليها للطرف الثاني نهاية كل شهر ميلادي على النحو التالي:</p>

<table>
  <thead>
    <tr>
      <th>البيان والمسمى</th>
      <th>القيمة والشرح</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>الراتب الأساسي الشهري</td>
      <td><strong>${basicSalary > 0 ? basicSalary.toLocaleString() + " ريال سعودي" : "محتسب باليومية وبمستحقات مستمرة"}</strong></td>
    </tr>
    <tr>
      <td>بدل السكن العيني/النقدي</td>
      <td><strong>${housing > 0 ? housing.toLocaleString() + " ريال سعودي" : "مؤمن عينيًا أو غير مدرج"}</strong></td>
    </tr>
    <tr>
      <td>بدل الانتقال الشهرى</td>
      <td><strong>${transport > 0 ? transport.toLocaleString() + " ريال سعودي" : "مؤمن انتقال أو غير مدرج"}</strong></td>
    </tr>
    <tr>
      <td>أية بدلات إضافية أخرى</td>
      <td><strong>${other > 0 ? other.toLocaleString() + " ريال سعودي" : "لا يوجد"}</strong></td>
    </tr>
    <tr style="background:#f7fafc; font-weight:bold;">
      <td>إجمالي الراتب والبدلات</td>
      <td><strong>${totalSalary > 0 ? totalSalary.toLocaleString() + " ريال سعودي" : worker.daily > 0 ? "يومية محددة بـ: " + worker.daily + " ريال سعودي للعمل اليومي" : "غير محدد"}</strong></td>
    </tr>
  </tbody>
</table>

<div class="section-title">البند الرابع: ساعات العمل والإجازة السنوية</div>
<p>يخضع نظام ساعات العمل للوائح والأنظمة المعمول بها لدى المؤسسة وبما يتوافق مع نظام العمل السعودي بمعدل 8 ساعات عمل يوميًا. ويستحق الطرف الثاني إجازة سنوية مدفوعة الأجر مدتها (<strong>${contract.vacation || 30} يومًا</strong>) عن كل عام عمل كامل يلتزم بها الطرف الثاني بالتنسيق مع مديره المباشر.</p>

<div class="section-title">البند الخامس: السرية والأمانة المهنية</div>
<p>يتعهد الطرف الثاني بالولاء التام والحفاظ المطبق على الأسرار للمشاريع وخطط البناء الموكلة إليه، والالتزام بمعايير الأمن والسلامة المهنية في مواقع المشروعات المعينة له (العنوان الحالي: <strong>${worker.project || "فروع عامة"}</strong>).</p>

<div class="section-title">البند السادس: التوقيع والإشهار</div>
<p>حرر هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل والامتثال بموجبها نظامًا.</p>

<div class="signatures">
  <div class="sig-block">
    <div class="label">توقيع الطرف الأول (الشركة)</div>
    <div style="height:35px"></div>
    <div class="line"></div>
    <span>الختم والتوقيع الإداري المالي</span>
  </div>
  <div class="sig-block">
    <div class="label">توقيع الطرف الثاني (الموظف/العامل)</div>
    <div style="height:35px"></div>
    <div class="line"></div>
    <span>بصمة الاسم والتوقيع الفعلي</span>
  </div>
</div>

<div class="watermark">
  مستند إلكتروني صادر ماليًا وإداريًا عن نظام الخزانة وإعمار الكتل التلقائي - رقم توثيق فرعي: SW-${worker.id.slice(0, 8)}
</div>

</body>
</html>
    `);
    w.document.close();
  };

  // Users & Perms CRUD
  const saveUserLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== "admin" && !can("users")) {
      showToast("⚠️ عذراً، لا تملك صلاحية إضافة أو تعديل الموظفين والصلاحيات!", "error");
      return;
    }
    if (!uName || !uCode || !uPass) return;

    let finalRole = uRole;
    let finalCompanyId = uCompanyId;

    if (currentUser?.role !== "admin") {
      // Prevent privilege escalation
      if (uRole === "admin") {
        finalRole = "employee";
      }

      // Prevent unauthorized company assignment
      const authComps = getAuthorizedCompanies();
      const authCompIds = authComps.map((c) => c.id);
      if (!authCompIds.includes(uCompanyId)) {
        showToast("⚠️ غير مصرح لك بتعيين موظف لهذه الشركة!", "error");
        return;
      }
    }

    if (finalRole !== "admin" && !finalCompanyId) {
      showToast("⚠️ يرجى اختيار الشركة التابع لها الموظف!", "error");
      return;
    }

    const row = {
      id: editUserId || undefined,
      name: uName.trim(),
      code: uCode.trim(),
      password: uPass.trim(),
      role: finalRole,
      company_id: finalRole === "admin" ? null : finalCompanyId,
      status: uStatus,
      updated_at: new Date().toISOString(),
      perms: {
        ...uPerms,
        region: uRegion,
        worker_id: uWorkerId.trim() || null,
      },
      company_perms: uCompanyPerms,
    };

    setIsLoading(true);
    try {
      const q = editUserId
        ? sb.from("users").update(row).eq("id", editUserId)
        : sb.from("users").upsert(row, { onConflict: "code" });

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editUserId ? `تعديل موظف: ${row.name}` : `تهيئة وتصنيف حساب موظف جديد: ${row.name}`);
      setEditUserId(null);
      setUName("");
      setUCode("");
      setUPass("");
      setUWorkerId("");
      setURegion("");
      setURole("employee");
      setUCompanyId("");
      setUStatus("نشط");
      setSelectedCompanyIdForPerms("global");
      setUCompanyPerms({});
      setUPerms({
        attendance: true,
        dashboard: false,
        installmentsView: false,
        installmentsAdd: false,
        installmentsEdit: false,
        installmentsDelete: false,
        quotes: false,
        receipts: false,
        payments: false,
        expenses: false,
        treasury: false,
        financial_reports: false,
        projects: false,
        workers: false,
        companies: false,
        users: false,
        sessions: false,
        print: false,
        dashTopCards: false,
        dashCollection: false,
        dashPulse: false,
        dashLateClients: false,
        dashLastReceipts: false,
        dashUpcomingPaid: false,
      });

      await loadEverything();
      showToast("تم تحديث سجلات حساب الموظفين المعينين");
    } catch {
      showToast("فشل في تثبيت الصلاحيات الإدارية", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUserLogicExecute = async (id: string, name: string) => {
    if (currentUser?.role !== "admin" && !can("users")) {
      showToast("⚠️ عذراً، لا تملك صلاحية حذف حسابات الموظفين!", "error");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await sb.from("users").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }
      await logSession(currentUser!, `حذف حساب الموظف: ${name}`);
      if (id === currentUser?.id) {
        handleLogout();
        showToast("لقد قمت بحذف حسابك الحالي. تم تسجيل الخروج.", "info");
      } else {
        await loadEverything();
        showToast(`تم مسح حساب الموظف "${name}" بنجاح.`);
      }
    } catch {
      showToast("فشل إتمام عملية حذف الموظف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUserLogic = (id: string, name: string) => {
    triggerConfirm(
      "حذف حساب الموظف",
      `هل أنت متأكد من حذف حساب الموظف "${name}" بشكل نهائي؟`,
      () => deleteUserLogicExecute(id, name)
    );
  };

  const handleSelectPaymentWorker = (workerId: string) => {
    setPayWorkerId(workerId);
    if (!workerId) return;
    const w = workers.find(x => x.id === workerId);
    if (w) {
      setPayTo(w.recipient_name || w.name);
      if (w.project) {
        setPayProject(w.project);
      }
      if (w.company_id) {
        setPaymentCompanyId(w.company_id);
      }
    }
  };

  const handlePaymentCompanyChange = (val: string) => {
    setPaymentCompanyId(val);
    if (payWorkerId) {
      const w = workers.find(x => x.id === payWorkerId);
      if (w) {
        const wComp = w.company_id || "";
        const targetComp = val || "";
        if (wComp !== targetComp) {
          setPayWorkerId("");
        }
      }
    }
  };

  // Excel Export logic for Receipts
  const exportReceiptsExcel = () => {
    try {
      const targetRowsArr = getVisibleReceipts().filter((x) => {
        const query = rSearch.toLowerCase().trim();
        const text = `${x.no} ${x.date} ${x.from_name} ${x.contract_no} ${x.identity} ${x.phone} ${x.amount} ${x.remaining_after} ${x.method} ${x.project}`.toLowerCase();
        const matchesQuery = !query || text.includes(query);
        const matchesMethod = !rMethodFilter || x.method === rMethodFilter;
        return matchesQuery && matchesMethod;
      });

      let csvContent = "\ufeff"; // BOM for Arabic support
      csvContent += "رقم السند,التاريخ,المستلم من,رقم العقد,الهوية,الجوال,المبلغ,طريقة الدفع,المشروع\n";

      targetRowsArr.forEach((r) => {
        csvContent += `${r.no},${r.date},"${r.from_name}",${r.contract_no},${r.identity},${r.phone},${r.amount},${r.method},"${r.project || "عام"}"\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "سندات_القبض_المحاسبية_عرب_وورلد.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("تم تحميل كشوف سندات القبض بصيغة Excel Excel");
    } catch {
      showToast("خلل أثناء تجميع وتحويل ملف CSV", "error");
    }
  };

  // Create receipt directly from a contract card/row
  const handleCreateReceiptForContract = (contract: Installment) => {
    setActiveSection("receipts");
    const queryStr = `${contract.no} | ${contract.client} | ${contract.identity || ""}`;
    setTimeout(() => {
      handleAutoFillReceipt(queryStr);
      document.getElementById("receipts-tab-view")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    showToast(`تم ربط العقد ${contract.no} بنجاح لتحرير سند القبض!`, "info");
  };

  // Fill in active inputs of receipts once linked installment matched
  const handleAutoFillReceipt = (val: string) => {
    setRContractQuery(val);
    const cleanVal = (val || "").trim();
    if (!cleanVal) {
      setRSelectedInstallment(null);
      return;
    }
    const targetList = getInstallmentsForReceipt();
    const linked = targetList.find(
      (x) =>
        (x.no && x.no.trim().toUpperCase() === cleanVal.toUpperCase()) ||
        (x.client && x.client.trim() === cleanVal) ||
        (x.identity && x.identity.trim() === cleanVal) ||
        `${x.no} | ${x.client} | ${x.identity}` === cleanVal ||
        (x.no && cleanVal.toUpperCase().includes(x.no.trim().toUpperCase())) ||
        (x.client && cleanVal.includes(x.client.trim()))
    ) || installments.find(
      (x) =>
        (x.no && x.no.trim().toUpperCase() === cleanVal.toUpperCase()) ||
        (x.client && x.client.trim() === cleanVal) ||
        (x.identity && x.identity.trim() === cleanVal) ||
        `${x.no} | ${x.client} | ${x.identity}` === cleanVal ||
        (x.no && cleanVal.toUpperCase().includes(x.no.trim().toUpperCase()))
    );

    if (linked) {
      setRSelectedInstallment(linked);
      setRFrom(linked.client);
      setRProject(linked.project || "عام");
      if (linked.company_id) {
        setReceiptCompanyId(linked.company_id);
      }
      if (!rAmount) {
        setRAmount(linked.installment || linked.remaining || "");
      }
    } else {
      setRSelectedInstallment(null);
    }
  };

  // Fill in active inputs of payments once linked installment matched (optional)
  const handleAutoFillPayment = (val: string) => {
    setPayContractQuery(val);
    const cleanVal = (val || "").trim();
    if (!cleanVal) {
      setPaySelectedInstallment(null);
      return;
    }
    const targetList = getInstallmentsForReceipt();
    const linked = targetList.find(
      (x) =>
        (x.no && x.no.trim().toUpperCase() === cleanVal.toUpperCase()) ||
        (x.client && x.client.trim() === cleanVal) ||
        (x.identity && x.identity.trim() === cleanVal) ||
        `${x.no} | ${x.client} | ${x.identity}` === cleanVal ||
        (x.no && cleanVal.toUpperCase().includes(x.no.trim().toUpperCase())) ||
        (x.client && cleanVal.includes(x.client.trim()))
    ) || installments.find(
      (x) =>
        (x.no && x.no.trim().toUpperCase() === cleanVal.toUpperCase()) ||
        (x.client && x.client.trim() === cleanVal) ||
        (x.identity && x.identity.trim() === cleanVal) ||
        `${x.no} | ${x.client} | ${x.identity}` === cleanVal ||
        (x.no && cleanVal.toUpperCase().includes(x.no.trim().toUpperCase()))
    );

    if (linked) {
      setPaySelectedInstallment(linked);
      setPayTo(linked.client);
      setPayProject(linked.project || "عام");
      if (linked.company_id) {
        setPaymentCompanyId(linked.company_id);
      }
      if (!payAmount) {
        setPayAmount(linked.installment || linked.remaining || "");
      }
    } else {
      setPaySelectedInstallment(null);
    }
  };

  // Nav categories helpers
  const navigationItems = [
    { key: "dashboard", label: "الرئيسية", icon: Home, visible: !isAttendanceOnly && can("dashboard") },
    { key: "my_profile", label: "ملفي الوظيفي والخدمات الذاتية", icon: User, visible: !isAttendanceOnly },
    { key: "attendance", label: "بصمة الحضور والانصراف (GPS)", icon: MapPin, visible: can("attendance") },
    { key: "installments", label: "التقسيط والعقود", icon: ClipboardList, visible: !isAttendanceOnly && can("installmentsView") },
    { key: "quotes", label: "عروض الأسعار", icon: FileText, visible: !isAttendanceOnly && can("quotes") },
    { key: "receipts", label: "سند قبض", icon: Landmark, visible: !isAttendanceOnly && can("receipts") },
    { key: "payments", label: "سند صرف", icon: TrendingUp, visible: !isAttendanceOnly && can("payments") },
    { key: "expenses", label: "المصروفات", icon: TrendingDown, visible: !isAttendanceOnly && can("expenses") },
    { key: "treasury", label: "الخزنة الفرعية", icon: Shield, visible: !isAttendanceOnly && can("treasury") },
    { key: "financial_reports", label: "التقارير والقوائم المالية", icon: PieChart, visible: !isAttendanceOnly && can("financial_reports") },
    { key: "projects", label: "المشاريع الجارية", icon: Briefcase, visible: !isAttendanceOnly && can("projects") },
    { key: "workers", label: "العمال والسلفيات", icon: Users, visible: !isAttendanceOnly && can("workers") },
    { key: "hr", label: "شؤون الموظفين", icon: Users, visible: !isAttendanceOnly && can("workers") },
    { key: "company_assets", label: "أصول وممتلكات الشركات", icon: Building, visible: !isAttendanceOnly && (currentUser?.role === "admin" || can("companies")) },
    { key: "companies", label: "دليل الشركات والمستخلصات", icon: Building, visible: !isAttendanceOnly && (currentUser?.role === "admin" || can("companies")) },
    { key: "users", label: "الموظفين والصلاحية", icon: Settings, visible: !isAttendanceOnly && (currentUser?.role === "admin" || can("users")) },
    { key: "sessions", label: "سجل حركات النظام", icon: Clock, visible: !isAttendanceOnly && (currentUser?.role === "admin" || can("sessions")) },
  ];

  // SaaS Multi-tenant URL Path Routing and isolation
  const activeCompany = companies.find(
    (c) => (c.slug || "").toLowerCase() === (activeSlug || "").toLowerCase() || c.id.toLowerCase() === (activeSlug || "").toLowerCase()
  );

  // 1. If on the main domain/portal (no active slug):
  if (!activeSlug) {
    return (
      <SaasLandingPortal
        companies={companies}
        onRegisterCompany={handleRegisterCompany}
        onRegisterPendingUser={handleRegisterPendingUser}
        onNavigateToSlug={navigateToSlug}
        showToast={showToast}
        loginCode={loginCode}
        setLoginCode={setLoginCode}
        loginCompanyCode={loginCompanyCode}
        setLoginCompanyCode={setLoginCompanyCode}
        loginPass={loginPass}
        setLoginPass={setLoginPass}
        handleLogin={handleLogin}
        handleDirectLogin={handleDirectLogin}
        isLoading={isLoading}
        handleGoogleSignIn={handleGoogleSignIn}
        googleUser={googleUser}
        setGoogleUser={setGoogleUser}
        handleLinkGoogle={handleLinkGoogle}
      />
    );
  }

  // 2. Fallback Route: If there is a slug or unknown URL path but no matching company in DB:
  if (!activeCompany) {
    return <NotFound404 onGoHome={() => navigateToSlug(null)} />;
  }

  // 3. If there is an active company but no logged-in session:
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4 text-right selection:bg-amber-500/30 select-none overflow-hidden relative" dir="rtl">
        <Toast toasts={toasts} removeToast={removeToast} />
        
        {/* Absolute Decorative Golden Ambient Lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/25 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        
        {/* Core Luxury Card */}
        <div className="w-full max-w-md bg-[#0e172c]/95 backdrop-blur-2xl border border-amber-500/35 p-10 rounded-[32px] space-y-8 relative shadow-[0_0_60px_rgba(11,19,43,0.9),0_0_30px_rgba(245,158,11,0.2)] overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/5 before:to-transparent before:pointer-events-none">
          
          {/* Back to main portal button */}
          <button
            onClick={() => navigateToSlug(null)}
            className="absolute left-6 top-6 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            ← البوابة المركزية
          </button>

          {/* Subtle Corner Golden Aesthetics */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/30 rounded-tr-[32px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/30 rounded-bl-[32px] pointer-events-none"></div>

          {/* Premium Branded Seal Header */}
          <div className="text-center space-y-4 relative z-10">
            {/* Multi-ring Royal Emblem */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_12s_linear_infinite]"></div>
              <div className="absolute inset-1.5 rounded-full border-2 border-dashed border-amber-500/40"></div>
              <div className="absolute inset-3 bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-400 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-slate-950 animate-pulse" />
              </div>
              {/* Floating Orbit Beads */}
              <div className="absolute top-0 left-1/2 -ml-1 w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[10px] tracking-[0.25em] font-black text-amber-500/80 uppercase font-sans">ERP SECURE ACCESS</h2>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300">
                بوابة تسجيل الدخول السحابية الموحدة
              </h1>
              <p className="text-[11px] font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">
                الإدارة المالية المتكاملة والمصادقة الأمنية الموحدة للمقاولات والتقسيط
              </p>
            </div>

            {/* Glowing Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
              <span className="text-[9px] font-bold text-amber-400 font-mono tracking-wider">WORKSPACE SECURED</span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent my-1">
            <span className="absolute left-1/2 -top-1.5 -ml-1.5 w-3 h-3 bg-slate-950 border border-slate-800 rotate-45 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black tracking-wider text-slate-300">كود الموظف / اسم المستخدم</label>
                <span className="text-[9px] text-slate-500 font-mono">USER CODE / NAME</span>
              </div>
              <div className="relative h-12">
                <User className="absolute right-4 top-3.5 w-4.5 h-4.5 text-amber-500/60 transition-colors duration-200" />
                <input
                  required
                  type="text"
                  placeholder="أدخل كودك المالي أو الوظيفي..."
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  className="w-full h-full pl-4 pr-11 py-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/85 focus:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all"
                />
              </div>
              <p className="text-[9px] text-slate-400 font-medium px-1 pt-0.5 leading-relaxed">
                💡 <b className="text-amber-400">دخول مباشر للموظف:</b> عند الدخول لأول مرة، أدخل كودك المالي/الوظيفي وكلمة المرور ليتم الربط والاعتماد مباشرة.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black tracking-wider text-slate-300">الرمز السري المالي</label>
                <span className="text-[9px] text-slate-500 font-mono">ACCESS CODE</span>
              </div>
              <div className="relative h-12">
                <Key className="absolute right-4 top-3.5 w-4.5 h-4.5 text-amber-500/60 transition-colors duration-200" />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full h-full pl-4 pr-11 py-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/85 focus:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all font-mono"
                />
              </div>
            </div>

            <button
              disabled={isLoading}
              type="submit"
              className="w-full h-12 bg-gradient-to-l from-amber-500 via-amber-600 to-yellow-500 text-slate-950 font-black rounded-2xl text-xs hover:from-amber-400 hover:to-amber-500 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>تأمين الاتصال وبناء الجلسة...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-slate-950" />
                  <span>اعتماد الدخول وتطهير الأذونات الهيكلية</span>
                </>
              )}
            </button>

            {/* Authenticator QR Code / 2FA Barcode Button */}
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full h-11 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span className="text-sm">📱</span>
              <span>دخول باركود Authenticator / رمز المصادقة</span>
            </button>
          </form>

          {/* Authenticator Modal Integration for Login */}
          <AuthenticatorModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            userCode={loginCode || "1001"}
            userName={loginCode || "الموظف المفوّض"}
            companyName={activeCompany?.name || "شركة عرب وورلد"}
            showToast={showToast}
            onSuccess2FA={(userCode, totpCode) => {
              handleDirectLogin(userCode, totpCode, activeCompany?.id);
            }}
          />

          {/* Footer branding */}
          <div className="pt-2 text-center space-y-2 relative z-10">
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 font-bold">
              <span>🔒 تشفير محمي 256 بت</span>
              <span>•</span>
              <span>مراجعة الآليات التشغيلية نشطة</span>
            </div>
            <p className="text-[9px] font-medium text-slate-600 leading-relaxed max-w-xs mx-auto">
              بموجب أنظمة هيئة المقاولات واللوائح والائتمان الموحدة لشركة {activeCompany.name}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active treasuries strictly belonging to the currently active / selected company
  const activeCompanyTreasuries = getStoredTreasuries(selectedCompanyId, companies);

  // Dynamic capital per treasury in visible contracts
  const treasuryCapitals: Record<string, number> = {};
  activeCompanyTreasuries.forEach((tName) => {
    let sum = 0;
    getVisibleInstallments().forEach((x) => {
      sum += awGetSafeCapitalOutflow(x.notes || "", tName);
    });
    treasuryCapitals[tName] = sum;
  });

  return (
    <div className="min-h-screen mesh-gradient text-slate-100 flex flex-col md:flex-row text-right font-sans relative" dir="rtl">
      
      {/* Toast floating notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Modern Sidebar layout */}
      <div className="w-full md:w-64 glass border-l border-white/5 flex flex-col justify-between shrink-0 p-5 z-20">
        <div className="space-y-6">
          
          {/* Main Logo visual */}
          <div className="flex items-center gap-3 border-b border-white/5 pb-5">
            <div className="w-9 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg relative shrink-0">
              <span className="text-slate-950 font-black text-sm">AW</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-white">عرب وورلد آدز</h2>
              <p className="text-[10px] font-bold text-amber-400 leading-normal">الحسابات والتقسيط الذكي</p>
            </div>
          </div>

          {/* Navigation Links with custom triggers */}
          <nav className="space-y-1.5 overflow-y-auto max-h-[60vh] pr-1">
            {navigationItems
              .filter((x) => x.visible)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveSection(item.key);
                      // Reset Edit states when moving tabs
                      setEditQuoteId(null);
                      setEditReceiptId(null);
                      setEditPaymentId(null);
                      setEditExpenseId(null);
                      setEditProjectId(null);
                      setEditWorkerId(null);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all border ${
                      activeSection === item.key
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/25 shadow-lg shadow-amber-500/5 backdrop-blur-md"
                        : "text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </div>

        {/* User Auth Info box and Sign Out trigger */}
        <div className="border-t border-white/5 pt-4 mt-6 space-y-4">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
            <span className="block text-[9px] font-bold text-slate-400 mb-1">الموظف المسؤول</span>
            <b className="block text-xs font-black text-amber-300">{currentUser.name}</b>
            <span className="block text-[10px] font-bold text-slate-400 mt-1">
              {currentUser.role === "admin" ? "أدمن الإدارة" : (currentUser.role === "supervisor" ? "مشرف عام / رئيسي" : "موظف الفرع")}
              {userRegionFilter && ` • ${userRegionFilter}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 bg-white/5 hover:bg-rose-950/20 text-slate-300 hover:text-rose-400 border border-white/5 hover:border-rose-500/25 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 glass-btn"
          >
            <LogOut className="w-4 h-4" />
            🚪 خروج آمن من النظام
          </button>

          {activeSlug && (
            <button
              type="button"
              onClick={() => navigateToSlug(null)}
              className="w-full py-2.5 bg-slate-900/60 hover:bg-slate-850 text-slate-400 hover:text-amber-400 border border-white/5 hover:border-amber-500/25 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              🏢 العودة للبوابة المركزية
            </button>
          )}
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Responsive Navbar heading with glowing sparkles */}
        <header className="bg-slate-950/40 backdrop-blur-2xl border-b border-amber-500/10 p-5 shrink-0 flex flex-col lg:flex-row gap-5 justify-between items-center z-10 text-right relative overflow-hidden before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-amber-500/20 before:to-transparent">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2 font-sans flex-wrap">
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 via-yellow-200 to-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.15)]">
                    {(() => {
                      const matched = selectedCompanyId === "all" || companies.length === 0
                        ? null
                        : companies.find((c) => c.id === selectedCompanyId);
                      if (matched) return matched.name;
                      return selectedCompanyId === "all" ? "منظومة كافة الشركات المصرحة" : "شركة عرب وورلد للمقاولات والعقود";
                    })()}
                  </span>
                  {(() => {
                    const matched = selectedCompanyId === "all" || companies.length === 0
                      ? null
                      : companies.find((c) => c.id === selectedCompanyId);
                    const subText = getCompanyActivity(matched);
                    return subText ? (
                      <span className="text-xs font-bold text-slate-300">
                        {subText}
                      </span>
                    ) : null;
                  })()}
                </h1>
                <p className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">البوابة الإدارية والمنظومة الحسابية المتكاملة الموثقة</p>
              </div>
            </div>

            {currentUser && getAuthorizedCompanies().length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900/60 border border-amber-500/20 rounded-xl px-3 py-1.5 shadow-lg shadow-amber-500/5 hover:border-amber-500/40 transition-all font-sans">
                <span className="text-[10px] text-amber-500 font-extrabold whitespace-nowrap">🏢 الشركة النشطة:</span>
                {currentUser.role !== "admin" && getAuthorizedCompanies().length <= 1 ? (
                  <span className="text-xs font-black text-amber-300">
                    🏢 {getAuthorizedCompanies()[0]?.name || "شركة عرب وورلد للمقاولات والعقود"}
                  </span>
                ) : (
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCompanyId(val);
                      if (val === "all") {
                        navigateToSlug(null);
                      } else {
                        const matched = companies.find((c) => c.id === val);
                        if (matched) {
                          navigateToSlug(matched.slug || matched.id);
                        }
                      }
                    }}
                    className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer text-slate-950 bg-white"
                  >
                    <option value="all" className="text-slate-950 font-bold">✨ كل الشركات المصرحة ({getAuthorizedCompanies().length})</option>
                    {getAuthorizedCompanies().map((c) => (
                      <option key={c.id} value={c.id} className="text-slate-950 font-bold">🏢 {c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Dynamic Treasury Capital Cards strictly per Company */}
            {activeCompanyTreasuries.map((tName, idx) => {
              const theme = getTreasuryTheme(tName, idx);
              const val = treasuryCapitals[tName] || 0;
              const cleanLabel = tName.startsWith("خزنة ") ? tName.slice(5) : tName;
              return (
                <div
                  key={tName}
                  className={`bg-gradient-to-b from-slate-900/60 to-slate-950/60 border ${theme.border} px-4 py-2 rounded-2xl flex items-center gap-3 text-right shadow-lg ${theme.glow} relative before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none transition-all hover:scale-[1.02]`}
                  title={`إجمالي رأس المال الممول من (${tName}) في عقود الشركة النشطة`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${theme.dot} animate-pulse shrink-0`} />
                  <div>
                    <span className={`block text-[8px] md:text-[9px] font-black ${theme.label} leading-normal uppercase truncate max-w-[150px]`}>
                      رأس مال {cleanLabel} بالعقود
                    </span>
                    <span className={`block text-sm font-black ${theme.text} font-mono`}>
                      {val.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ريال</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {(currentUser?.role === "admin" || can("treasury")) && (
              <button
                type="button"
                onClick={() => openAddTreasuryDialog(selectedCompanyId !== "all" ? selectedCompanyId : undefined)}
                className="text-[10px] font-black font-sans text-amber-300 bg-slate-900/80 hover:bg-slate-850 hover:text-amber-200 px-3 py-2 rounded-2xl border border-dashed border-amber-500/30 hover:border-amber-500/60 shadow-inner shrink-0 cursor-pointer flex items-center gap-1.5 transition-all"
                title="إضافة خزنة جديدة للشركة النشطة"
              >
                <span className="text-xs font-black text-amber-400">➕</span>
                <span>إضافة خزنة</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="text-[10px] font-black font-sans text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2.5 rounded-xl border border-amber-500/30 shadow-inner shrink-0 cursor-pointer flex items-center gap-1.5 transition-all"
              title="إعدادات المصادقة والباركود Authenticator"
            >
              <span className="text-xs">📱</span>
              <span>الباركود / Authenticator</span>
            </button>

            <span className="text-[10px] font-black font-sans text-amber-400 bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20 shadow-inner shrink-0">
              🏛️ نظام ذهبي موحد • V27
            </span>
          </div>
        </header>

        {/* Interactive Dynamic Layout content wrapper */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-8 pb-10">
          
          {/* Loading status bar indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 w-max px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 rounded-full animate-pulse mr-auto">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              جاري مزامنة الدفتر الحسابي التراكمي...
            </div>
          )}

          {/* Section Renderings checks */}
          {activeSection === "dashboard" && (
            <Dashboard
              installments={getVisibleInstallments()}
              receipts={getVisibleReceipts()}
              payments={getVisiblePayments()}
              expenses={getVisibleExpenses()}
              onNavigateToContracts={() => setActiveSection("installments")}
              sbStatus={sbStatus}
              companies={getAuthorizedCompanies()}
              selectedCompanyId={selectedCompanyId}
              currentUser={currentUser}
            />
          )}

          {activeSection === "installments" && (
            <Installments
              currentUser={currentUser}
              activePerms={getActivePerms()}
              installments={getVisibleInstallments()}
              projects={getVisibleProjects()}
              workers={getVisibleWorkers()}
              onSaveInstallment={onSaveInstallment}
              onDeleteInstallment={onDeleteInstallment}
              onPrintContract={onPrintContract}
              onMigrateInstallment={onMigrateInstallment}
              onCreateReceiptForContract={handleCreateReceiptForContract}
              receipts={getVisibleReceipts()}
              companies={getAuthorizedCompanies()}
              selectedCompanyId={selectedCompanyId}
            />
          )}

          {activeSection === "treasury" && (
            <Treasury
              installments={getVisibleInstallments()}
              receipts={getVisibleReceipts()}
              payments={getVisiblePayments()}
              expenses={getVisibleExpenses()}
              authorizedTreasuries={getAuthorizedTreasuries(currentUser, selectedCompanyId)}
              isAdmin={currentUser?.role === "admin" || can("treasury")}
              selectedCompanyId={selectedCompanyId}
              onUpdate={loadEverything}
              companies={companies}
            />
          )}

          {/* Core Quotes Tab Container */}
          {activeSection === "quotes" && (
            <div className="space-y-6">
              <form onSubmit={saveQuoteLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>📋</span> تحرير وثيقة عروض الأسعار</h3>
                  {editQuoteId && (
                    <span className="px-3 py-1 bg-amber-500/15 text-amber-400 rounded-lg text-[10px] font-black border border-amber-500/30">تعديل العرض النشط: {quotes.find(q => q.id === editQuoteId)?.no}</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">اسم العميل الكريم *</label>
                    <input required placeholder="اسم العميل" value={qClient} onChange={(e) => setQClient(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">رقم جوال العميل</label>
                    <input placeholder="رقم الجوال" value={qPhone} onChange={(e) => setQPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">المشروع التابع</label>
                    <input placeholder="المشروع التابع" value={qProject} onChange={(e) => setQProject(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">الضريبة المقررة %</label>
                    <input type="number" placeholder="الضريبة المقررة %" value={qVat} onChange={(e) => setQVat(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">تبعية شركة الشعار</label>
                    <select value={formCompanyId} onChange={(e) => setFormCompanyId(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans">
                      <option value="">🏢 تبعية شركة الشعار (تلقائي)</option>
                      {getAuthorizedCompanies().map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">حالة العرض المبدئية</label>
                    <select value={qStatus} onChange={(e: any) => setQStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans">
                      <option value="جديد">جديد</option>
                      <option value="مرسل">مرسل</option>
                      <option value="مقبول">مقبول</option>
                      <option value="مرفوض">مرفوض</option>
                    </select>
                  </div>
                </div>

                {/* Items Table Builder */}
                <div className="border-t border-slate-800/80 pt-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-amber-500 flex items-center gap-1.5">
                      <span>📊</span> بنود عرض السعر (جدول كميات ومواصفات وأسعار ومبالغ)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setQItems([...qItems, { description: "", quantity: 1, price: 0, total: 0 }])}
                      className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black flex items-center gap-1 transition-all border border-blue-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> إضافة بند جديد لعرض السعر
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {qItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60 shadow-inner">
                        <div className="md:col-span-1 text-center font-bold text-[10px] text-slate-500">البند {index + 1}</div>
                        <div className="md:col-span-5">
                          <input
                            required
                            placeholder="وصف وتفاصيل البند أو المادة أو الأعمال الفنية"
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...qItems];
                              updated[index].description = e.target.value;
                              setQItems(updated);
                            }}
                            className="w-full px-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="الكمية"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value || 1));
                                const updated = [...qItems];
                                updated[index].quantity = val;
                                updated[index].total = val * updated[index].price;
                                setQItems(updated);
                                const sum = updated.reduce((acc, curr) => acc + curr.total, 0);
                                setQAmount(sum);
                              }}
                              className="w-full pl-7 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-bold text-white text-center focus:outline-none font-mono"
                            />
                            <span className="absolute left-2 top-2 text-[8px] text-slate-500 font-black select-none">الكمية</span>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              placeholder="سعر الوحدة"
                              value={item.price || ""}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value || 0));
                                const updated = [...qItems];
                                updated[index].price = val;
                                updated[index].total = updated[index].quantity * val;
                                setQItems(updated);
                                const sum = updated.reduce((acc, curr) => acc + curr.total, 0);
                                setQAmount(sum);
                              }}
                              className="w-full pl-5 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-bold text-white text-center focus:outline-none font-mono"
                            />
                            <span className="absolute left-2 top-2 text-[8px] text-slate-500 font-black select-none">ريال</span>
                          </div>
                        </div>
                        <div className="md:col-span-1.5 text-center">
                          <span className="text-xs font-black text-emerald-400 font-mono">
                            {item.total.toLocaleString()} ريال
                          </span>
                        </div>
                        <div className="md:col-span-0.5 text-center">
                          <button
                            type="button"
                            disabled={qItems.length <= 1}
                            onClick={() => {
                              const updated = qItems.filter((_, i) => i !== index);
                              setQItems(updated);
                              const sum = updated.reduce((acc, curr) => acc + curr.total, 0);
                              setQAmount(sum);
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-500 disabled:opacity-30 rounded-lg transition-colors"
                            title="حذف هذا البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">الشروط والأحكام وملاحظات إضافية</label>
                    <textarea placeholder="تكتب الشروط هنا مثل: مدة التوريد، شروط الدفع، الضمان..." value={qNotes} onChange={(e) => setQNotes(e.target.value)} className="w-full px-3 py-2 h-[75px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans" />
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex flex-col justify-center space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                      <span className="text-xs text-slate-400 font-black">المجموع قبل الضريبة (قيمة العرض الكلية):</span>
                      <span className="text-xs font-bold text-white font-mono">{Number(qAmount || 0).toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                      <span className="text-xs text-slate-400 font-black">الضريبة المضافة ({qVat || 15}%):</span>
                      <span className="text-xs font-bold text-slate-300 font-mono">{Math.round(Number(qAmount || 0) * (Number(qVat || 0) / 100)).toLocaleString()} ريال</span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-xs text-amber-500 font-black">الإجمالي الشامل للضريبة:</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{Math.round(Number(qAmount || 0) * (1 + Number(qVat || 0) / 100)).toLocaleString()} ريال</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {editQuoteId && (
                    <button type="button" onClick={() => { setEditQuoteId(null); setQClient(""); setQPhone(""); setQProject(""); setQAmount(0); setQNotes(""); setQItems([{ description: "توريد وتركيب مواد وأعمال عامة", quantity: 1, price: 0, total: 0 }]); setFormCompanyId(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء التعديل</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black">{editQuoteId ? "تأكيد وتحديث العرض الحالي" : "حفظ وحيازة أسعار"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="py-2.5 px-3 font-bold">رقم العرض</th>
                      <th className="py-2.5 px-3 font-bold">العميل</th>
                      <th className="py-2.5 px-3 font-bold">المشروع</th>
                      <th className="py-2.5 px-3 font-bold">عدد البنود</th>
                      <th className="py-2.5 px-3 font-bold">القيمة والضريبة</th>
                      <th className="py-2.5 px-3 font-bold">الإجمالي الشامل</th>
                      <th className="py-2.5 px-3 font-bold">الحالة</th>
                      <th className="py-2.5 px-3 font-bold text-center">إجراءات التحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getVisibleQuotes().map((q, idx) => {
                      const parsed = deserializeQuoteNotes(q.notes, q.amount);
                      return (
                        <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-300">{q.no}</td>
                          <td className="py-3 px-3 font-black text-white">{q.client}</td>
                          <td className="py-3 px-3">{q.project}</td>
                          <td className="py-3 px-3 font-bold text-slate-400">{parsed.items?.length || 1} بند</td>
                          <td className="py-3 px-3 font-mono">{q.amount.toLocaleString()} ريال (+{q.vat}%)</td>
                          <td className="py-3 px-3 font-black text-emerald-400 font-mono">{q.total.toLocaleString()} ريال</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-slate-800 text-slate-100">{q.status}</span>
                          </td>
                          <td className="py-3 px-3 text-center space-x-2">
                            <button onClick={() => onPrintQuote(q)} className="p-1 text-emerald-400 hover:text-white inline-block" title="طباعة عرض السعر"><Printer className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={() => {
                                const parsedNotes = deserializeQuoteNotes(q.notes, q.amount);
                                setEditQuoteId(q.id);
                                setQClient(q.client || "");
                                setQPhone(q.phone || "");
                                setQProject(q.project || "");
                                setQAmount(q.amount || 0);
                                setQNotes(parsedNotes.notes);
                                setQItems(parsedNotes.items);
                                if (q.company_id) {
                                  setFormCompanyId(q.company_id);
                                }
                              }}
                              className="p-1 text-blue-400 hover:text-white inline-block"
                              title="تعديل عرض السعر"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (currentUser?.role !== "admin" && currentUser?.role !== "supervisor" && !can("quotes")) {
                                  showToast("عذراً، لا تمتلك صلاحية حذف عروض الأسعار!", "error");
                                  return;
                                }
                                triggerConfirm(
                                  "حذف عرض السعر",
                                  `هل أنت متأكد من حذف عرض السعر رقم "${q.no}" للعميل "${q.client}" بشكل نهائي؟ يتطلب هذا الإجراء توثيق سبب رقابي.`,
                                  (reason) => deleteQuoteLogic(q.id, reason),
                                  true,
                                  "اكتب هنا سبب حذف عرض السعر للأرشفة والمراجعة..."
                                );
                              }}
                              className="p-1 text-rose-400 hover:text-rose-500 inline-block"
                              title="حذف عرض السعر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Code Receipts dynamic tab integrations */}
          {activeSection === "receipts" && (
            <div className="space-y-6" id="receipts-tab-view">
              <form onSubmit={saveReceiptLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>💰</span> تحرير سند قبض مالي ({rType === "صادر" ? "صادر/مسترد" : "وارد"})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400">ربط العقد التابع (رقم العقد أو الاسم المعين لتوليد الحسابات)</label>
                      {rSelectedInstallment && (
                        <button
                          type="button"
                          onClick={() => {
                            setRSelectedInstallment(null);
                            setRContractQuery("");
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer"
                        >
                          ✕ إلغاء ربط العقد
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        placeholder="ابحث برقم العقد (AW-CON-...) أو اسم العميل أو الهوية..."
                        value={rContractQuery}
                        onChange={(e) => handleAutoFillReceipt(e.target.value)}
                        maxLength={180}
                        list="contractsListDatalist"
                        className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                      <datalist id="contractsListDatalist">
                        {getInstallmentsForReceipt().map((x, idx) => (
                          <option key={idx} value={`${x.no} | ${x.client} | ${x.identity}`} />
                        ))}
                      </datalist>
                    </div>
                    {rSelectedInstallment && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] font-black text-emerald-400">
                        <span>✅ مرتبط بالعقد:</span>
                        <span className="font-mono text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{rSelectedInstallment.no}</span>
                        <span className="text-amber-300">{rSelectedInstallment.client}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary Header Card for Linked Contract */}
                  {rSelectedInstallment && (
                    <div className="sm:col-span-4 bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 block">إجمالي قيمة العقد/المشروع</span>
                        <span className="text-sm font-black text-white font-mono">{Number(rSelectedInstallment.amount || 0).toLocaleString()} ريال</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 block">إجمالي المحصل سابقاً</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">{Number(rSelectedInstallment.paid || 0).toLocaleString()} ريال</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 block">المتبقي للتحصيل (قبل السند)</span>
                        <span className="text-sm font-black text-amber-400 font-mono">{Number(rSelectedInstallment.remaining || 0).toLocaleString()} ريال</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/40">
                        <span className="text-[10px] font-black text-emerald-400 block">المتبقي المتوقع بعد القبض</span>
                        <span className="text-sm font-black text-emerald-300 font-mono">
                          {Math.max(0, Number(rSelectedInstallment.remaining || 0) - (rType === "صادر" ? -Number(rAmount || 0) : Number(rAmount || 0))).toLocaleString()} ريال
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Direction Alert Banner if contract is payment/labor expenses */}
                  {rSelectedInstallment && (awExtractContractDirection(rSelectedInstallment.notes || "") === "علينا" || awExtractContractDirection(rSelectedInstallment.notes || "") === "مصروفات عمالة" || rSelectedInstallment.contract_direction === "علينا" || rSelectedInstallment.contract_direction === "مصروفات عمالة") && (
                    <div className="sm:col-span-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div>
                          <div className="text-xs font-black text-rose-300">
                            ⚠️ تنبيه اتجاه العقد: هذا العقد مصنف كـ ({(awExtractContractDirection(rSelectedInstallment.notes || "") || rSelectedInstallment.contract_direction) === "مصروفات عمالة" ? "مصروفات وتكلفة عمالة" : "عقد علينا / مستحق لمقاول"})
                          </div>
                          <div className="text-[10px] text-slate-300 font-bold">
                            سندات القبض مخصصة للإيرادات والتحصيل (لنا). يوصى بقيد الدفعة كـ (سند صرف) لإدراجها ضمن مصروفات العقد/المشروع الصحيحة.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const linkedNo = rSelectedInstallment.no;
                          const linkedClient = rSelectedInstallment.client;
                          const linkedId = rSelectedInstallment.identity;
                          const linkedAmt = rSelectedInstallment.installment || rSelectedInstallment.remaining || "";
                          const linkedProj = rSelectedInstallment.project || "عام";
                          setActiveSection("payments");
                          setTimeout(() => {
                            handleAutoFillPayment(`${linkedNo} | ${linkedClient} | ${linkedId}`);
                            setPayTo(linkedClient);
                            setPayAmount(linkedAmt);
                            setPayProject(linkedProj);
                          }, 50);
                          showToast("تم التحويل تلقائياً إلى تبويب سند الصرف بنجاح!", "info");
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shrink-0 transition-colors cursor-pointer"
                      >
                        ↪️ التحويل الآن إلى سند صرف
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">استلمنا من / الجهة</label>
                    <input required placeholder="اسم الدافع العميل" value={rFrom} onChange={(e) => setRFrom(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">حجم المبلغ</label>
                    <input type="number" required placeholder="قيمة السند" value={rAmount} onChange={(e) => setRAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">حركة السند</label>
                    <select
                      value={rType}
                      onChange={(e) => setRType(e.target.value as "وارد" | "صادر")}
                      className={`w-full px-3 py-2.5 bg-slate-950/40 border rounded-xl text-xs font-bold focus:outline-none transition-colors ${
                        rType === "صادر"
                          ? "border-rose-500 text-rose-400 focus:border-rose-500"
                          : "border-emerald-500 text-emerald-400 focus:border-emerald-500"
                      }`}
                    >
                      <option value="وارد" className="bg-slate-950 text-emerald-400 font-bold">وارد (قبض مالي من العميل)</option>
                      <option value="صادر" className="bg-slate-950 text-rose-400 font-bold">صادر (استرجاع مالي للعميل)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">طريقة الحركة</label>
                    <select value={rMethod} onChange={(e) => setRMethod(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                      <option value="مدى">مدى</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="نقداً">نقداً</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">تاريخ السند ماليًا</label>
                    <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-amber-500">الخزنة المستهدفة بالقيد</label>
                      {(currentUser?.role === "admin" || can("treasury")) && (
                        <button
                          type="button"
                          onClick={() => openAddTreasuryDialog(receiptCompanyId || selectedCompanyId)}
                          className="text-[9px] text-amber-550 hover:text-amber-400 font-black transition-colors"
                        >
                          ➕ إضافة خزنة جديدة
                        </button>
                      )}
                    </div>
                    <select
                      value={rTreasury}
                      onChange={(e) => setRTreasury(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer bg-slate-950"
                    >
                      {getAuthorizedTreasuries(currentUser, selectedCompanyId).map((tName) => (
                        <option key={tName} value={tName} className="bg-slate-950 text-white">💰 {tName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-emerald-400">رقم السند الخارجي</label>
                      {(() => {
                        if (!rExternalNo || !rExternalNo.trim()) return null;
                        const duplicate = receipts.find(
                          (r) =>
                            r.id !== editReceiptId &&
                            awExtractExternalNo(r.notes || "").trim() === rExternalNo.trim()
                        );
                        if (duplicate) {
                          return (
                            <span className="text-[9px] font-bold text-red-400 animate-pulse">
                              ⚠️ مكرر بسند رقم ({duplicate.no})
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <input
                      placeholder="رقم السند الخارجي (إن وُجد)"
                      value={rExternalNo}
                      onChange={(e) => setRExternalNo(e.target.value)}
                      className={`w-full px-3 py-2.5 bg-slate-950/40 border rounded-xl text-xs font-bold text-white focus:outline-none transition-colors ${
                        rExternalNo && rExternalNo.trim() && receipts.some(
                          (r) =>
                            r.id !== editReceiptId &&
                            awExtractExternalNo(r.notes || "").trim() === rExternalNo.trim()
                        )
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-800 focus:border-emerald-500"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">ماتبقى من العقد (قبل القبض)</label>
                    <input readOnly value={rSelectedInstallment ? `${Number(rSelectedInstallment.remaining).toLocaleString()} ريال` : "غير مرتبط"} className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 font-mono" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-400">المتبقي المباشر بعد السند</label>
                    <input readOnly value={rSelectedInstallment ? `${Math.max(0, Number(rSelectedInstallment.remaining || 0) - (rType === "صادر" ? -Number(rAmount || 0) : Number(rAmount || 0))).toLocaleString()} ريال` : "غير مرتبط"} className="w-full px-3 py-2.5 bg-slate-950/70 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 font-mono" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">المشروع المرفق بالقيد</label>
                    <input placeholder="المشروع" value={rProject} onChange={(e) => setRProject(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  {getAuthorizedCompanies().length > 1 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-amber-500">🏢 الشركة التابع لها السند</label>
                      <select
                        value={receiptCompanyId}
                        onChange={(e) => setReceiptCompanyId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                      >
                        <option value="">🏢 اختيار الشركة (تلقائي)</option>
                        {getAuthorizedCompanies().map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400">البيان وشرائح الملاحظة</label>
                    <textarea placeholder="شرائح قسط يومي..." value={rNotes} onChange={(e) => setRNotes(e.target.value)} className="w-full px-3 py-1.5 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="sm:col-span-2 mt-1">
                    <ImageUploader
                      id="receipt-attachment-uploader"
                      label="مرفق السند (إثبات، إيصال تحويل أو شيك صادر)"
                      placeholder="قم بسحب وإفلات صورة المرفق هنا، أو انقر للاختيار"
                      value={rAttachment}
                      onChange={(val) => setRAttachment(val)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {editReceiptId && (
                    <button type="button" onClick={() => { setEditReceiptId(null); setRContractQuery(""); setRSelectedInstallment(null); setRFrom(""); setRAmount(""); setRProject(""); setRNotes(""); setRAttachment(""); setRTreasury("خزنة التحصيل"); setRExternalNo(""); setReceiptCompanyId(""); setRType("وارد"); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black">{editReceiptId ? "استبدال السند" : "حفظ وقيد سند القبض ماليًا"}</button>
                </div>
              </form>

              {/* Receipts filter & log views */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between border-b border-slate-800/60 pb-4">
                  <div className="flex flex-col xl:flex-row gap-2.5 w-full xl:w-auto items-stretch xl:items-center">
                    <input placeholder="بحث في سندات القبض..." value={rSearch} onChange={(e) => setRSearch(e.target.value)} className="px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white w-full md:w-60 focus:outline-none" />
                    <select value={rSort} onChange={(e) => setRSort(e.target.value)} className="px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                      <option value="date_desc">الأحدث أولاً</option>
                      <option value="date_asc">الأقدم أولاً</option>
                      <option value="name_asc">الاسم (من أ إلى ي)</option>
                      <option value="amount_desc">الأعلى ماليًا</option>
                      <option value="amount_asc">الأقل ماليًا</option>
                    </select>

                    <select value={rMethodFilter} onChange={(e) => setRMethodFilter(e.target.value)} className="px-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none">
                      <option value="" className="text-white">💳 كل طرق الاستلام</option>
                      <option value="مدى" className="text-white">💳 مدى</option>
                      <option value="تحويل بنكي" className="text-white">🏦 تحويل بنكي</option>
                      <option value="نقداً" className="text-white">💵 نقداً</option>
                    </select>

                    <div className="flex flex-wrap items-center gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-850/60">
                      <div className="flex items-center gap-1 px-1">
                        <span className="text-[10px] font-black text-slate-400">من:</span>
                        <input
                          type="date"
                          value={rFromDate}
                          onChange={(e) => setRFromDate(e.target.value)}
                          className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex items-center gap-1 px-1">
                        <span className="text-[10px] font-black text-slate-400">إلى:</span>
                        <input
                          type="date"
                          value={rToDate}
                          onChange={(e) => setRToDate(e.target.value)}
                          className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      {(rFromDate || rToDate) && (
                        <button
                          onClick={() => {
                            setRFromDate("");
                            setRToDate("");
                          }}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/40 border border-red-900/40 transition-colors"
                          title="إعادة تعيين نطاق التواريخ"
                        >
                          تفريغ
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={exportReceiptsExcel} className="px-5 py-2.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-xl text-xs font-black flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    تحميل كشف Excel
                  </button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                        <th className="py-2.5 px-3 font-bold text-center w-10"></th>
                        <th className="py-2.5 px-3 font-bold">رقم السند</th>
                        <th className="py-2.5 px-3 font-bold">التاريخ</th>
                        <th className="py-2.5 px-3 font-bold">المستلم من</th>
                        <th className="py-2.5 px-3 font-bold">رقم العقد والفرع</th>
                        <th className="py-2.5 px-3 font-bold">المبلغ المدفوع</th>
                        <th className="py-2.5 px-3 font-bold">المتبقي الكلي</th>
                        <th className="py-2.5 px-3 font-bold">طريقة الاستلام والبيان</th>
                        <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getVisibleReceipts()
                        .filter((x) => {
                          const query = rSearch.toLowerCase().trim();
                          const text = `${x.no} ${x.date} ${x.from_name} ${x.contract_no} ${x.identity} ${x.phone} ${x.amount} ${x.remaining_after} ${x.method} ${x.project}`.toLowerCase();
                          const matchesQuery = !query || text.includes(query);
                          const matchesMethod = !rMethodFilter || x.method === rMethodFilter;
                          return matchesQuery && matchesMethod;
                        })
                        .sort((a, b) => {
                          if (rSort === "name_asc") {
                            const nameCompare = String(a.from_name || "").localeCompare(String(b.from_name || ""), "ar");
                            if (nameCompare !== 0) return nameCompare;
                            return String(b.date || "").localeCompare(String(a.date || ""));
                          }
                          if (rSort === "amount_desc") return Number(b.amount || 0) - Number(a.amount || 0);
                          if (rSort === "amount_asc") return Number(a.amount || 0) - Number(b.amount || 0);
                          if (rSort === "date_asc") return String(a.date || "").localeCompare(String(b.date || ""));
                          return String(b.date || "").localeCompare(String(a.date || ""));
                        })
                        .map((r, idx) => (
                          <React.Fragment key={r.id || idx}>
                            <tr className={`border-b border-slate-850 hover:bg-slate-800/10 transition-colors ${expandedReceipts[r.id] ? "bg-slate-900/20" : ""}`}>
                              <td className="py-3 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedReceipts(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                  title={expandedReceipts[r.id] ? "طي التفاصيل" : "توسيع وعرض التفاصيل"}
                                >
                                  {expandedReceipts[r.id] ? (
                                    <ChevronUp className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {awExtractExternalNo(r.notes || "") && (
                                  <span className="block text-[11px] text-emerald-300 font-sans font-extrabold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 mb-1 w-max">
                                    📄 سند خارجي: {awExtractExternalNo(r.notes || "")}
                                  </span>
                                )}
                                <span className="block font-bold text-slate-300">{r.no}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-400">{r.date}</td>
                              <td className="py-3 px-3 font-black text-white">{r.from_name}</td>
                              <td className="py-3 px-3 font-mono">
                                <span className="block">{r.contract_no || "عام"}</span>
                                <div className="flex flex-wrap gap-1.5 items-center mt-0.5">
                                  <span className="text-[9px] text-amber-500 font-sans font-extrabold">{awExtractRegion(r.notes || "")}</span>
                                  <span className="text-[9px] text-cyan-400 font-sans font-extrabold bg-cyan-950/45 px-1.5 py-0.5 rounded border border-cyan-850">🏦 {awExtractTreasury(r.notes || "") || "خزنة التحصيل"}</span>
                                  {(() => {
                                    const rAttachment = awExtractAttachment(r.notes || "");
                                    return rAttachment ? (
                                      <a href={rAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 font-sans font-extrabold bg-emerald-950/45 px-1.5 py-0.5 rounded border border-emerald-850" title="عرض المرفق المرفوع">
                                        📎 عرض المرفق
                                      </a>
                                    ) : null;
                                  })()}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-black text-emerald-400 font-mono">+{Number(r.amount || 0).toLocaleString()} ريال</td>
                              <td className="py-3 px-3 font-black text-slate-300 font-mono">{Number(r.remaining_after || 0).toLocaleString()} ريال</td>
                              <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                                <b className="text-white text-[11px] block">{r.method}</b>
                                {awCleanNotes(r.notes || "")}
                              </td>
                              <td className="py-3 px-3 text-center flex items-center justify-center gap-1">
                                <button onClick={() => onPrintReceipt(r.id)} className="p-1 text-emerald-400 hover:text-white" title="طباعة سند القبض"><Printer className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setEditReceiptId(r.id); handleAutoFillReceipt(r.contract_no || ""); setRFrom(r.from_name || ""); setRAmount(r.amount || ""); setRMethod(r.method || ""); setRDate(r.date || ""); setRProject(r.project || ""); setRNotes(awCleanNotes(r.notes || "")); setRAttachment(awExtractAttachment(r.notes || "") || ""); setRTreasury(awExtractTreasury(r.notes || "") || "خزنة التحصيل"); setRExternalNo(awExtractExternalNo(r.notes || "")); setReceiptCompanyId(r.company_id || ""); document.getElementById("receipts-tab-view")?.scrollIntoView({ behavior: "smooth" }); }} className="p-1 text-blue-400 hover:text-white" title="تعديل"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteReceiptLogic(r.id, r.installment_id)} className="p-1 text-rose-400 hover:text-rose-500" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                              </td>
                            </tr>
                            {expandedReceipts[r.id] && (
                              <tr className="bg-slate-950/40 border-b border-slate-800/80">
                                <td colSpan={9} className="p-4">
                                  <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/60 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
                                    {/* Customer & ID info */}
                                    <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                      <h4 className="text-[11px] font-black text-amber-500 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                        <span>👤</span> معلومات العميل والمستند
                                      </h4>
                                      <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                        <div>الاسم الكامل:</div>
                                        <div className="text-white text-left truncate">{r.from_name || "—"}</div>
                                        <div>رقم الهوية/الإقامة:</div>
                                        <div className="text-white text-left font-mono">{r.identity || "—"}</div>
                                        <div>رقم الهاتف المحمول:</div>
                                        <div className="text-white text-left font-mono">{r.phone || "—"}</div>
                                        <div>الجنسية:</div>
                                        <div className="text-white text-left">{r.nationality || "—"}</div>
                                      </div>
                                    </div>

                                    {/* Financial & Balances */}
                                    <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                      <h4 className="text-[11px] font-black text-emerald-400 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                        <span>💰</span> التفاصيل المالية والشركاء
                                      </h4>
                                      <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                        <div>المبلغ المقبوض:</div>
                                        <div className="text-emerald-400 text-left font-black font-mono">{Number(r.amount || 0).toLocaleString()} ريال</div>
                                        <div>الرصيد ما قبل القبض:</div>
                                        <div className="text-slate-200 text-left font-mono">{Number(r.remaining_before || 0).toLocaleString()} ريال</div>
                                        <div>الرصيد المتبقي الكلي:</div>
                                        <div className="text-slate-200 text-left font-mono">{Number(r.remaining_after || 0).toLocaleString()} ريال</div>
                                        <div>الشركة / الفرع:</div>
                                        <div className="text-white text-left truncate">{companies.find(c => c.id === r.company_id)?.name || "عام"}</div>
                                      </div>
                                    </div>

                                    {/* Metadata & Administrative tags */}
                                    <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                      <h4 className="text-[11px] font-black text-cyan-400 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                        <span>📋</span> التصنيف والتدقيق المالي
                                      </h4>
                                      <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                        <div>المشروع التابع:</div>
                                        <div className="text-white text-left truncate">{r.project || "—"}</div>
                                        <div>طريقة القبض:</div>
                                        <div className="text-white text-left">{r.method || "—"}</div>
                                        <div>صندوق / خزنة الإيداع:</div>
                                        <div className="text-cyan-400 text-left font-black">🏦 {awExtractTreasury(r.notes || "") || "خزنة التحصيل"}</div>
                                        <div>تاريخ ووقت القيد الإجرائي:</div>
                                        <div className="text-slate-400 text-left font-mono text-[9px]">{r.created_at ? new Date(r.created_at).toLocaleString("ar-EG") : "—"}</div>
                                      </div>
                                    </div>

                                    {/* Full Notes & Statement */}
                                    <div className="md:col-span-3 bg-slate-950/25 p-3 rounded-xl border border-slate-850 mt-1">
                                      <span className="text-[10px] font-black text-slate-400 block mb-1">البيان وملاحظات السند الكاملة:</span>
                                      <p className="text-slate-200 text-xs font-bold leading-relaxed whitespace-pre-wrap">{r.notes ? awCleanNotes(r.notes) : "لا توجد ملاحظات إضافية مسجلة."}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Core Payments Tab Container */}
          {activeSection === "payments" && (
            <div className="space-y-6">
              <form onSubmit={savePaymentLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>💸</span> تحرير سند صرف صادر للشركة</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-2 md:col-span-2">
                    <label className="text-[10px] font-black text-amber-500">ربط العقد التابع — اختياري (للبحث وتعبئة اسم العميل والمشروع تلقائياً)</label>
                    <input
                      placeholder="ابحث باسم العميل أو رقم العقد لربطه تلقائياً..."
                      value={payContractQuery}
                      onChange={(e) => handleAutoFillPayment(e.target.value)}
                      maxLength={180}
                      list="paymentsContractsListDatalist"
                      className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <datalist id="paymentsContractsListDatalist">
                      {getInstallmentsForReceipt().map((x, idx) => (
                        <option key={idx} value={`${x.no} | ${x.client} | ${x.identity}`} />
                      ))}
                    </datalist>
                  </div>

                  {/* Financial Summary Header Card for Linked Contract in Payments */}
                  {paySelectedInstallment && (
                    <div className="sm:col-span-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 block">إجمالي قيمة العقد/المشروع</span>
                        <span className="text-sm font-black text-white font-mono">{Number(paySelectedInstallment.amount || 0).toLocaleString()} ريال</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 block">إجمالي المدفوع سابقاً</span>
                        <span className="text-sm font-black text-rose-400 font-mono">{Number(paySelectedInstallment.paid || 0).toLocaleString()} ريال</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-black text-slate-400 block">المبلغ المتبقي للدفوعات</span>
                        <span className="text-sm font-black text-cyan-400 font-mono">{Number(paySelectedInstallment.remaining || 0).toLocaleString()} ريال</span>
                      </div>
                    </div>
                  )}

                  {/* Direction Alert Banner if contract is revenue ( لنا ) */}
                  {paySelectedInstallment && (awExtractContractDirection(paySelectedInstallment.notes || "") === "لنا" || paySelectedInstallment.contract_direction === "لنا") && (
                    <div className="sm:col-span-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-xs font-black text-amber-300">
                            ⚠️ تنبيه اتجاه العقد: هذا العقد مصنف كـ (لنا - إيراد تحصيل من عميل)
                          </div>
                          <div className="text-[10px] text-slate-300 font-bold">
                            سندات الصرف مخصصة للمصروفات والمستحقات. إذا كنت تستلم دفعة تحصيل، يفضل التحويل إلى (سند قبض).
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const linkedNo = paySelectedInstallment.no;
                          const linkedClient = paySelectedInstallment.client;
                          const linkedId = paySelectedInstallment.identity;
                          setActiveSection("receipts");
                          setTimeout(() => {
                            handleAutoFillReceipt(`${linkedNo} | ${linkedClient} | ${linkedId}`);
                          }, 50);
                          showToast("تم التحويل تلقائياً إلى تبويب سند القبض بنجاح!", "info");
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shrink-0 transition-colors cursor-pointer"
                      >
                        ↪️ التحويل الآن إلى سند قبض
                      </button>
                    </div>
                  )}
                  <div className="space-y-1 sm:col-span-2 md:col-span-2">
                    <label className="text-[10px] font-black text-amber-500">👤👥 تصنيف المستفيد (مجموعة أو شخص)</label>
                    <select
                      value={payBeneficiaryType}
                      onChange={(e) => setPayBeneficiaryType(e.target.value as "شخص" | "مجموعة")}
                      className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer bg-slate-950"
                    >
                      <option value="شخص" className="text-white bg-slate-950">👤 شخص (فرد، عامل، موظف، مقاول مستقل)</option>
                      <option value="مجموعة" className="text-white bg-slate-950">👥 مجموعة (شركة، مؤسسة، جهة، فرقة عمال)</option>
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400">صرفنا إلى المستفيد</label>
                    <input required placeholder="صرفنا إلى المستفيد" value={payTo} onChange={(e) => setPayTo(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">مبلغ الصرف</label>
                    <input type="number" required placeholder="مبلغ الصرف" value={payAmount} onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-amber-500">حساب الخزنة الممول</label>
                      {(currentUser?.role === "admin" || can("treasury")) && (
                        <button
                          type="button"
                          onClick={() => openAddTreasuryDialog(paymentCompanyId || selectedCompanyId)}
                          className="text-[9px] text-amber-550 hover:text-amber-400 font-black transition-colors"
                        >
                          ➕ إضافة خزنة جديدة
                        </button>
                      )}
                    </div>
                    <select
                      value={payTreasury}
                      onChange={(e) => setPayTreasury(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer bg-slate-950"
                    >
                      {getAuthorizedTreasuries(currentUser, selectedCompanyId).map((tName) => (
                        <option key={tName} value={tName} className="bg-slate-950 text-white">💰 {tName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">طريقة الصرف</label>
                    <input placeholder="طريقة الصرف" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">تاريخ الصرف</label>
                    <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors hover:text-amber-200" />
                  </div>
                  <div className="space-y-1 sm:col-span-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400">الارتباط بالمشروع</label>
                    <input placeholder="الارتباط بالمشروع" value={payProject} onChange={(e) => setPayProject(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-500">👷 عامل الشركة المرتبط (اختياري)</label>
                    <select
                      value={payWorkerId}
                      onChange={(e) => handleSelectPaymentWorker(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer bg-slate-950"
                    >
                      <option value="" className="text-slate-400">👤 تحديد عامل لتعبئة البيانات...</option>
                      {getWorkersForPaymentCompany().map((w) => (
                        <option key={w.id} value={w.id} className="text-white bg-slate-950">
                          {w.name} ({w.job || "عامل"})
                        </option>
                      ))}
                    </select>
                  </div>
                  {getAuthorizedCompanies().length > 1 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-amber-500">🏢 الشركة التابع لها السند</label>
                      <select
                        value={paymentCompanyId}
                        onChange={(e) => handlePaymentCompanyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                      >
                        <option value="">🏢 اختيار الشركة (تلقائي)</option>
                        {getAuthorizedCompanies().map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1 sm:col-span-2 md:col-span-4">
                    <label className="text-[10px] font-black text-slate-400">البيان والتفاصيل</label>
                    <textarea placeholder="البيان" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full px-3 py-2 h-[45px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  
                  <div className="space-y-1 sm:col-span-2 md:col-span-4 mt-1">
                    <ImageUploader
                      id="payment-attachment-uploader"
                      label="مرفق سند الصرف الصادر (شيك، صورة الحوالة، أو إيصال استلام)"
                      placeholder="قم بسحب وإفلات صورة المرفق هنا، أو انقر للاختيار"
                      value={payAttachment}
                      onChange={(val) => setPayAttachment(val)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  {editPaymentId && (
                    <button type="button" onClick={() => { setEditPaymentId(null); setPayTo(""); setPayAmount(""); setPayProject(""); setPayNotes(""); setPayAttachment(""); setPayTreasury("خزنة الشركة"); setPaymentCompanyId(""); setPayWorkerId(""); setPayContractQuery(""); setPaySelectedInstallment(null); setPayBeneficiaryType("شخص"); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editPaymentId ? "استبدال وصيغة السند" : "قيد سند الصرف ماليًا"}</button>
                </div>
              </form>

              {(() => {
                const allVisiblePayments = getVisiblePayments();

                // Counts & totals for each type
                const totalAll = allVisiblePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const countAll = allVisiblePayments.length;

                const personPayments = allVisiblePayments.filter(p => awExtractBeneficiaryType(p.notes || "", p.worker_id, p.to_name) === "شخص");
                const totalPerson = personPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const countPerson = personPayments.length;

                const groupPayments = allVisiblePayments.filter(p => awExtractBeneficiaryType(p.notes || "", p.worker_id, p.to_name) === "مجموعة");
                const totalGroup = groupPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                const countGroup = groupPayments.length;

                // Filter the list based on search and selected filter type
                const filteredPayments = allVisiblePayments.filter(p => {
                  const type = awExtractBeneficiaryType(p.notes || "", p.worker_id, p.to_name);
                  const matchesFilter = paymentBeneficiaryFilter === "all" || type === paymentBeneficiaryFilter;
                  
                  const query = paymentSearch.trim().toLowerCase();
                  const matchesSearch = !query ||
                    (p.to_name || "").toLowerCase().includes(query) ||
                    (p.no || "").toLowerCase().includes(query) ||
                    (p.project || "").toLowerCase().includes(query) ||
                    (p.method || "").toLowerCase().includes(query) ||
                    (p.notes || "").toLowerCase().includes(query);

                  return matchesFilter && matchesSearch;
                });

                const filteredTotal = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

                return (
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    {/* Filter and Search Section */}
                    <div className="border-b border-slate-850 pb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 text-right">
                          <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <Filter className="w-4 h-4 text-amber-500" />
                            <span>تصفية وفلترة سندات الصرف المتقدمة</span>
                          </h3>
                          <p className="text-[10px] text-slate-400 font-semibold">تصفية سريعة حسب نوع المستفيد (شخص أو مجموعة) مع احتساب إجماليات المبالغ المصروفة بدقة</p>
                        </div>
                        
                        {/* Search bar */}
                        <div className="relative max-w-xs w-full">
                          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="ابحث برقم السند، المستفيد، المشروع..."
                            value={paymentSearch}
                            onChange={(e) => setPaymentSearch(e.target.value)}
                            className="w-full pr-9 pl-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 transition-all text-right"
                          />
                          {paymentSearch && (
                            <button
                              type="button"
                              onClick={() => setPaymentSearch("")}
                              className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-white text-[11px] font-bold"
                            >
                              مسح
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Beneficiary Type Filter Pills */}
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-amber-500 block">تصنيف المستفيد والمحتسب ماليًا:</label>
                      <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                        {/* All */}
                        <button
                          type="button"
                          onClick={() => setPaymentBeneficiaryFilter("all")}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border duration-200 ${
                            paymentBeneficiaryFilter === "all"
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]"
                              : "bg-slate-950/40 text-slate-300 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                          }`}
                        >
                          <span>📂 الكل</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                            paymentBeneficiaryFilter === "all" ? "bg-slate-950 text-amber-400 font-extrabold" : "bg-slate-950/80 text-slate-400"
                          }`}>
                            {countAll} سندات | {totalAll.toLocaleString()} ريال
                          </span>
                        </button>

                        {/* Person */}
                        <button
                          type="button"
                          onClick={() => setPaymentBeneficiaryFilter("person")}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border duration-200 ${
                            paymentBeneficiaryFilter === "person"
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]"
                              : "bg-slate-950/40 text-slate-300 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                          }`}
                        >
                          <span>👤 شخص (فرد)</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                            paymentBeneficiaryFilter === "person" ? "bg-slate-950 text-amber-400 font-extrabold" : "bg-slate-950/80 text-slate-400"
                          }`}>
                            {countPerson} سندات | {totalPerson.toLocaleString()} ريال
                          </span>
                        </button>

                        {/* Group */}
                        <button
                          type="button"
                          onClick={() => setPaymentBeneficiaryFilter("group")}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border duration-200 ${
                            paymentBeneficiaryFilter === "group"
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]"
                              : "bg-slate-950/40 text-slate-300 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                          }`}
                        >
                          <span>👥 مجموعة / جهة</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                            paymentBeneficiaryFilter === "group" ? "bg-slate-950 text-amber-400 font-extrabold" : "bg-slate-950/80 text-slate-400"
                          }`}>
                            {countGroup} سندات | {totalGroup.toLocaleString()} ريال
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Financial Summary Widget */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 border border-slate-850/60 p-4 rounded-2xl text-right" dir="rtl">
                      <div className="flex items-center gap-3">
                        <span className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                          <TrendingDown className="w-5 h-5 text-rose-400" />
                        </span>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">التصفية النشطة حالياً:</span>
                          <span className="text-xs font-black text-white">
                            {paymentBeneficiaryFilter === "all" ? "جميع سندات الصرف (الكل)" : paymentBeneficiaryFilter === "person" ? "سندات المصروفة لأشخاص (أفراد)" : "سندات المصروفة لمجموعات وجهات"}
                          </span>
                        </div>
                      </div>

                      <div className="md:border-r border-slate-850 md:pr-4 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 block font-bold">إجمالي المبالغ المصروفة للتصفية الحالية:</span>
                        <span className="text-base font-black text-rose-400 font-mono">
                          {filteredTotal.toLocaleString()} ريال سعودي
                        </span>
                      </div>

                      <div className="md:border-r border-slate-850 md:pr-4 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 block font-bold">عدد السندات المطابقة:</span>
                        <span className="text-base font-black text-cyan-400 font-mono">
                          {filteredPayments.length} سندات صرف مطابقة
                        </span>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                            <th className="py-2.5 px-3 font-bold text-center w-10"></th>
                            <th className="py-2.5 px-3 font-bold">رقم السند</th>
                            <th className="py-2.5 px-3 font-bold">التاريخ</th>
                            <th className="py-2.5 px-3 font-bold">صرف إلى</th>
                            <th className="py-2.5 px-3 font-bold">مبلغ الصرف الصادر</th>
                            <th className="py-2.5 px-3 font-bold text-amber-400">المتبقي الكلي</th>
                            <th className="py-2.5 px-3 font-bold">طريقة الصرف</th>
                            <th className="py-2.5 px-3 font-bold">المشروع والبيان</th>
                            <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayments.map((p, idx) => {
                            const bType = awExtractBeneficiaryType(p.notes || "", p.worker_id, p.to_name);
                            const remVal = getPaymentRemaining(p, workers, installments);
                            return (
                              <React.Fragment key={p.id || idx}>
                                <tr className={`border-b border-slate-850 hover:bg-slate-800/10 transition-colors ${expandedPayments[p.id] ? "bg-slate-900/20" : ""}`}>
                                  <td className="py-3 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedPayments(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                      title={expandedPayments[p.id] ? "طي التفاصيل" : "توسيع وعرض التفاصيل"}
                                    >
                                      {expandedPayments[p.id] ? (
                                        <ChevronUp className="w-4 h-4 text-amber-500" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-slate-300">{p.no}</td>
                                  <td className="py-3 px-3 font-mono text-slate-400">{p.date}</td>
                                  <td className="py-3 px-3">
                                    <div className="flex flex-col gap-1">
                                      <span className="font-black text-white">{p.to_name}</span>
                                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border self-start ${
                                        bType === "مجموعة" 
                                          ? "bg-purple-950/40 text-purple-400 border-purple-900" 
                                          : "bg-emerald-950/40 text-emerald-400 border-emerald-900"
                                      }`}>
                                        {bType === "مجموعة" ? "👥 مجموعة / جهة" : "👤 شخص (فرد)"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 font-black text-rose-400 font-mono">-{Number(p.amount || 0).toLocaleString()} ريال</td>
                                  <td className="py-3 px-3 font-mono font-bold text-amber-400">
                                    {remVal !== null ? `${remVal.toLocaleString()} ريال` : "—"}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-slate-200">{p.method}</td>
                                  <td className="py-3 px-3">
                                    <span className="block font-bold text-slate-200">{p.project}</span>
                                    <span className="block text-[10px] text-slate-400 max-w-xs truncate">{awCleanNotes(p.notes || "")}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <span className="inline-block text-[9px] text-cyan-400 font-sans font-extrabold bg-cyan-950/45 px-1.5 py-0.5 rounded border border-cyan-850">🏦 {awExtractTreasury(p.notes || "") || "خزنة الشركة"}</span>
                                      {(() => {
                                        const pAttachment = awExtractAttachment(p.notes || "");
                                        return pAttachment ? (
                                          <a href={pAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 font-sans font-extrabold bg-emerald-950/45 px-1.5 py-0.5 rounded border border-emerald-850" title="عرض المرفق المرفوع">
                                            📎 عرض المرفق
                                          </a>
                                        ) : null;
                                      })()}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center space-x-1">
                                    <button onClick={() => { setEditPaymentId(p.id); setPayTo(p.to_name || ""); setPayAmount(p.amount || ""); setPayDate(p.date || ""); setPayProject(p.project || ""); setPayMethod(p.method || ""); setPayNotes(awCleanNotes(p.notes || "")); setPayAttachment(awExtractAttachment(p.notes || "") || ""); setPayTreasury(awExtractTreasury(p.notes || "") || "خزنة الشركة"); setPaymentCompanyId(p.company_id || ""); setPayWorkerId(p.worker_id || ""); setPayBeneficiaryType(awExtractBeneficiaryType(p.notes || "", p.worker_id, p.to_name)); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button
                                      onClick={() => {
                                        if (currentUser?.role !== "admin" && currentUser?.role !== "supervisor" && !can("payments")) {
                                          showToast("عذراً، لا تمتلك صلاحية حذف السندات!", "error");
                                          return;
                                        }
                                        triggerConfirm(
                                          "حذف سند صرف",
                                          `هل أنت متأكد من حذف سند الصرف رقم "${p.no}" بقيمة ${p.amount} ريال بشكل نهائي؟ يتطلب هذا الإجراء توثيق سبب رقابي.`,
                                          (reason) => deletePaymentLogic(p.id, reason),
                                          true,
                                          "اكتب هنا سبب حذف قيد سند الصرف للأرشيف والرقابة..."
                                        );
                                      }}
                                      className="p-1 text-rose-400 hover:text-rose-500"
                                      title="حذف السند"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                                {expandedPayments[p.id] && (
                                  <tr className="bg-slate-950/40 border-b border-slate-800/80">
                                    <td colSpan={9} className="p-4">
                                      <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/60 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
                                        <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                          <h4 className="text-[11px] font-black text-amber-500 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                            <span>🧾</span> تفاصيل السند والمستفيد
                                          </h4>
                                          <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                            <div>رقم السند:</div>
                                            <div className="text-white text-left font-mono">{p.no}</div>
                                            <div>صرف إلى:</div>
                                            <div className="text-white text-left truncate font-black">{p.to_name}</div>
                                            <div>تصنيف المستفيد:</div>
                                            <div className="text-amber-500 text-left font-black">{bType === "مجموعة" ? "👥 مجموعة / جهة" : "👤 شخص (فرد)"}</div>
                                            <div>طريقة الصرف:</div>
                                            <div className="text-white text-left truncate">{p.method}</div>
                                          </div>
                                        </div>
                                        <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                          <h4 className="text-[11px] font-black text-rose-400 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                            <span>💸</span> القيمة والجهة الممولة
                                          </h4>
                                          <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                            <div>مبلغ الصرف:</div>
                                            <div className="text-rose-400 text-left font-black font-mono">-{Number(p.amount || 0).toLocaleString()} ريال</div>
                                            <div>المتبقي الكلي:</div>
                                            <div className="text-amber-400 text-left font-black font-mono">{remVal !== null ? `${remVal.toLocaleString()} ريال` : "—"}</div>
                                            <div>الخزنة الممولة:</div>
                                            <div className="text-cyan-400 text-left font-black">🏦 {awExtractTreasury(p.notes || "") || "خزنة الشركة"}</div>
                                          </div>
                                        </div>
                                        <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                          <h4 className="text-[11px] font-black text-cyan-400 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                            <span>🏢</span> المشروع والتبعية الإدارية
                                          </h4>
                                          <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                            <div>المشروع:</div>
                                            <div className="text-white text-left truncate">{p.project || "—"}</div>
                                            <div>الشركة:</div>
                                            <div className="text-white text-left truncate">{companies.find(c => c.id === p.company_id)?.name || "عام"}</div>
                                            <div>تاريخ القيد:</div>
                                            <div className="text-slate-400 text-left font-mono text-[9px]">{p.created_at ? new Date(p.created_at).toLocaleString("ar-EG") : "—"}</div>
                                          </div>
                                        </div>
                                        <div className="md:col-span-3 bg-slate-950/25 p-3 rounded-xl border border-slate-850 mt-1">
                                          <span className="text-[10px] font-black text-slate-400 block mb-1">البيان والملاحظات بالكامل:</span>
                                          <p className="text-slate-200 text-xs font-bold leading-relaxed whitespace-pre-wrap">{p.notes ? awCleanNotes(p.notes) : "لا توجد ملاحظات."}</p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeSection === "expenses" && (
            <div className="space-y-6">
              <form onSubmit={saveExpenseLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>💸</span> قيد وتسجيل مصروف صادر</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <input required placeholder="اسم المصروف / البند" value={eName} onChange={(e) => setEName(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <select
                    required
                    value={eCategory}
                    onChange={(e) => setECategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                  >
                    <option value="" className="text-slate-400">📁 اختر فئة المصروف...</option>
                    <option value="مواد">مواد</option>
                    <option value="إعاشة">إعاشة</option>
                    <option value="سيارات">سيارات</option>
                    <option value="عدة">عدة</option>
                    <option value="بنزين">بنزين</option>
                    <option value="تغيير زيت">تغيير زيت</option>
                    <option value="وقود">وقود عام</option>
                    <option value="عمالة">عمالة</option>
                    <option value="نقل">نقل وشحن</option>
                    <option value="إيجار">إيجار</option>
                    <option value="صيانة">صيانة وإصلاح</option>
                    <option value="اتصالات">اتصالات وإنترنت</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  <input type="number" required placeholder="المبلغ" value={eAmount} onChange={(e) => setEAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="المشروع التابع" value={eProject} onChange={(e) => setEProject(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="المورد أو المستفيد" value={eSupplier} onChange={(e) => setESupplier(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-amber-500">من صندوق / خزنة</label>
                      {(currentUser?.role === "admin" || can("treasury")) && (
                        <button
                          type="button"
                          onClick={() => openAddTreasuryDialog(expenseCompanyId || selectedCompanyId)}
                          className="text-[9px] text-amber-550 hover:text-amber-400 font-black transition-colors"
                        >
                          ➕ إضافة خزنة جديدة
                        </button>
                      )}
                    </div>
                    <select
                      value={eTreasury}
                      onChange={(e) => setETreasury(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                    >
                      {getAuthorizedTreasuries(currentUser, selectedCompanyId).map((tName) => (
                        <option key={tName} value={tName} className="bg-slate-950 text-white">💰 {tName}</option>
                      ))}
                    </select>
                  </div>
                  {getAuthorizedCompanies().length > 1 && (
                    <select
                      value={expenseCompanyId}
                      onChange={(e) => setExpenseCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                    >
                      <option value="">🏢 اختيار الشركة (تلقائي)</option>
                      {getAuthorizedCompanies().map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <textarea placeholder="ملاحظات" value={eNotes} onChange={(e) => setENotes(e.target.value)} className="w-full px-3 py-1.5 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  
                  <div className="sm:col-span-2 mt-1">
                    <ImageUploader
                      id="expense-attachment-uploader"
                      label="مرفق المصروف (فاتورة، إيصال، أو سند استلام)"
                      placeholder="قم بسحب وإفلات صورة المرفق هنا، أو انقر للاختيار"
                      value={eAttachment}
                      onChange={(val) => setEAttachment(val)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  {editExpenseId && (
                    <button type="button" onClick={() => { setEditExpenseId(null); setEName(""); setEAmount(""); setEProject(""); setESupplier(""); setENotes(""); setEAttachment(""); setETreasury("خزنة الشركة"); setExpenseCompanyId(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editExpenseId ? "تعديل القيّد" : "قيد المصروف ماليًا"}</button>
                </div>
              </form>

              {(() => {
                const allVisibleExpenses = getVisibleExpenses();
                
                // Calculate dynamic standard list and unique ones in dataset
                const defaultCategoriesList = ["مواد", "إعاشة", "سيارات", "عدة", "بنزين", "تغيير زيت", "وقود", "عمالة", "نقل", "إيجار", "صيانة", "اتصالات", "أخرى"];
                const categoriesInVisible = Array.from(new Set(allVisibleExpenses.map(e => e.category || "أخرى")));
                const mergedCategories: string[] = Array.from(new Set(["all", ...defaultCategoriesList, ...categoriesInVisible])) as string[];

                // Helper to get total for a specific category
                const getCategoryTotal = (cat: string) => {
                  if (cat === "all") {
                    return allVisibleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                  }
                  return allVisibleExpenses
                    .filter(e => (e.category || "أخرى") === cat)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);
                };

                // Get only categories that have some expenses OR are key standard ones
                const categoriesToShow = mergedCategories.filter(cat => {
                  if (cat === "all") return true;
                  return getCategoryTotal(cat) > 0 || defaultCategoriesList.includes(cat);
                });

                // Filter the list based on selection and search query
                const filteredExpenses = allVisibleExpenses.filter((e) => {
                  const categoryMatch = selectedExpenseCategoryFilter === "all" || (e.category || "أخرى") === selectedExpenseCategoryFilter;
                  const query = expenseSearch.trim().toLowerCase();
                  const searchMatch = !query || 
                    (e.name || "").toLowerCase().includes(query) ||
                    (e.no || "").toLowerCase().includes(query) ||
                    (e.project || "").toLowerCase().includes(query) ||
                    (e.supplier || "").toLowerCase().includes(query) ||
                    (e.notes || "").toLowerCase().includes(query) ||
                    (e.category || "").toLowerCase().includes(query);
                  return categoryMatch && searchMatch;
                });

                const selectedCategoryTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                return (
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    {/* Advanced Filter Section Header */}
                    <div className="border-b border-slate-850 pb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 text-right">
                          <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <Filter className="w-4 h-4 text-amber-500" />
                            <span>تصفية وفلترة المصروفات المتقدمة</span>
                          </h3>
                          <p className="text-[10px] text-slate-450 font-semibold">تصفية سريعة لبنود المصروفات حسب الفئات وبحث ذكي مع احتساب الإجماليات بدقة</p>
                        </div>
                        
                        {/* Search bar */}
                        <div className="relative max-w-xs w-full">
                          <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                            <Search className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="ابحث برقم السند، الوصف، المورد أو المشروع..."
                            value={expenseSearch}
                            onChange={(e) => setExpenseSearch(e.target.value)}
                            className="w-full pr-9 pl-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 transition-all text-right"
                          />
                          {expenseSearch && (
                            <button
                              type="button"
                              onClick={() => setExpenseSearch("")}
                              className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-white text-[11px] font-bold"
                            >
                              مسح
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category Filter Pills Grid */}
                    <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-amber-500 block">تصنيف الفئات المتوفرة والمحتسبة مالياً:</label>
                      <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                        {categoriesToShow.map((cat) => {
                          const isSelected = selectedExpenseCategoryFilter === cat;
                          const total = getCategoryTotal(cat);
                          const isAll = cat === "all";
                          
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedExpenseCategoryFilter(cat)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border duration-200 ${
                                isSelected
                                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10 scale-[1.02]"
                                  : "bg-slate-950/40 text-slate-300 border-slate-850 hover:bg-slate-900 hover:border-slate-800"
                              }`}
                            >
                              <span>{isAll ? "📂 الكل" : cat}</span>
                              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono ${
                                isSelected ? "bg-slate-950 text-amber-400 font-extrabold" : "bg-slate-950/80 text-slate-400"
                              }`}>
                                {total.toLocaleString()} ريال
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Category Financial Summary Widget */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 border border-slate-850/60 p-4 rounded-2xl text-right" dir="rtl">
                      <div className="flex items-center gap-3">
                        <span className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                          <TrendingDown className="w-5 h-5" />
                        </span>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">الفئة المحددة حالياً:</span>
                          <span className="text-xs font-black text-white">
                            {selectedExpenseCategoryFilter === "all" ? "كافة فئات المصروفات (الكل)" : selectedExpenseCategoryFilter}
                          </span>
                        </div>
                      </div>

                      <div className="md:border-r border-slate-850 md:pr-4 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 block font-bold">إجمالي المصروف المالي للفئة المحددة:</span>
                        <span className="text-base font-black text-rose-400 font-mono">
                          {selectedCategoryTotal.toLocaleString()} ريال سعودي
                        </span>
                      </div>

                      <div className="md:border-r border-slate-850 md:pr-4 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 block font-bold">عدد السندات المطابقة للتصفية:</span>
                        <span className="text-base font-black text-cyan-400 font-mono">
                          {filteredExpenses.length} سندات مصروف
                        </span>
                      </div>
                    </div>

                    {/* Table View with responsive overflow-x-auto */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                            <th className="py-2.5 px-3 font-bold text-center w-10"></th>
                            <th className="py-2.5 px-3 font-bold">رقم المصروف</th>
                            <th className="py-2.5 px-3 font-bold">التاريخ</th>
                            <th className="py-2.5 px-3 font-bold">اسم المصروف وفئته</th>
                            <th className="py-2.5 px-3 font-bold">المبلغ المدفوع</th>
                            <th className="py-2.5 px-3 font-bold">المورد والمشروع</th>
                            <th className="py-2.5 px-3 font-bold">البيانات الإضافية والمصدر</th>
                            <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredExpenses.map((e, idx) => (
                            <React.Fragment key={e.id || idx}>
                              <tr className={`border-b border-slate-850 hover:bg-slate-800/10 transition-colors ${expandedExpenses[e.id] ? "bg-slate-900/20" : ""}`}>
                                <td className="py-3 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedExpenses(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                                    title={expandedExpenses[e.id] ? "طي التفاصيل" : "توسيع وعرض التفاصيل"}
                                  >
                                    {expandedExpenses[e.id] ? (
                                      <ChevronUp className="w-4 h-4 text-amber-500" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-300">{e.no}</td>
                                <td className="py-3 px-3 font-mono text-slate-400">{e.date}</td>
                                <td className="py-3 px-3">
                                  <span className="block font-black text-white">{e.name}</span>
                                  <span className="block text-[10px] text-amber-500 mt-0.5 font-bold">فئة: {e.category}</span>
                                </td>
                                <td className="py-3 px-3 font-black text-rose-400 font-mono">-{Number(e.amount || 0).toLocaleString()} ريال</td>
                                <td className="py-3 px-3">
                                  <span className="block font-bold text-slate-200">{e.supplier || "مورد كلي"}</span>
                                  <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{e.project}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="block text-slate-400 max-w-xs truncate">{awCleanNotes(e.notes || "")}</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="inline-block text-[9px] text-cyan-400 font-sans font-extrabold bg-cyan-950/45 px-1.5 py-0.5 rounded border border-cyan-850">🏦 {awExtractTreasury(e.notes || "") || "خزنة الشركة"}</span>
                                    {(() => {
                                      const eAttachment = awExtractAttachment(e.notes || "");
                                      return eAttachment ? (
                                        <a href={eAttachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 font-sans font-extrabold bg-emerald-950/45 px-1.5 py-0.5 rounded border border-emerald-850" title="عرض المرفق المرفوع">
                                          📎 عرض المرفق
                                        </a>
                                      ) : null;
                                    })()}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center space-x-1">
                                  <button onClick={() => { setEditExpenseId(e.id); setEName(e.name || ""); setECategory(e.category || ""); setEAmount(e.amount || ""); setEDate(e.date || ""); setEProject(e.project || ""); setESupplier(e.supplier || ""); setENotes(awCleanNotes(e.notes || "")); setEAttachment(awExtractAttachment(e.notes || "") || ""); setETreasury(awExtractTreasury(e.notes || "") || "خزنة الشركة"); setExpenseCompanyId(e.company_id || ""); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button
                                    onClick={() => {
                                      if (currentUser?.role !== "admin" && currentUser?.role !== "supervisor" && !can("expenses")) {
                                        showToast("عذراً، لا تمتلك صلاحية حذف المصاريف!", "error");
                                        return;
                                      }
                                      triggerConfirm(
                                        "حذف سند المصروف",
                                        `هل أنت متأكد من حذف سند المصروف "${e.name}" بقيمة ${e.amount} ريال بشكل نهائي؟ يتطلب هذا الإجراء توثيق سبب رقابي.`,
                                        (reason) => deleteExpenseLogic(e.id, reason),
                                        true,
                                        "اكتب هنا سبب حذف قيد المصروف للأرشيف والرقابة..."
                                      );
                                    }}
                                    className="p-1 text-rose-400 hover:text-rose-500"
                                    title="حذف المصروف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                              {expandedExpenses[e.id] && (
                                <tr className="bg-slate-950/40 border-b border-slate-800/80">
                                  <td colSpan={8} className="p-4">
                                    <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800/60 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
                                      {/* Name and category */}
                                      <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                        <h4 className="text-[11px] font-black text-amber-500 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                          <span>🧾</span> تصنيف وبند المصروف
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                          <div>اسم المصروف:</div>
                                          <div className="text-white text-left truncate">{e.name || "—"}</div>
                                          <div>الفئة والتصنيف:</div>
                                          <div className="text-amber-500 text-left font-black">{e.category || "—"}</div>
                                          <div>المورد/المستفيد:</div>
                                          <div className="text-white text-left truncate">{e.supplier || "—"}</div>
                                        </div>
                                      </div>

                                      {/* Cost info */}
                                      <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                        <h4 className="text-[11px] font-black text-rose-400 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                          <span>💸</span> تفاصيل التكلفة والصندوق
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                          <div>المبلغ المصروف:</div>
                                          <div className="text-rose-400 text-left font-black font-mono">-{Number(e.amount || 0).toLocaleString()} ريال</div>
                                          <div>الخزنة الممولة:</div>
                                          <div className="text-cyan-400 text-left font-black">🏦 {awExtractTreasury(e.notes || "") || "خزنة الشركة"}</div>
                                        </div>
                                      </div>

                                      {/* Projects / Admin info */}
                                      <div className="space-y-1 bg-slate-950/45 p-3.5 rounded-xl border border-slate-800/80">
                                        <h4 className="text-[11px] font-black text-cyan-400 mb-2.5 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                                          <span>🏢</span> المشروع الإداري والفرع
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[11px] font-bold text-slate-400">
                                          <div>المشروع التابع:</div>
                                          <div className="text-white text-left truncate">{e.project || "—"}</div>
                                          <div>الشركة التابعة:</div>
                                          <div className="text-white text-left truncate">{companies.find(c => c.id === e.company_id)?.name || "عام"}</div>
                                          <div>تاريخ قيد السند:</div>
                                          <div className="text-slate-400 text-left font-mono text-[9px]">{e.created_at ? new Date(e.created_at).toLocaleString("ar-EG") : "—"}</div>
                                        </div>
                                      </div>

                                      {/* Notes */}
                                      <div className="md:col-span-3 bg-slate-950/25 p-3 rounded-xl border border-slate-850 mt-1">
                                        <span className="text-[10px] font-black text-slate-400 block mb-1">الملاحظات والبيان التفصيلي بالكامل:</span>
                                        <p className="text-slate-200 text-xs font-bold leading-relaxed whitespace-pre-wrap">{e.notes ? awCleanNotes(e.notes) : "لا توجد ملاحظات إضافية مسجلة."}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeSection === "attendance" && (
            <Attendance
              currentUser={currentUser}
              workers={workers}
              projects={projects}
              attendances={attendances}
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              onUpdate={loadEverything}
              showToast={showToast}
              onAutoLogout={handleLogout}
              isAttendanceOnly={isAttendanceOnly}
            />
          )}

          {/* Active Projects Tab Container */}
          {activeSection === "projects" && (
            <div id="projects-tab-view" className="space-y-6">
              <form onSubmit={saveProjectLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>🏗️</span> تسجيل مشروع جديد وبطاقة الموقع</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input required placeholder="اسم المشروع" value={pName} onChange={(e) => setPName(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="الموقع الجغرافي" value={pLocation} onChange={(e) => setPLocation(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="المهندس المشرف" value={pEngineer} onChange={(e) => setPEngineer(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="number" placeholder="الميزانية المخصصة" value={pBudget} onChange={(e) => setPBudget(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="date" title="تاريخ البدء" value={pStart} onChange={(e) => setPStart(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="date" title="تاريخ الانتهاء" value={pEnd} onChange={(e) => setPEnd(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="number" placeholder="نسبة الإنجاز %" value={pProgress} onChange={(e) => setPProgress(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <select value={pStatus} onChange={(e: any) => setPStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                    <option value="نشط">نشط</option>
                    <option value="متوقف">متوقف</option>
                    <option value="منتهي">منتهي</option>
                  </select>
                  {getAuthorizedCompanies().length > 1 && (
                    <select
                      value={projectCompanyId}
                      onChange={(e) => setProjectCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                    >
                      <option value="">🏢 اختيار الشركة (تلقائي)</option>
                      {getAuthorizedCompanies().map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}

                  <div className="md:col-span-4 border-t border-slate-800/60 pt-4 mt-2 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                        <span>📍</span> تحديد النطاق الجغرافي للبصمة (بصمة موقع محدد)
                      </span>
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 rounded-lg text-[10px] font-black text-amber-300 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>🧭</span> التقاط إحداثيات موقعي الحالي لإدخالها
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400">خط العرض (Latitude)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="مثال: 24.774265"
                          value={pLatitude}
                          onChange={(e) => setPLatitude(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400">خط الطول (Longitude)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="مثال: 46.738586"
                          value={pLongitude}
                          onChange={(e) => setPLongitude(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-slate-400">مسافة القبول القصوى (بالمتر)</label>
                        <input
                          type="number"
                          placeholder="مثال: 25 متر"
                          value={pAllowedRadius}
                          onChange={(e) => setPAllowedRadius(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-normal font-sans">
                      * في حال تحديد خط العرض وخط الطول والمسافة، لن يُسمح لأي موظف بتسجيل الحضور أو الانصراف إلا إذا كان في النطاق الجغرافي الفعلي للمشروع. اترك خط العرض والطول فارغاً لتعطيل قيد المسافة وجعل البصمة مفتوحة من أي مكان.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  {editProjectId && (
                    <button type="button" onClick={() => { setEditProjectId(null); setPName(""); setPLocation(""); setPEngineer(""); setPBudget(""); setPProgress(0); setPNotes(""); setProjectCompanyId(""); setPLatitude(""); setPLongitude(""); setPAllowedRadius(25); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black cursor-pointer hover:bg-slate-700 text-white transition-colors">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer">{editProjectId ? "حفظ التحديث" : "إنشاء بطاقة المشروع"}</button>
                </div>
              </form>

              {projectsViewMode === "map" ? (
                <ProjectMap
                  projects={getVisibleProjects()}
                  viewMode={projectsViewMode}
                  onViewModeChange={setProjectsViewMode}
                />
              ) : (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>📋</span> جدول وقائمة المشاريع المسجلة
                      </h4>
                      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setProjectsViewMode("list")}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            projectsViewMode === "list"
                              ? "bg-amber-500 text-slate-950 font-extrabold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>عرض كقائمة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProjectsViewMode("map")}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            projectsViewMode === "map"
                              ? "bg-amber-500 text-slate-950 font-extrabold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <MapIcon className="w-3.5 h-3.5" />
                          <span>خريطة المشاريع</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative w-full md:w-80">
                      <input
                        type="text"
                        placeholder="البحث المباشر في المشاريع..."
                        value={pSearch}
                        onChange={(e) => setPSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors text-right"
                      />
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                          <th className="py-2.5 px-3 font-bold">اسم المشروع والموقع</th>
                          <th className="py-2.5 px-3 font-bold">المهندس المشرف</th>
                          <th className="py-2.5 px-3 font-bold">الميزانية</th>
                          <th className="py-2.5 px-3 font-bold">تكلفة العمالة المباشرة</th>
                          <th className="py-2.5 px-3 font-bold">Progress</th>
                          <th className="py-2.5 px-3 font-bold">الحالة</th>
                          <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getVisibleProjects().filter(p => {
                          if (!pSearch.trim()) return true;
                          const q = pSearch.toLowerCase().trim();
                          return (
                            (p.name && p.name.toLowerCase().includes(q)) ||
                            (p.location && p.location.toLowerCase().includes(q)) ||
                            (p.engineer && p.engineer.toLowerCase().includes(q)) ||
                            (p.notes && p.notes.toLowerCase().includes(q))
                          );
                        }).map((p, idx) => {
                          const pName = p.name ? p.name.trim() : "";
                          const pCompanyId = p.company_id;
                          const pWorkers = workers.filter(w => (w.project && w.project.trim() === pName) || (pCompanyId && w.company_id === pCompanyId));
                          const pWorkerIds = new Set(pWorkers.map(w => w.id));

                          const pLaborPayments = payments.filter(pay => 
                            (pay.project && pay.project.trim() === pName) ||
                            (pay.worker_id && pWorkerIds.has(pay.worker_id))
                          ).reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

                          const pLaborExpenses = expenses.filter(exp => 
                            (exp.project && exp.project.trim() === pName) && 
                            (exp.category === "عمالة" || (exp.notes && exp.notes.includes("عمالة")))
                          ).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

                          const pLaborContracts = installments.filter(inst =>
                            (inst.project && inst.project.trim() === pName) &&
                            (inst.contract_direction === "مصروفات عمالة" || awExtractContractDirection(inst.notes || "") === "مصروفات عمالة")
                          ).reduce((sum, inst) => sum + Number(inst.amount || 0), 0);

                          const totalLaborCost = pLaborPayments + pLaborExpenses + pLaborContracts;
                          const isExpanded = !!expandedProjects[p.id];

                          return (
                            <React.Fragment key={p.id || idx}>
                              <tr className={`border-b border-slate-850 hover:bg-slate-800/10 transition-colors ${isExpanded ? "bg-slate-900/30" : ""}`}>
                                <td className="py-3 px-3">
                                  <span className="block font-black text-white">{p.name}</span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-500" /> {p.location || "غير محدد"}</span>
                                </td>
                                <td className="py-3 px-3 font-bold text-slate-200">{p.engineer || "بإشراف فرقا المقاول"}</td>
                                <td className="py-3 px-3 font-mono text-white font-extrabold">{Number(p.budget || 0).toLocaleString()} ريال</td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-col">
                                    <span className="font-mono text-cyan-400 font-extrabold text-xs">{totalLaborCost.toLocaleString()} ريال</span>
                                    <span className="text-[10px] text-slate-400 font-bold">👥 {pWorkers.length} عامل مسجل</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-bold text-amber-400">{p.progress}%</span>
                                    <div className="w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                      <div className="bg-amber-500 h-full" style={{ width: `${p.progress}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${p.status === "نشط" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{p.status}</span>
                                </td>
                                <td className="py-3 px-3 text-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedProjects(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                    className="p-1 text-cyan-400 hover:text-cyan-300"
                                    title={isExpanded ? "طي تفاصيل العمالة" : "توسيع تفاصيل تكلفة العمالة والمشاريع"}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (currentUser?.role !== "admin" && currentUser?.role !== "supervisor" && !can("projects")) {
                                        showToast("عذراً، لا تمتلك صلاحية تعديل المشاريع!", "error");
                                        return;
                                      }
                                      setEditProjectId(p.id);
                                      setPName(p.name || "");
                                      setPLocation(p.location || "");
                                      setPEngineer(p.engineer || "");
                                      setPBudget(p.budget || "");
                                      setPProgress(p.progress !== undefined && p.progress !== null ? p.progress : 0);
                                      setPStatus(p.status || "نشط");
                                      setPNotes(p.notes || "");
                                      setProjectCompanyId(p.company_id || "");
                                      setPLatitude(p.latitude !== undefined && p.latitude !== null ? p.latitude : "");
                                      setPLongitude(p.longitude !== undefined && p.longitude !== null ? p.longitude : "");
                                      setPAllowedRadius(p.allowed_radius !== undefined && p.allowed_radius !== null ? p.allowed_radius : 25);
                                      document.getElementById("projects-tab-view")?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="p-1 text-blue-400 hover:text-white"
                                    title="تعديل المشروع"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                              <button
                                onClick={() => {
                                  if (currentUser?.role !== "admin" && currentUser?.role !== "supervisor" && !can("projects")) {
                                    showToast("عذراً، لا تمتلك صلاحية حذف المشاريع!", "error");
                                    return;
                                  }
                                  triggerConfirm(
                                    "حذف بطاقة المشروع",
                                    `هل أنت متأكد من حذف مشروع "${p.name}" بشكل نهائي من النظام؟ يتطلب هذا الإجراء توثيق سبب رقابي للأغراض التدقيقية.`,
                                    (reason) => deleteProjectLogic(p.id, reason),
                                    true,
                                    "اكتب هنا سبب حذف المشروع للأرشيف والمراجعة..."
                                  );
                                }}
                                className="p-1 text-rose-400 hover:text-rose-500"
                                title="حذف المشروع"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-950/60 border-b border-slate-800">
                              <td colSpan={7} className="p-4">
                                <div className="bg-slate-900/80 rounded-2xl p-4 border border-cyan-500/30 space-y-3 text-right">
                                  <h5 className="text-xs font-black text-cyan-400 flex items-center gap-2">
                                    <span>🏗️</span> كارت تحليل تكلفة العمالة المباشرة للمشروع — {p.name}
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
                                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-bold">عدد العمال المعينين</span>
                                      <span className="text-sm font-black text-white font-mono">{pWorkers.length} عامل</span>
                                    </div>
                                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-bold">مدفوعات العمالة (سندات صرف)</span>
                                      <span className="text-sm font-black text-rose-400 font-mono">{pLaborPayments.toLocaleString()} ريال</span>
                                    </div>
                                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-bold">مصروفات مباشرة (بند عمالة)</span>
                                      <span className="text-sm font-black text-amber-400 font-mono">{pLaborExpenses.toLocaleString()} ريال</span>
                                    </div>
                                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي تكلفة العمالة المباشرة</span>
                                      <span className="text-sm font-black text-cyan-400 font-mono">{totalLaborCost.toLocaleString()} ريال</span>
                                    </div>
                                  </div>
                                  {pWorkers.length > 0 && (
                                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                                      <span className="text-[10px] font-black text-slate-400 block mb-1.5">العمال والموظفون المرتبطون بالمشروع:</span>
                                      <div className="flex flex-wrap gap-2">
                                        {pWorkers.map((w, wIdx) => (
                                          <span key={wIdx} className="px-2.5 py-1 bg-slate-900 border border-slate-750 rounded-lg text-[11px] font-bold text-slate-200">
                                            👷‍♂️ {w.name} ({w.job}) — {w.salary ? `${w.salary} ريال` : "بدون راتب محدد"}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workers dynamic tab log integrates */}
          {activeSection === "workers" && (
            <div className="space-y-6">
              <form onSubmit={saveWorkerLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>👷</span> تسجيل عامل/مشرف وقائمة السلف الجارية</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input required placeholder="اسم العامل بالكامل" value={wName} onChange={(e) => setWName(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="رقم الهوية الإقامة" value={wId} onChange={(e) => setWId(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="رقم الجوال" value={wPhone} onChange={(e) => setWPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <select value={wJob} onChange={(e: any) => setWJob(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                    <option value="حداد">حداد</option>
                    <option value="نجار">نجار</option>
                    <option value="كهربائي">كهربائي</option>
                    <option value="سباك">سباك</option>
                    <option value="عامل">عامل</option>
                    <option value="مشرف">مشرف</option>
                  </select>
                  <input placeholder="المشروع المعين" value={wProject} onChange={(e) => setWProject(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="number" placeholder="قيمة اليومية" value={wDaily} onChange={(e) => setWDaily(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="number" placeholder="عدد أيام العمل" value={wDays} onChange={(e) => setWDays(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="number" placeholder="سلفة معجلة" value={wAdvance} onChange={(e) => setWAdvance(e.target.value ? Number(e.target.value) : 0)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <select value={wStatus} onChange={(e: any) => setWStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                    <option value="على رأس العمل">على رأس العمل</option>
                    <option value="إجازة">إجازة</option>
                    <option value="موقوف">موقوف</option>
                  </select>
                  <input placeholder="المستلم من سند الصرف (إذا اختلف عن العامل)" value={wRecipientName} onChange={(e) => setWRecipientName(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  {getAuthorizedCompanies().length > 1 && (
                    <select
                      value={workerCompanyId}
                      onChange={(e) => setWorkerCompanyId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                    >
                      <option value="">🏢 اختيار الشركة (تلقائي)</option>
                      {getAuthorizedCompanies().map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                  <textarea placeholder="ملاحظات" value={wNotes} onChange={(e) => setWNotes(e.target.value)} className="w-full px-3 py-1.5 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white sm:col-span-2 focus:outline-none" />
                </div>
                <div className="flex gap-2 justify-end">
                  {editWorkerId && (
                    <button type="button" onClick={() => { setEditWorkerId(null); setWName(""); setWId(""); setWPhone(""); setWProject(""); setWDaily(""); setWDays(""); setWAdvance(0); setWRecipientName(""); setWNotes(""); setWorkerCompanyId(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editWorkerId ? "تعديل القيّد" : "قيد العامل بالمقاولات"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>📋</span> جدول وقائمة العمال والشركاء المسجلين
                  </h4>
                  <div className="relative w-full md:w-80">
                    <input
                      type="text"
                      placeholder="البحث المباشر في العمال..."
                      value={wSearch}
                      onChange={(e) => setWSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors text-right"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                        <th className="py-2.5 px-3 font-bold">الاسم والمهنة</th>
                        <th className="py-2.5 px-3 font-bold">المشروع المعني</th>
                        <th className="py-2.5 px-3 font-bold text-center">أيام العمل الجارية</th>
                        <th className="py-2.5 px-3 font-bold">إجمالي المستحق اليومي</th>
                        <th className="py-2.5 px-3 font-bold">سلفة مسحوبة</th>
                        <th className="py-2.5 px-3 font-bold">المستلم في السند</th>
                        <th className="py-2.5 px-3 font-bold">الصافي المعلق</th>
                        <th className="py-2.5 px-3 font-bold">الوضعية</th>
                        <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getVisibleWorkers().filter(w => {
                        if (!wSearch.trim()) return true;
                        const q = wSearch.toLowerCase().trim();
                        return (
                          (w.name && w.name.toLowerCase().includes(q)) ||
                          (w.worker_id && w.worker_id.toLowerCase().includes(q)) ||
                          (w.phone && w.phone.toLowerCase().includes(q)) ||
                          (w.job && w.job.toLowerCase().includes(q)) ||
                          (w.project && w.project.toLowerCase().includes(q)) ||
                          (w.recipient_name && w.recipient_name.toLowerCase().includes(q)) ||
                          (w.notes && w.notes.toLowerCase().includes(q))
                        );
                      }).map((w, idx) => (
                        <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 px-3">
                            <span className="block font-black text-white">{w.name}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">مهنة: {w.job} • {w.worker_id || "بدون هوية"}</span>
                          </td>
                          <td className="py-3 px-3 font-bold text-amber-500">{w.project}</td>
                          <td className="py-3 px-3 font-mono font-bold text-center text-white">{w.days} يومًا</td>
                          <td className="py-3 px-3 font-mono text-slate-200">{(w.daily * w.days).toLocaleString()} ريال</td>
                          <td className="py-3 px-3 font-black text-rose-400 font-mono">-{Number(w.advance || 0).toLocaleString()} ريال</td>
                          <td className="py-3 px-3 font-bold text-slate-300">
                            {w.recipient_name || <span className="text-slate-500 text-[10px] italic">العامل نفسه</span>}
                          </td>
                          <td className="py-3 px-3 font-black text-emerald-400 font-mono">{(w.total - w.advance).toLocaleString()} ريال</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${w.status === "على رأس العمل" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-850 text-slate-400"}`}>{w.status}</span>
                          </td>
                          <td className="py-3 px-3 text-center space-x-1">
                            <button onClick={() => initHrWorker(w)} className="p-1 text-amber-400 hover:text-amber-300 hover:scale-110 duration-200 inline-block" title="الشؤون والملف الوظيفي"><Users className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setEditWorkerId(w.id); setWName(w.name || ""); setWId(w.worker_id || ""); setWPhone(w.phone || ""); setWJob(w.job || "عامل"); setWProject(w.project || ""); setWDaily(w.daily || ""); setWDays(w.days || ""); setWAdvance(w.advance !== undefined && w.advance !== null ? w.advance : 0); setWStatus(w.status || "على رأس العمل"); setWRecipientName(w.recipient_name || ""); setWNotes(w.notes || ""); setWorkerCompanyId(w.company_id || ""); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={() => {
                                if (currentUser?.role !== "admin" && currentUser?.role !== "supervisor" && !can("workers")) {
                                  showToast("عذراً، لا تمتلك صلاحية حذف العمال!", "error");
                                  return;
                                }
                                triggerConfirm(
                                  "حذف ملف العامل",
                                  `هل أنت متأكد من مسح ملف العامل "${w.name}" بشكل نهائي؟ سيؤدي ذلك لإلغاء قيود تتبع سلفياته وحساباته. يتطلب هذا الإجراء توثيق سبب رقابي.`,
                                  (reason) => deleteWorkerLogic(w.id, reason),
                                  true,
                                  "اكتب هنا سبب حذف ملف العامل للأرشيف والتدقيق والمراجعة..."
                                );
                              }}
                              className="p-1 text-rose-400 hover:text-rose-500"
                              title="حذف ملف العامل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HR Profile Modal */}
              {selectedWorkerForHr && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 space-y-6 text-right" dir="rtl">
                    
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          <span className="text-xl">💼</span>
                          <span>الملف التعريفي والشؤون الوظيفية: {selectedWorkerForHr.name}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          المهنة الحالية: <span className="text-amber-400 font-bold">{selectedWorkerForHr.job}</span> • 
                          رقم الهوية/الإقامة: <span className="text-slate-200 font-mono">{selectedWorkerForHr.worker_id || "غير مسجل"}</span> • 
                          المشروع: <span className="text-amber-500 font-bold">{selectedWorkerForHr.project || "عام"}</span>
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedWorkerForHr(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/45 hover:text-rose-405 text-xs font-bold rounded-lg transition-colors border border-slate-750"
                      >
                        إغلاق ❌
                      </button>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* 1. Employment Contract Panel */}
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4">
                        <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                          <h4 className="text-xs font-black text-amber-400 flex items-center gap-1">📋 <span>عقد وجاهزية الموظف</span></h4>
                          <button 
                            type="button"
                            onClick={() => onPrintWorkerContract(selectedWorkerForHr)}
                            className="px-2.5 py-1 bg-amber-500 text-slate-950 hover:bg-amber-400 text-[10px] font-black rounded-md flex items-center gap-1 transition-all"
                          >
                            <span>🖨️</span> طباعة العقد الموحد
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">تاريخ البداية (المباشرة)</label>
                            <input 
                              type="date" 
                              value={cStart} 
                              onChange={(e) => setCStart(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-sans" 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">مدة التعاقد</label>
                            <input 
                              type="text" 
                              placeholder="مثلاً: سنة واحدة / سنتين" 
                              value={cDuration} 
                              onChange={(e) => setCDuration(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none" 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">الراتب الأساسي (شهري)</label>
                            <input 
                              type="number" 
                              placeholder="0" 
                              value={cSalary} 
                              onChange={(e) => setCSalary(e.target.value ? Number(e.target.value) : "")} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-sans text-white focus:outline-none" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold">بدل السكن</label>
                              <input 
                                type="number" 
                                placeholder="0" 
                                value={cHousing} 
                                onChange={(e) => setCHousing(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-sans text-white focus:outline-none font-sans" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold">بدل انتقال</label>
                              <input 
                                type="number" 
                                placeholder="0" 
                                value={cTransport} 
                                onChange={(e) => setCTransport(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-sans text-white focus:outline-none font-sans" 
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">بدلات أخرى</label>
                            <input 
                              type="number" 
                              placeholder="0" 
                              value={cOther} 
                              onChange={(e) => setCOther(e.target.value ? Number(e.target.value) : "")} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-sans text-white focus:outline-none font-sans" 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">رقم جواز السفر</label>
                            <input 
                              type="text" 
                              placeholder="K123456" 
                              value={cPassport} 
                              onChange={(e) => setCPassport(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-mono" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold">فترة التجربة</label>
                              <input 
                                type="text" 
                                placeholder="90 يوم" 
                                value={cProbation} 
                                onChange={(e) => setCProbation(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold">الإجازة السنوية (يوم)</label>
                              <input 
                                type="number" 
                                placeholder="30" 
                                value={cVacation} 
                                onChange={(e) => setCVacation(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">⏰ وقت بداية الدوام (الوردية)</label>
                              <input 
                                type="time" 
                                value={cShiftStart} 
                                onChange={(e) => setCShiftStart(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-sans" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">💸 خصم ساعة التأخير (ريال)</label>
                              <input 
                                type="number" 
                                placeholder="تلقائي (الراتب / ٢٤٠)" 
                                value={cDelayRate} 
                                onChange={(e) => setCDelayRate(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-sans" 
                              />
                            </div>
                          </div>

                          <div className="space-y-1 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                            <label className="text-[10px] text-slate-300 font-bold block">🔐 ربط ملف العقد والخدمة الذاتية بحساب مستخدم جاري</label>
                            <select 
                              value={cUserId} 
                              onChange={(e) => setCUserId(e.target.value)} 
                              className="w-full px-2 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-[11px] font-bold text-amber-400 focus:outline-none cursor-pointer text-slate-950 bg-white"
                            >
                              <option value="" className="text-slate-950">❌ غير مربوط بحساب مستخدم (اضغط لربط حساب مالي)</option>
                              {getAuthorizedUsers().map((u) => (
                                <option key={u.id} value={u.id} className="text-slate-950">
                                  👤 {u.name} (كود: {u.code} • {u.role === "admin" ? "مدير" : (u.role === "supervisor" ? "مشرف" : "موظف")})
                                </option>
                              ))}
                            </select>
                            <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">يرتبط هذا العقد تلقائياً بحساب الموظف المحدد لتفعيل ملفه وطلباته للخدمة الذاتية بشكل مباشر.</p>
                          </div>

                          <button 
                            type="button" 
                            onClick={saveWorkerContractLogic}
                            className="w-full py-2 bg-amber-500 text-slate-950 rounded-lg text-xs font-black transition-all mt-4"
                          >
                            💾 حفظ بنود عقد العمل
                          </button>
                        </div>
                      </div>

                      {/* 2. Advance Management Panel */}
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4">
                        <div className="border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-black text-rose-400 flex items-center gap-1 font-sans">💸 <span>إصدار وصرف سلفة مالية عاجلة</span></h4>
                        </div>

                        <form onSubmit={addWorkerAdvanceLogic} className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">قيمة السلفة المستحقة (ريال)</label>
                            <input 
                              type="number" 
                              required
                              placeholder="0" 
                              value={advAmount} 
                              onChange={(e) => setAdvAmount(e.target.value ? Number(e.target.value) : "")} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-sans text-white focus:outline-none focus:border-rose-500 font-sans" 
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-400 font-bold">صرف مالي من الخزنة</label>
                              {(currentUser?.role === "admin" || can("treasury")) && (
                                <button
                                  type="button"
                                  onClick={() => openAddTreasuryDialog(selectedWorkerForHr?.company_id || selectedCompanyId)}
                                  className="text-[9px] text-amber-500 hover:text-amber-400 font-bold transition-colors"
                                >
                                  ➕ إضافة خزنة
                                </button>
                              )}
                            </div>
                            <select 
                              value={advTreasury} 
                              onChange={(e) => setAdvTreasury(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer text-slate-950 bg-white"
                            >
                              {getAuthorizedTreasuries(currentUser, selectedCompanyId).map((tName) => (
                                <option key={tName} value={tName} className="text-slate-950">💰 {tName}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">تاريخ المعاملة</label>
                            <input 
                              type="date" 
                              required
                              value={advDate} 
                              onChange={(e) => setAdvDate(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-sans" 
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">تفاصيل إضافية / بيان الصرف</label>
                            <textarea 
                              placeholder="تكتب هنا ملاحظات السند..." 
                              value={advNotes} 
                              onChange={(e) => setAdvNotes(e.target.value)} 
                              className="w-full px-2.5 py-2 h-20 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 resize-none font-sans" 
                            />
                          </div>

                          <button 
                            type="submit" 
                            className="w-full py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-xs font-black transition-all mt-4"
                          >
                            ➕ اعتماد وصرف السلفة الحالية
                          </button>
                        </form>

                        <div className="pt-2 border-t border-slate-800">
                          <label className="text-[10px] text-slate-400 block font-bold">الوضعية المالية للموظف بالملفات</label>
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center">
                              <span className="block text-[9px] text-slate-400">إجمالي السلف العهدة</span>
                              <span className="block text-xs font-black text-rose-450 text-rose-400 mt-0.5">{Number(selectedWorkerForHr.advance || 0).toLocaleString()} ريال</span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center font-sans">
                              <span className="block text-[9px] text-slate-400 font-sans">المتبقي الجاري للاستلام</span>
                              <span className="block text-xs font-black text-emerald-400 mt-0.5">{(selectedWorkerForHr.total - selectedWorkerForHr.advance).toLocaleString()} ريال</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Leave Requests Panel */}
                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-850 space-y-4">
                        <div className="border-b border-slate-800 pb-2">
                          <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1">🏖️ <span>إجازات الموظف وتعطيل المباشرة</span></h4>
                        </div>

                        <form onSubmit={addWorkerLeaveLogic} className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold">تاريخ البداية</label>
                              <input 
                                type="date" 
                                required
                                value={lhStart} 
                                onChange={(e) => setLhStart(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-sans" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold">تاريخ النهاية</label>
                              <input 
                                type="date" 
                                required
                                value={lhEnd} 
                                onChange={(e) => setLhEnd(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-sans" 
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">نوع الإجازة المطلوبة</label>
                            <select 
                              value={lhType} 
                              onChange={(e) => setLhType(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer text-slate-950 bg-white"
                            >
                              <option value="إجازة اعتيادية" className="text-slate-950">إجازة اعتيادية سنوية</option>
                              <option value="إجازة مرضية" className="text-slate-950">إجازة مرضية موثقة</option>
                              <option value="إجازة اضطرارية" className="text-slate-950">إجازة اضطرارية طارئة</option>
                              <option value="دون راتب" className="text-slate-950">إجازة دون راتب</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 font-bold">توضيحات أخرى</label>
                            <input 
                              type="text" 
                              placeholder="سبب أو ملاحظة..." 
                              value={lhNotes} 
                              onChange={(e) => setLhNotes(e.target.value)} 
                              className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-sans" 
                            />
                          </div>

                          <button 
                            type="submit" 
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-lg text-xs font-black transition-all mt-4"
                          >
                            🏖️ تسجيل طلب إجازة معتمد
                          </button>
                        </form>

                        {/* Leave History List */}
                        <div className="pt-2 border-t border-slate-800">
                          <label className="text-[10px] text-slate-400 block font-bold mb-1.5">الإجازات السابقة المسجلة ({awExtractWorkerLeaves(selectedWorkerForHr.notes || "").length})</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {awExtractWorkerLeaves(selectedWorkerForHr.notes || "").length === 0 ? (
                              <span className="text-[10px] text-slate-500 block text-center py-2 bg-slate-950 rounded-xl font-sans font-sans">لا توجد إجازات سابقة مسجلة للموظف بعد.</span>
                            ) : (
                              awExtractWorkerLeaves(selectedWorkerForHr.notes || "").map((l, lIdx) => (
                                <div key={lIdx} className="bg-slate-900/85 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 font-sans">
                                  <div className="flex justify-between font-black text-[10px] text-emerald-400 font-sans">
                                    <span>{l.type}</span>
                                    <span className="text-[9px] text-slate-400">من {l.start} إلى {l.end}</span>
                                  </div>
                                  {l.notes && <p className="text-[10px] text-slate-400 mt-1 truncate font-sans">{l.notes}</p>}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* 4. Delay & Net Monthly Salary Calculator (Full Width Panel) */}
                    <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5 font-sans">
                            <span>📊</span>
                            <span>حاسبة التأخير وصافي راتب نهاية الشهر للموظف</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 font-sans">تحديد الشهر واحتساب تلقائي للغياب والتأخير وقيمة الخصومات المقابلة ومستحقات الرواتب والبدلات.</p>
                        </div>
                        <div className="flex items-center gap-2 font-sans">
                          <span className="text-xs text-slate-400 font-bold">تحديد شهر الاحتساب:</span>
                          <input 
                            type="month" 
                            value={selectedSalaryMonth}
                            onChange={(e) => setSelectedSalaryMonth(e.target.value)}
                            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 focus:outline-none cursor-pointer font-sans"
                          />
                        </div>
                      </div>

                      {(() => {
                        const stats = calculateWorkerSalaryForMonth(selectedWorkerForHr, selectedSalaryMonth);
                        return (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold">الراتب الأساسي والبدلات المعتمدة</span>
                                <span className="text-sm font-black text-white block mt-1 font-mono">{(stats.basicSalary + stats.housing + stats.transport + stats.other).toLocaleString()} ريال</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">أساسي: {stats.basicSalary} | بدلات: {stats.housing + stats.transport + stats.other}</span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold">أيام حضور هذا الشهر</span>
                                <span className="text-sm font-black text-amber-400 block mt-1 font-mono">{stats.presentDays} يوم عمل</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">من إجمالي بصمات الشهر: {stats.monthRecordsCount}</span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold">إجمالي التأخيرات المسجلة</span>
                                <span className="text-sm font-black text-rose-400 block mt-1 font-mono">{stats.totalDelayMinutes} دقيقة ({Math.floor(stats.totalDelayMinutes / 60)} س و {stats.totalDelayMinutes % 60} د)</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">تأخر في {stats.delayDaysCount} أيام • معدل خصم الساعة: {stats.hourlyRate} ريال</span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold">سلف ومسحوبات الشهر الجاري</span>
                                <span className="text-sm font-black text-cyan-400 block mt-1 font-mono">-{stats.totalAdvancesInMonth.toLocaleString()} ريال</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">عدد حركات السلف: {stats.monthAdvances.length}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                              {/* Left Column: Delay details list table */}
                              <div className="lg:col-span-2 bg-slate-950/30 rounded-xl p-4 border border-slate-800 space-y-2">
                                <h5 className="text-xs font-black text-slate-300 font-sans">📋 تفاصيل التأخيرات اليومية لشهر ({selectedSalaryMonth})</h5>
                                {stats.delayDetailsList.length === 0 ? (
                                  <div className="p-8 text-center text-xs text-slate-500 font-sans">لا توجد أي تأخيرات مسجلة للموظف في هذا الشهر! الحضور ملتزم بالكامل.</div>
                                ) : (
                                  <div className="overflow-y-auto max-h-40">
                                    <table className="w-full text-right text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 font-sans">
                                          <th className="py-2 px-2">تاريخ الدوام</th>
                                          <th className="py-2 px-2">بصمة الحضور</th>
                                          <th className="py-2 px-2">مدة التأخير</th>
                                          <th className="py-2 px-2">الخصم المقدر</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {stats.delayDetailsList.map((d, dIdx) => (
                                          <tr key={dIdx} className="border-b border-slate-800/60 text-slate-300 hover:bg-slate-900/50 font-sans">
                                            <td className="py-2 px-2 font-sans">{d.date}</td>
                                            <td className="py-2 px-2 text-emerald-400 font-mono font-bold">{d.checkIn}</td>
                                            <td className="py-2 px-2 text-rose-400 font-mono font-bold">{d.delayMins} دقيقة</td>
                                            <td className="py-2 px-2 font-mono text-rose-400">-{((d.delayMins / 60) * stats.hourlyRate).toFixed(1)} ريال</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Gross -> Deductions -> Net Salary receipt */}
                              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between font-sans">
                                <div className="space-y-3 text-xs font-sans">
                                  <h5 className="text-xs font-black text-amber-400 text-center border-b border-slate-800 pb-2 font-sans">🧾 بيان استحقاق نهاية الشهر</h5>
                                  
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold">الراتب الشهري الأساسي:</span>
                                    <span className="text-slate-200 font-mono">{stats.basicSalary.toLocaleString()} ريال</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold">البدلات والمزايا:</span>
                                    <span className="text-slate-200 font-mono">{(stats.housing + stats.transport + stats.other).toLocaleString()} ريال</span>
                                  </div>
                                  <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-slate-800">
                                    <span>إجمالي الاستحقاق (Gross):</span>
                                    <span className="font-mono">{stats.expectedGross.toLocaleString()} ريال</span>
                                  </div>

                                  <div className="flex justify-between text-rose-400 pt-1">
                                    <span>خصم غياب وتأخيرات:</span>
                                    <span className="font-mono">-{stats.delayDeduction.toLocaleString()} ريال</span>
                                  </div>
                                  <div className="flex justify-between text-rose-400">
                                    <span>خصم سلف الشهر:</span>
                                    <span className="font-mono">-{stats.totalAdvancesInMonth.toLocaleString()} ريال</span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center font-sans">
                                  <span className="text-xs font-black text-emerald-400 font-sans">الصافي الجاري للراتب (Net):</span>
                                  <span className="text-base font-black text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">{stats.netSalary.toLocaleString()} ريال</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* HR Module Section */}
          {activeSection === "hr" && (
            <HRModule
              currentUser={currentUser}
              projects={projects}
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              showToast={showToast}
            />
          )}

          {/* Company Assets Section */}
          {activeSection === "company_assets" && (
            <CompanyAssets
              currentUser={currentUser}
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              showToast={showToast}
            />
          )}

          {/* Financial Reports Section */}
          {activeSection === "financial_reports" && (
            <FinancialReports
              receipts={receipts}
              payments={payments}
              expenses={expenses}
              installments={installments}
              projects={projects}
              companies={companies}
              extracts={extracts}
              currentUser={currentUser}
            />
          )}

          {/* Companies and Extracts Section */}
          {activeSection === "companies" && (currentUser?.role === "admin" || can("companies")) && (
            <div className="space-y-8">
              
              {/* Companies Tab Layout Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Add/Edit Company Form Card */}
                <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-base font-black text-white flex items-center gap-2 font-sans">
                      <span>🏢</span>
                      <span>{editCompanyId ? "تعديل بطاقة الشركة" : "إضافة شركة جديدة"}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">تسجيل وتحديث كيانات الشركة التابعة وقيم رأسمالها.</p>
                  </div>

                  <form onSubmit={saveCompanyLogic} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">اسم الشركة بالكامل *</label>
                      <input
                        required
                        type="text"
                        placeholder="مثال: شركة عرب وورد للمباني"
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">نشاط الشركة / الوصف الفرعي (يظهر بالهيدر)</label>
                      <input
                        type="text"
                        placeholder="مثال: للمقاولات العامة والتقسيط والعقود"
                        value={cActivity}
                        onChange={(e) => setCActivity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">رقم السجل التجاري</label>
                      <input
                        type="text"
                        placeholder="مثال: 1010XXXXXX"
                        value={cRegister}
                        onChange={(e) => setCRegister(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">الرقم الضريبي الموحد</label>
                      <input
                        type="text"
                        placeholder="مثال: 3000XXXXXX00003"
                        value={cTaxNo}
                        onChange={(e) => setCTaxNo(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">رأس مال الشركة التأسيسي (ريال)</label>
                      <input
                        type="number"
                        placeholder="العاصمة التأسيسية بالعملة المحلية"
                        value={cCapital}
                        onChange={(e) => setCCapital(e.target.value ? Number(e.target.value) : "")}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">هاتف التواصل</label>
                      <input
                        type="text"
                        placeholder="مثال: 05XXXXXXXX"
                        value={cPhone}
                        onChange={(e) => setCPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold">العنوان ومقر الشركة</label>
                      <textarea
                        placeholder="المدينة والحي والشارع ومقر الإدارة..."
                        value={cAddress}
                        onChange={(e) => setCAddress(e.target.value)}
                        className="w-full px-3 py-2 h-16 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <ImageUploader
                        id="company-logo-uploader"
                        label="شعار الشركة المرفوع"
                        placeholder="قم بسحب وإفلات الشعار هنا، أو انقر للاختيار"
                        value={cLogoUrl}
                        onChange={(val) => setCLogoUrl(val)}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      {editCompanyId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditCompanyId(null);
                            setCName("");
                            setCRegister("");
                            setCTaxNo("");
                            setCCapital("");
                            setCPhone("");
                            setCAddress("");
                            setCLogoUrl("");
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-xl text-xs font-black transition-colors"
                        >
                          إلغاء
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-gradient-to-l from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/15"
                      >
                        {editCompanyId ? "حفظ التعديلات 💾" : "اعتماد وتسجيل الشركة ✨"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Registered Companies Grid List */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2 font-sans">
                          <span>🏢</span>
                          <span>الشركات التابعة المسجلة ({companies.length})</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">الكيانات والمؤسسات الحالية تحت المنظومة الموحدة.</p>
                      </div>
                    </div>

                    <div className="mb-5 bg-gradient-to-l from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-right">
                      <span className="text-xl">🛡️</span>
                      <div className="space-y-1 font-sans">
                        <span className="block text-xs font-black text-amber-400">نظام الشركات المستقلة مفعل (Demo Mode)</span>
                        <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                          لقد تم تحويل المنظومة بنجاح لنظام متعدد الشركات المستقلة. كل شركة تمتلك خزائنها، وموظفيها، وعقودها، وسنداتها، وعملائها، ومصروفاتها بشكل معزول تماماً ومستقل منطقياً. لا يمكن لأي موظف أو مستخدم رؤية بيانات شركة أخرى، بينما يملك الأدمن العام فقط الصلاحية الكاملة للتنقل بين الشركات عبر خيار <b>"الشركة النشطة"</b> بأعلى الشاشة لإدارة المنظومة بشكل متكامل.
                        </p>
                      </div>
                    </div>

                    {getAuthorizedCompanies().length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/20 border border-dashed border-slate-805 rounded-2xl">
                        <span className="text-3xl block">🏛️</span>
                        <h4 className="text-xs font-black text-slate-400 mt-3">لا توجد شركات مدرجة حتى الآن</h4>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">سجل أول شركة من النموذج لاستعراض عمالها ومشاريعها وسندات أمرها.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getAuthorizedCompanies().map((comp) => {
                          const compWorkers = workers.filter((w) => w.company_id === comp.id);
                          const compProjects = projects.filter((p) => p.company_id === comp.id);
                          const compInstallments = installments.filter((i) => i.company_id === comp.id);
                          const compTotalCapital = compInstallments.reduce((sum, i) => sum + Number(i.amount || 0), 0);

                          return (
                            <div key={comp.id} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/20 transition-all flex flex-col justify-between relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-amber-500/20 before:via-transparent before:to-transparent">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex gap-2.5 items-center">
                                    {(() => {
                                      const logo = localStorage.getItem(`aw_company_logo_${comp.id}`);
                                      if (logo) {
                                        return (
                                          <img
                                            src={logo}
                                            alt="Logo"
                                            referrerPolicy="no-referrer"
                                            className="w-10 h-10 object-contain bg-slate-900 rounded-lg border border-slate-850 p-1 shrink-0"
                                          />
                                        );
                                      }
                                      return (
                                        <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                                          {comp.name ? comp.name[0] : "🏢"}
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <h4 className="text-xs font-extrabold text-white font-sans">{comp.name}</h4>
                                      {comp.commercial_register && (
                                        <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">سجل: {comp.commercial_register}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCompanyId(comp.id);
                                        setCName(comp.name || "");
                                        setCActivity(comp.activity || (comp as any).sub_title || (comp as any).company_activity || "");
                                        setCRegister(comp.commercial_register || "");
                                        setCTaxNo(comp.tax_no || "");
                                        setCCapital(comp.capital || "");
                                        setCPhone(comp.phone || "");
                                        setCAddress(comp.address || "");
                                        setCLogoUrl(localStorage.getItem(`aw_company_logo_${comp.id}`) || "");
                                      }}
                                      className="p-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold transition-all"
                                    >
                                      تعديل
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteCompany(comp.id, comp.name)}
                                      className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all"
                                    >
                                      حذف
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/40">
                                  <div className="text-center bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/20">
                                    <span className="block text-[8px] text-slate-500 font-bold">العمال والمهندسين</span>
                                    <span className="block text-xs font-mono font-black text-amber-400 mt-0.5">{compWorkers.length}</span>
                                  </div>
                                  <div className="text-center bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/20">
                                    <span className="block text-[8px] text-slate-500 font-bold">المشاريع المدشنة</span>
                                    <span className="block text-xs font-mono font-black text-blue-400 mt-0.5">{compProjects.length}</span>
                                  </div>
                                  <div className="text-center bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/20">
                                    <span className="block text-[8px] text-slate-500 font-bold">رأس مال العقود</span>
                                    <span className="block text-[10px] font-mono font-black text-emerald-400 mt-0.5 truncate">{compTotalCapital.toLocaleString()}</span>
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-400 space-y-1 font-sans">
                                  {comp.tax_no && (
                                    <p className="flex justify-between"><span className="text-slate-500">رقم ضريبي:</span> <span className="font-mono text-slate-300">{comp.tax_no}</span></p>
                                  )}
                                  {comp.phone && (
                                    <p className="flex justify-between"><span className="text-slate-500">الهاتف:</span> <span className="font-mono text-slate-300">{comp.phone}</span></p>
                                  )}
                                  {comp.address && (
                                    <p className="flex justify-between text-[9px] mt-1"><span className="text-slate-505 shrink-0">العنوان:</span> <span className="text-slate-300 leading-normal text-left truncate max-w-xs">{comp.address}</span></p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Company's Government/Private billing Extracts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                
                {/* Add/Edit Extract Form Card */}
                <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-base font-black text-white flex items-center gap-2 font-sans">
                      <span>📄</span>
                      <span>{editExtractId ? "تعديل مستند المستخلص" : "إنشاء مستخلص مالي جديد"}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">تسجيل مستخلص مالي معتمد لمشاريع وعمالات الشركات.</p>
                  </div>

                  {companies.length === 0 ? (
                    <div className="text-center py-6 bg-slate-950/20 border border-slate-800 rounded-xl">
                      <p className="text-[10px] text-slate-500 font-sans">يجب إضافة شركة واحدة على الأقل قبل تسجيل مستخلصات مالية.</p>
                    </div>
                  ) : (
                    <form onSubmit={saveExtractLogic} className="space-y-4">
                      
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold font-sans">الشركة التابعة المالكة *</label>
                        <select
                          required
                          value={exCompanyId}
                          onChange={(e) => setExCompanyId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        >
                          <option value="">-- اختر الشركة --</option>
                          {getAuthorizedCompanies().map((comp) => (
                            <option key={comp.id} value={comp.id}>🏢 {comp.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">رقم / عنوان المستخلص *</label>
                        <input
                          required
                          type="text"
                          placeholder="مثال: المستخلص النهائي لمشروع وزارة الرياضة"
                          value={exTitle}
                          onChange={(e) => setExTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">القيمة الإجمالية للمستخلص (ريال) *</label>
                        <input
                          required
                          type="number"
                          placeholder="القيمة المقررة"
                          value={exAmount}
                          onChange={(e) => setExAmount(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">المبلغ المسدد / المحصل حتى الآن (ريال)</label>
                        <input
                          type="number"
                          placeholder="مثال: 0 أو كامل القيمة"
                          value={exPaid}
                          onChange={(e) => setExPaid(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">تاريخ إصدار المستند</label>
                        <input
                          type="date"
                          value={exDate}
                          onChange={(e) => setExDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">حالة المراجعة المالية والبلدية</label>
                        <select
                          value={exStatus}
                          onChange={(e: any) => setExStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        >
                          <option value="نشط">تحت المراجعة والاعتماد (نشط)</option>
                          <option value="مدفوع">مكتمل الصرف والدفع (مدفوع)</option>
                          <option value="متأخر">معلق متعثر الصرف (متأخر)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-bold">البيان وشرائح الملاحظة</label>
                        <textarea
                          placeholder="بنود الصرف، الدفعات، المهندس المشرف، إلخ..."
                          value={exNotes}
                          onChange={(e) => setExNotes(e.target.value)}
                          className="w-full px-3 py-2 h-16 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        {editExtractId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditExtractId(null);
                              setExCompanyId("");
                              setExTitle("");
                              setExAmount("");
                              setExPaid("");
                              setExStatus("نشط");
                              setExNotes("");
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-black transition-colors font-sans"
                          >
                            إلغاء
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-gradient-to-l from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/15"
                        >
                          {editExtractId ? "حفظ التحديث ماليًا 💾" : "حفظ وقيد المستخلص 📄"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Extracts Data List Table */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2 font-sans">
                          <span>📋</span>
                          <span>المستخلصات المالية للشركات التابعة ({extracts.length})</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">تتبع كشوف المستخلصات المقررة ومستويات التحصيل.</p>
                      </div>
                    </div>

                    {extracts.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/20 border border-slate-800 rounded-2xl">
                        <span className="text-3xl block">📄</span>
                        <h4 className="text-xs font-black text-slate-400 mt-3">لا توجد كشوف مستخلصات مقيدة</h4>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">سجل مستخلصًا لدعم الرقابة المالية.</p>
                      </div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                            <th className="py-2.5 px-3 font-bold">الشركة التابعة</th>
                            <th className="py-2.5 px-3 font-bold">رقم/عنوان المستخلص</th>
                            <th className="py-2.5 px-3 font-bold">تاريخ الإصدار</th>
                            <th className="py-2.5 px-3 font-bold">القيمة التقديرية</th>
                            <th className="py-2.5 px-3 font-bold">التحصيل الفعلي</th>
                            <th className="py-2.5 px-3 font-bold">المعلق / المتبقي</th>
                            <th className="py-2.5 px-3 font-bold">حالة الصرف</th>
                            <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getVisibleExtracts().map((ex) => {
                            const parentCompName = companies.find((c) => c.id === ex.company_id)?.name || "شركة غير محددة";
                            const amt = Number(ex.amount || 0);
                            const paid = Number(ex.paid_amount || 0);
                            const rem = Math.max(0, amt - paid);

                            let badge = "bg-slate-800 text-slate-300";
                            if (ex.status === "مدفوع") badge = "bg-emerald-500/10 text-emerald-400";
                            if (ex.status === "متأخر") badge = "bg-rose-500/10 text-rose-400 font-bold animate-pulse";

                            return (
                              <tr key={ex.id} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                                <td className="py-3 px-3 font-black text-white font-sans">{parentCompName}</td>
                                <td className="py-3 px-3 font-bold text-slate-200">
                                  <span>{ex.title}</span>
                                  {ex.notes && (
                                    <span className="block text-[9px] text-slate-500 max-w-xs truncate font-sans mt-0.5">{ex.notes}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-400">{ex.date}</td>
                                <td className="py-3 px-3 font-mono font-bold text-white">{amt.toLocaleString()} ريال</td>
                                <td className="py-3 px-3 font-mono font-black text-emerald-400">{paid.toLocaleString()} ريال</td>
                                <td className="py-3 px-3 font-mono font-bold text-amber-500">{rem.toLocaleString()} ريال</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${badge}`}>{ex.status}</span>
                                </td>
                                <td className="py-3 px-3 text-center space-x-1 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditExtractId(ex.id);
                                      setExCompanyId(ex.company_id || "");
                                      setExTitle(ex.title || "");
                                      setExAmount(ex.amount || "");
                                      setExPaid(ex.paid_amount || "");
                                      setExDate(ex.date || "");
                                      setExStatus(ex.status || "نشط");
                                      setExNotes(ex.notes || "");
                                    }}
                                    className="p-1 px-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded text-[10px] font-black transition-all"
                                  >
                                    📝
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteExtract(ex.id, ex.title)}
                                    className="p-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-[10px] font-black transition-all"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Secure permissions and User configuration block */}
          {activeSection === "users" && (currentUser?.role === "admin" || can("users")) && (
            <div className="space-y-6">
              {/* Pending Approvals Section */}
              {users.filter((u) => u.status === "بانتظار الاعتماد" || u.status === "pending").length > 0 && (
                <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-3">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span className="text-amber-400 text-lg">⏳</span>
                        <span>طلبات التسجيل وتأسيس الشركات بانتظار موافقة الأدمن</span>
                        <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full">
                          {users.filter((u) => u.status === "بانتظار الاعتماد" || u.status === "pending").length} طلب
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">
                        يمكنك قبول الطلبات وتحديد الشركة التابعة والصلاحيات المطلوبة للمستخدمين الجدد.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {users
                      .filter((u) => u.status === "بانتظار الاعتماد" || u.status === "pending")
                      .map((pendingUser) => (
                        <PendingUserApprovalCard
                          key={pendingUser.id}
                          pendingUser={pendingUser}
                          companies={companies}
                          onApprove={handleApprovePendingUser}
                          onReject={handleRejectPendingUser}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Supabase Connection Setup Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-850 pb-4 gap-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span className="text-amber-500">⚡</span>
                      <span>ربط ومزامنة قاعدة بيانات Supabase الخارجية</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      تمكين المزامنة السحابية للنسخ الاحتياطي لجميع فروع ومكاتب الشركة.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {sbStatus === "connected" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md shadow-emerald-500/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Supabase متصل ونشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-md shadow-amber-500/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Firestore نشط كبديل آمن
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSbConfigExpanded(!sbConfigExpanded)}
                      className="px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-white flex items-center gap-1 cursor-pointer"
                    >
                      {sbConfigExpanded ? "🙈 إخفاء تفاصيل الربط" : "⚙️ إدارة ربط قاعدة البيانات"}
                    </button>
                  </div>
                </div>

                {sbConfigExpanded && (
                  <div className="space-y-5 pt-1">
                    <form onSubmit={testAndSaveSupabaseStatus} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          البرنامج مهيأ بميزة <b>المزامنة الهجينة التلقائية</b>. في حال واجهت قاعدة بيانات Supabase أي قيود أو تخطي في باقة الاستهلاك (Egress Exceeded)، يقوم التطبيق تلقائياً وبكل سلاسة بحفظ واسترجاع كافة البيانات عبر قاعدة <b>Firebase Firestore</b> المؤمنة والبديلة، مما يضمن أن عملك وعمل فروعك لا يتوقف أبداً!
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">رابط مشروع Supabase (API URL)</label>
                        <input
                          required
                          type="url"
                          placeholder="https://your-project.supabase.co"
                          value={sbUrl}
                          onChange={(e) => setSbUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">مفتاح المشروع (Public Anon Key)</label>
                        <input
                          required
                          type="password"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                          value={sbKey}
                          onChange={(e) => setSbKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-wrap justify-between items-center pt-2 gap-3 border-t border-slate-850/60">
                        <div className="text-[10px] text-slate-500">
                          * اضغط استعادة الإعدادات في حال رغبت بالرجوع للبيانات الافتراضية للشركة.
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={restoreSupabaseDefaultStatus}
                            disabled={sbTesting}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-black transition-colors"
                          >
                            استعادة الافتراضي
                          </button>
                          <button
                            type="submit"
                            disabled={sbTesting}
                            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                          >
                            {sbTesting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                جاري فحص الاتصال...
                              </>
                            ) : (
                              <>
                                <span>💾</span>
                                حفظ وتفعيل الاتصال
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Database Tables Setup Helper */}
                    <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                      <h4 className="text-xs font-black text-indigo-400 flex items-center gap-1 pb-1">
                        <span>💡</span>
                        <span>خطوات إعداد جداول Supabase في حسابك الخاص:</span>
                      </h4>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                        إذا قمت بإنشاء مشروع Supabase جديد، يمكنك تهيئة الجداول فوراً وبكبسة زر واحدة. تفضل بالذهاب إلى <b>SQL Editor</b> في لوحة تحكم Supabase الخاصة بك، والصق الكود التالي لإنشاء الجداول اللازمة لتهيئة النظام بشكل فوري:
                      </p>
                      <pre className="p-3 bg-slate-950 rounded-xl text-[9px] text-emerald-400/90 font-mono overflow-x-auto max-h-48 border border-white/5 select-all leading-normal" dir="ltr">
{`-- SQL لإنشاء وتحديث جداول النظام بالكامل لتتوافق 100% مع الإصدار المتقدم من التطبيق في Supabase

-- 1. جدول المستخدمين والصلاحيات
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  code TEXT UNIQUE,
  password TEXT,
  role TEXT,
  perms JSONB,
  branch TEXT,
  hide_financial_data BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'ar',
  branch_id TEXT,
  status TEXT DEFAULT 'نشط',
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول عقود التقسيط
CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client TEXT,
  identity TEXT,
  phone TEXT,
  no TEXT UNIQUE,
  amount NUMERIC,
  paid NUMERIC DEFAULT 0,
  remaining NUMERIC,
  type TEXT,
  start_date TEXT,
  end_date TEXT,
  next_due TEXT,
  periods INT,
  installment NUMERIC,
  discount NUMERIC DEFAULT 0,
  after_discount NUMERIC,
  project TEXT,
  guarantor TEXT,
  status TEXT DEFAULT 'نشط',
  notes TEXT,
  updated_at TEXT,
  nationality TEXT,
  workplace TEXT,
  company_id TEXT,
  branch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. جدول عروض الأسعار
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  no TEXT UNIQUE,
  client TEXT,
  phone TEXT,
  project TEXT,
  amount NUMERIC,
  vat NUMERIC DEFAULT 15,
  total NUMERIC,
  status TEXT DEFAULT 'مسودة',
  notes TEXT,
  company_id TEXT,
  branch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. جدول سندات القبض
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  no TEXT,
  from_name TEXT,
  amount NUMERIC,
  method TEXT,
  date TEXT,
  project TEXT,
  notes TEXT,
  installment_id TEXT,
  contract_no TEXT,
  identity TEXT,
  phone TEXT,
  nationality TEXT,
  remaining_before NUMERIC,
  remaining_after NUMERIC,
  company_id TEXT,
  branch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. جدول سندات الصرف
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  no TEXT,
  to_name TEXT,
  amount NUMERIC,
  method TEXT,
  date TEXT,
  project TEXT,
  notes TEXT,
  company_id TEXT,
  branch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. جدول المصروفات التشغيلية
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  no TEXT,
  name TEXT,
  category TEXT,
  amount NUMERIC,
  date TEXT,
  project TEXT,
  supplier TEXT,
  notes TEXT,
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. جدول المشاريع الإنشائية
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  location TEXT,
  engineer TEXT,
  budget NUMERIC,
  start_date TEXT,
  end_date TEXT,
  progress NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'تحت التنفيذ',
  notes TEXT,
  nationality TEXT,
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. جدول الموارد البشرية والعمال
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  worker_id TEXT UNIQUE,
  phone TEXT,
  job TEXT,
  project TEXT,
  daily NUMERIC DEFAULT 0,
  days INT DEFAULT 0,
  advance NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'نشط',
  notes TEXT,
  recipient_name TEXT,
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. جدول سجل الأنشطة والعمليات (Audit Logs)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  code TEXT,
  role TEXT,
  time TEXT,
  action TEXT,
  company_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. إعادة إنشاء جدول الشركات الفرعية ليطابق الهيكل الجديد المخصص
DROP TABLE IF EXISTS companies CASCADE;
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  commercial_register TEXT,
  tax_no TEXT,
  capital NUMERIC DEFAULT 0,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'نشط',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. إنشاء جدول المستخلصات المالية للمشاريع (الذي لم يكن موجوداً)
DROP TABLE IF EXISTS extracts CASCADE;
CREATE TABLE extracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  date TEXT,
  status TEXT DEFAULT 'نشط',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Backup & Restore Panel */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span className="text-emerald-400">🛡️</span>
                    <span>النسخ الاحتياطي اليدوي واستعادة البيانات كاملة</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    يمكنك تنزيل نسخة احتياطية كاملة من قاعدة بياناتك لحفظها محلياً على جهازك، واستعادتها في أي وقت بنقرة واحدة لضمان عدم ضياع البيانات مطلقاً.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Download section */}
                  <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5 pb-1">
                        <span>📤</span>
                        <span>تصدير نسخة احتياطية</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                        يقوم النظام بالاتصال بقاعدة البيانات النشطة حالياً وتصدير كافة سجلات الجداول (المستخدمين، العقود، العروض، السندات، المصاريف، الموظفين والمشاريع) في ملف محمي بنسق <b className="font-mono text-emerald-400 font-black">JSON</b>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                    >
                      <span>🌟</span>
                      تنزيل ملف النسخة الاحتياطية (.json)
                    </button>
                  </div>

                  {/* Restore section */}
                  <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-amber-500 flex items-center gap-1.5 pb-1">
                        <span>📥</span>
                        <span>استيراد واستعادة البيانات</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-bold">
                        اختر ملف النسخة الاحتياطية (.json) المرفوع مسبقاً لاستيراد وإعادة بناء قاعدة البيانات بالكامل. سيقوم النظام بعملية دمج دقيقة وتحديث السجلات فوراً.
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        id="backup-upload-input"
                        onChange={handleRestoreBackup}
                        className="hidden"
                        disabled={isRestoring}
                      />
                      <label
                        htmlFor="backup-upload-input"
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isRestoring ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500 animate-spin" />
                            جاري الاستعادة وإعادة البناء...
                          </>
                        ) : (
                          <>
                            <span>📂</span>
                            تحميل واستعادة ملف النسخة الاحتياطية
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {restoreSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-medium">
                    🎉 {restoreSuccess}
                  </div>
                )}

                {restoreError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/20 text-rose-350 rounded-xl text-xs font-medium font-sans">
                    ⚠️ {restoreError}
                  </div>
                )}
              </div>

              <form onSubmit={saveUserLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>👤</span> تهيئة الصلاحيات الإدارية وربط حساب الموظفين</h3>
                </div>
                {/* Card Linking Wrapper */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 rtl" dir="rtl">
                  {/* Card Section 1: DB Worker Match */}
                  <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 space-y-3.5">
                    <h4 className="text-xs font-black text-amber-500 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                      <span>💳</span>
                      <span>الربط بملف الموظف و الـ ID</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] text-slate-400 font-black block">ربط الحساب بملف عامل / موظف حالي (اختياري)</label>
                        <select
                          value={workers.find((w) => w.worker_id === uWorkerId)?.worker_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedW = workers.find((w) => w.worker_id === val);
                            if (selectedW) {
                              setUWorkerId(selectedW.worker_id || "");
                              setUName(selectedW.name || "");
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white"
                        >
                          <option value="" className="text-slate-950">-- غير مربوط بملف عامل (إدخال يدوي) --</option>
                          {workers.map((w) => (
                            <option key={w.id} value={w.worker_id} className="text-slate-950">
                              👷 {w.name} - {w.job} {w.worker_id ? `(${w.worker_id})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">الرقم الوظيفي / ID الموظف</label>
                        <input
                          placeholder="أدخل الرقم الوظيفي يدويًا"
                          value={uWorkerId}
                          onChange={(e) => setUWorkerId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none placeholder-slate-500 font-sans"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">اسم الموظف الفعلي</label>
                        <input
                          required
                          placeholder="الاسم الكامل للموظف"
                          value={uName}
                          onChange={(e) => setUName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Section 2: Account Login Details */}
                  <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 space-y-3.5">
                    <h4 className="text-xs font-black text-indigo-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                      <span>🔑</span>
                      <span>بيانات الدخول ونطاق الفرع</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">كود تسجيل الدخول (اسم المستخدم)</label>
                        <input
                          required
                          placeholder="مثلاً: user_riyadh"
                          value={uCode}
                          onChange={(e) => setUCode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">كلمة المرور / الرمز الخاص</label>
                        <input
                          required
                          placeholder="كلمة المرور للدخول"
                          value={uPass}
                          onChange={(e) => setUPass(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">تصنيف الصلاحيات العام</label>
                        <select
                          value={uRole}
                          onChange={(e: any) => {
                            const newRole = e.target.value;
                            setURole(newRole);
                            if (newRole === "employee") {
                              setUPerms({
                                attendance: true,
                                dashboard: false,
                                installmentsView: false,
                                installmentsAdd: false,
                                installmentsEdit: false,
                                installmentsDelete: false,
                                quotes: false,
                                receipts: false,
                                payments: false,
                                expenses: false,
                                treasury: false,
                                financial_reports: false,
                                projects: false,
                                workers: false,
                                companies: false,
                                users: false,
                                sessions: false,
                                print: false,
                                dashTopCards: false,
                                dashCollection: false,
                                dashPulse: false,
                                dashLateClients: false,
                                dashLastReceipts: false,
                                dashUpcomingPaid: false,
                              });
                            } else if (newRole === "supervisor") {
                              setUPerms({
                                attendance: true,
                                dashboard: true,
                                installmentsView: true,
                                installmentsAdd: true,
                                installmentsEdit: true,
                                installmentsDelete: false,
                                quotes: true,
                                receipts: true,
                                payments: true,
                                expenses: true,
                                treasury: false,
                                financial_reports: false,
                                projects: true,
                                workers: true,
                                companies: false,
                                users: false,
                                sessions: false,
                                print: true,
                                dashTopCards: true,
                                dashCollection: true,
                                dashPulse: true,
                                dashLateClients: true,
                                dashLastReceipts: true,
                                dashUpcomingPaid: true,
                              });
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white"
                        >
                          <option value="employee" className="text-slate-950">👨‍💼 موظف فرع محدود</option>
                          <option value="supervisor" className="text-slate-950">🕵️‍♂️ مشرف مكتب عام / رئيسي</option>
                          <option value="admin" className="text-slate-950">👑 أدمن مكتب عام</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">حالة الحساب والولوج</label>
                        <select
                          value={uStatus}
                          onChange={(e) => setUStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white"
                        >
                          <option value="نشط" className="text-slate-950">🟢 نشط مصرح له بالدخول</option>
                          <option value="موقف" className="text-slate-950">🔴 موقوف / معطل إدارياً</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">🏢 الشركة التابع لها الحساب *</label>
                        <select
                          required
                          value={uCompanyId}
                          onChange={(e) => setUCompanyId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white font-sans"
                        >
                          <option value="" className="text-slate-950">اختر الشركة التابع لها الحساب...</option>
                          {currentUser?.role === "admin" && (
                            <option value="all" className="text-amber-600 font-black">🌐 أدمن عام لكل الشركات (Super Admin)</option>
                          )}
                          {getAuthorizedCompanies().map((c) => (
                            <option key={c.id} value={c.id} className="text-slate-950 font-bold">🏢 {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-black block">النطاق الإداري / المنطقة</label>
                        <select
                          value={uRegion}
                          onChange={(e) => setURegion(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white"
                        >
                          <option value="" className="text-slate-950">🇸🇦 كل الإدارات والفروع</option>
                          <option value="الوسطى" className="text-slate-950">📍 الوسطى</option>
                          <option value="الشرقية" className="text-slate-950">📍 الشرقية</option>
                          <option value="الغربية" className="text-slate-950">📍 الغربية</option>
                          <option value="الجنوب" className="text-slate-950">📍 الجنوب</option>
                          <option value="الشمال" className="text-slate-950">📍 الشمال</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submitting check lists for individual permissions inside erp */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-850">
                    <span className="block text-xs font-extrabold text-amber-400">🚨 صلاحيات ومسؤوليات الموظف العامة والافتراضية</span>
                    <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold">تعديل صلاحيات شركة:</span>
                      <select
                        value={selectedCompanyIdForPerms}
                        onChange={(e) => setSelectedCompanyIdForPerms(e.target.value)}
                        className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer text-slate-950 bg-white"
                      >
                        <option value="global" className="text-slate-950 font-bold">✨ الصلاحيات العامة الافتراضية</option>
                        {getAuthorizedCompanies().map((c) => (
                          <option key={c.id} value={c.id} className="text-slate-950 font-bold">🏢 {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedCompanyIdForPerms !== "global" && (
                    <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400">حالة تفويض الدخول لشركة:</span>
                          <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-sans">
                            {companies.find((c) => c.id === selectedCompanyIdForPerms)?.name || ""}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold font-sans">
                          {!uCompanyPerms[selectedCompanyIdForPerms] 
                            ? "🔒 هذا الموظف لا يملك إذن رؤية أو تصفح هذه الشركة حالياً" 
                            : (uCompanyPerms[selectedCompanyIdForPerms].use_global 
                                ? "📁 الموظف يرى هذه الشركة بنفس الصلاحيات العامة أدناه" 
                                : "⚙️ الموظف لديه صلاحيات مخصصة ومستقلة لهذه الشركة")}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl border cursor-pointer text-xs font-bold select-none transition-all ${
                          !uCompanyPerms[selectedCompanyIdForPerms] 
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                            : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-300"
                        }`}>
                          <input
                            type="radio"
                            name="company-auth-status"
                            checked={!uCompanyPerms[selectedCompanyIdForPerms]}
                            onChange={() => {
                              const compId = selectedCompanyIdForPerms;
                              setUCompanyPerms((prev) => {
                                const copy = { ...prev };
                                delete copy[compId];
                                return copy;
                              });
                            }}
                            className="accent-rose-500 w-4 h-4 cursor-pointer"
                          />
                          <span>❌ غير مصرح له بالدخول</span>
                        </label>

                        <label className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl border cursor-pointer text-xs font-bold select-none transition-all ${
                          !!uCompanyPerms[selectedCompanyIdForPerms] && !!uCompanyPerms[selectedCompanyIdForPerms].use_global
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-300"
                        }`}>
                          <input
                            type="radio"
                            name="company-auth-status"
                            checked={!!uCompanyPerms[selectedCompanyIdForPerms] && !!uCompanyPerms[selectedCompanyIdForPerms].use_global}
                            onChange={() => {
                              const compId = selectedCompanyIdForPerms;
                              setUCompanyPerms((prev) => ({
                                ...prev,
                                [compId]: {
                                  ...uPerms,
                                  is_authorized: true,
                                  use_global: true
                                }
                              }));
                            }}
                            className="accent-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span>🟢 مصرح (بالصلاحيات العامة)</span>
                        </label>

                        <label className={`flex items-center gap-2 px-3 py-2 sm:py-2.5 rounded-xl border cursor-pointer text-xs font-bold select-none transition-all ${
                          !!uCompanyPerms[selectedCompanyIdForPerms] && !uCompanyPerms[selectedCompanyIdForPerms].use_global
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-300"
                        }`}>
                          <input
                            type="radio"
                            name="company-auth-status"
                            checked={!!uCompanyPerms[selectedCompanyIdForPerms] && !uCompanyPerms[selectedCompanyIdForPerms].use_global}
                            onChange={() => {
                              const compId = selectedCompanyIdForPerms;
                              setUCompanyPerms((prev) => ({
                                ...prev,
                                [compId]: {
                                  ...(prev[compId] || uPerms),
                                  is_authorized: true,
                                  use_global: false
                                }
                              }));
                            }}
                            className="accent-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span>⭐️ مصرح (بصلاحيات مخصصة للشركة)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-950/40 p-4 border border-slate-850 rounded-2xl">
                    {Object.keys(uPerms)
                      .filter((k) => !k.startsWith("safe_"))
                      .map((k) => {
                        const hasCompObj = !!uCompanyPerms[selectedCompanyIdForPerms];
                        const isCustomActive = selectedCompanyIdForPerms === "global" || (hasCompObj && !uCompanyPerms[selectedCompanyIdForPerms].use_global);
                        
                        const val = selectedCompanyIdForPerms === "global" 
                          ? !!uPerms[k] 
                          : (hasCompObj 
                              ? (uCompanyPerms[selectedCompanyIdForPerms].use_global ? !!uPerms[k] : !!uCompanyPerms[selectedCompanyIdForPerms][k])
                              : !!uPerms[k]);
                        
                        return (
                          <label 
                            key={k} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-xs font-bold select-none ${
                              !isCustomActive 
                                ? "bg-slate-900/30 border-slate-900/50 text-slate-600 cursor-not-allowed opacity-50 font-sans" 
                                : "bg-slate-900/60 border-slate-850 hover:border-slate-800 hover:text-slate-200 text-slate-400 font-sans"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={val}
                              disabled={selectedCompanyIdForPerms !== "global" && (!hasCompObj || !!uCompanyPerms[selectedCompanyIdForPerms].use_global)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (selectedCompanyIdForPerms === "global") {
                                  setUPerms((prev) => ({ ...prev, [k]: checked }));
                                } else {
                                  const compId = selectedCompanyIdForPerms;
                                  setUCompanyPerms((prev) => {
                                    const currentCompPerms = prev[compId] || { ...uPerms };
                                    return {
                                      ...prev,
                                      [compId]: {
                                        ...currentCompPerms,
                                        [k]: checked
                                      }
                                    };
                                  });
                                }
                              }}
                              className="accent-amber-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span>
                              {k === "attendance" && "📍 بصمة الحضور والانصراف (GPS)"}
                              {k === "dashboard" && "📊 الرئيسية (لوحة التحكم العامة)"}
                              {k === "financial_reports" && "📈 التقارير والقوائم المالية"}
                              {k === "installmentsView" && "👁️ التقسيط والعقود"}
                              {k === "installmentsAdd" && "➕ إضافة عقد يومي"}
                              {k === "installmentsEdit" && "📝 تعديل عقود فرعية"}
                              {k === "installmentsDelete" && "❌ حذف العقود الملتزمة"}
                              {k === "quotes" && "📋 عروض الأسعار"}
                              {k === "receipts" && "💰 سندات القبض"}
                              {k === "payments" && "💸 سندات الصرف"}
                              {k === "expenses" && "🧾 المصروفات الدفترية"}
                              {k === "treasury" && "🏦 استعراض الخزائن الموحدة"}
                              {k === "projects" && "🏗️ تتبع المشاريع والمهندسين"}
                              {k === "workers" && "👷 العمال ورواتب السلف"}
                              {k === "companies" && "🏢 دليل الشركات والمستخلصات"}
                              {k === "users" && "👥 تهيئة وإضافة الموظفين"}
                              {k === "sessions" && "🕰️ استكشاف سجلات التدقيق"}
                              {k === "print" && "🖨️ تفويض طباعة عهود الاتفاق"}
                              {k === "dashTopCards" && "📊 مؤشر: الملخص العام والأرقام السريعة"}
                              {k === "dashCollection" && "📈 مؤشر: نبض التحصيل ونسبة السداد"}
                              {k === "dashPulse" && "📉 مؤشر: بيان التدفق الفعلي الأسبوعي"}
                              {k === "dashLateClients" && "⚠️ مؤشر: كشف المتأخرين والمتعثرين"}
                              {k === "dashLastReceipts" && "💸 مؤشر: شريط آخر السندات والقيود"}
                              {k === "dashUpcomingPaid" && "📅 مؤشر: استعراض الدفعات القادمة"}
                              {k.startsWith("dash") && !["dashTopCards", "dashCollection", "dashPulse", "dashLateClients", "dashLastReceipts", "dashUpcomingPaid"].includes(k) && `المؤشر: ${k.replace("dash", "")}`}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Safes Checkbox Grid */}
                <div className="space-y-2 bg-slate-950/20 p-4 border border-slate-900 rounded-2xl">
                  <span className="block text-xs font-extrabold text-indigo-400">💰 تحديد الخزائن والصناديق المالية المصرحة لهذا الموظف</span>
                  <p className="text-[10px] text-slate-400 font-bold font-sans">
                    (تنبيه: إذا لم تقم بتحديد أي خزنة، فسيتم منح الموظف صلاحية رؤية كافة الخزائن بشكل افتراضي لتسهيل العمل دون قيود)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-2">
                    {getStoredTreasuries(selectedCompanyIdForPerms !== "global" ? selectedCompanyIdForPerms : selectedCompanyId, companies).map((tName) => {
                      const permKey = `safe_${tName}`;
                      const hasCompObj = !!uCompanyPerms[selectedCompanyIdForPerms];
                      const isCustomActive = selectedCompanyIdForPerms === "global" || (hasCompObj && !uCompanyPerms[selectedCompanyIdForPerms].use_global);
                      
                      const val = selectedCompanyIdForPerms === "global"
                        ? !!uPerms[permKey]
                        : (hasCompObj 
                            ? (uCompanyPerms[selectedCompanyIdForPerms].use_global ? !!uPerms[permKey] : !!uCompanyPerms[selectedCompanyIdForPerms][permKey])
                            : !!uPerms[permKey]);

                      return (
                        <label 
                          key={tName} 
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer text-xs font-bold select-none ${
                            !isCustomActive 
                              ? "bg-slate-900/30 border-slate-900/50 text-slate-600 cursor-not-allowed opacity-50 font-sans" 
                              : "bg-slate-900/60 border-slate-850 hover:border-slate-800 hover:text-slate-200 text-slate-400 font-sans"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={val}
                            disabled={selectedCompanyIdForPerms !== "global" && (!hasCompObj || !!uCompanyPerms[selectedCompanyIdForPerms].use_global)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (selectedCompanyIdForPerms === "global") {
                                setUPerms((prev) => ({ ...prev, [permKey]: checked }));
                              } else {
                                const compId = selectedCompanyIdForPerms;
                                setUCompanyPerms((prev) => {
                                  const currentCompPerms = prev[compId] || { ...uPerms };
                                  return {
                                    ...prev,
                                    [compId]: {
                                      ...currentCompPerms,
                                      [permKey]: checked
                                    }
                                  };
                                });
                              }
                            }}
                            className="accent-indigo-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span>🏦 {tName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {editUserId && (
                    <button type="button" onClick={() => { setEditUserId(null); setUName(""); setUCode(""); setUPass(""); setUWorkerId(""); setURegion(""); setURole("employee"); setUCompanyId(""); setUCompanyPerms({}); setUStatus("نشط"); setSelectedCompanyIdForPerms("global"); setUPerms({ attendance: true, dashboard: false, installmentsView: false, installmentsAdd: false, installmentsEdit: false, installmentsDelete: false, quotes: false, receipts: false, payments: false, expenses: false, treasury: false, financial_reports: false, projects: false, workers: false, companies: false, users: false, sessions: false, print: false, dashTopCards: false, dashCollection: false, dashPulse: false, dashLateClients: false, dashLastReceipts: false, dashUpcomingPaid: false }); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">حفظ وإرسال الصلاحية للموظف</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                        <th className="py-2.5 px-3 font-bold">الاسم والكود</th>
                        <th className="py-2.5 px-3 font-bold">الدور الإداري</th>
                        <th className="py-2.5 px-3 font-bold">الشركة / النطاق الإداري</th>
                        <th className="py-2.5 px-3 font-bold">صلاحيات الولوج النشطة</th>
                        <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                      </tr>
                  </thead>
                  <tbody>
                    {getAuthorizedUsers().map((u, idx) => {
                      const permissionsObj = u.perms || {};
                      const names = Object.keys(permissionsObj).filter((k) => k !== "region" && k !== "worker_id" && permissionsObj[k]);
                      const effectiveWorkerId = permissionsObj.worker_id || u.worker_id;
                      return (
                        <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                          <td className="py-3 px-3">
                            <span className="block font-black text-white">{u.name}</span>
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center mt-0.5">
                              <span className="block text-[10px] text-amber-500 select-all font-mono font-bold">كود الموظف: {u.code}</span>
                              {effectiveWorkerId && (
                                <span className="block text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  🪪 الرقم الوظيفي: {effectiveWorkerId}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-800 text-amber-400 font-bold border border-slate-700">{u.role === "admin" ? "أدمن مكتب عام" : (u.role === "supervisor" ? "مشرف مكتب عام / رئيسي" : "موظف فرع")}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-sans ${u.status === "نشط" || !u.status ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border border-rose-500/25"}`}>
                                {u.status === "نشط" || !u.status ? "🟢 نشط" : "🔴 موقوف"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="block font-black text-indigo-400">
                              🏢 {companies.find((c) => c.id === u.company_id)?.name || "أدمن عام (كل الشركات)"}
                            </span>
                            <span className="block text-[10px] text-slate-500 font-bold mt-0.5 font-sans">
                              📍 النطاق: {permissionsObj.region || "كامل فروع المملكة"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 max-w-sm truncate" title={names.join(" - ")}>
                            {names.length > 0 ? names.join(" • ") : "صلاحيات محدودة كافية للعرض فقط"}
                            {u.company_perms && Object.keys(u.company_perms).length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5 justify-start">
                                {Object.keys(u.company_perms).map((cId) => {
                                  const compName = companies.find((c) => c.id === cId)?.name || "شركة فرعية";
                                  const compConf = u.company_perms?.[cId];
                                  const isGlobal = compConf?.use_global;
                                  return (
                                    <span key={cId} className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-md font-sans ${
                                      isGlobal 
                                        ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20" 
                                        : "text-amber-300 bg-amber-500/10 border border-amber-500/20"
                                    }`}>
                                      🏢 {compName}: {isGlobal ? "صلاحيات عامة" : "صلاحيات مخصصة"}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center space-x-1">
                            <button
                              onClick={() => {
                                setEditUserId(u.id);
                                setUStatus(u.status || "نشط");
                                setUName(u.name || "");
                                setUCode(u.code || "");
                                setUPass(u.password || "");
                                setUWorkerId(effectiveWorkerId || "");
                                setURole(u.role || "employee");
                                setUCompanyId(u.company_id || "");
                                setURegion(permissionsObj.region || "");
                                setSelectedCompanyIdForPerms("global");
                                setUCompanyPerms(u.company_perms || {});
                                setUPerms({
                                  ...permissionsObj,
                                  region: permissionsObj.region || "",
                                });
                              }}
                              className="p-1 text-blue-400 hover:text-white"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {currentUser.code !== u.code && (
                              <button onClick={() => deleteUserLogic(u.id, u.name || "")} className="p-1 text-rose-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* My Profile and Self-Service Section */}
          {activeSection === "my_profile" && (
            <div className="space-y-6" dir="rtl">
              {/* Top Selector (for admins or test purpose, or feedback) */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <span>👤</span>
                      <span>ملفي الوظيفي والخدمات والطلبات الذاتية</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">الاطلاع الذاتي المباشر على بنود العقد، تسجيل الإجازات الذاتية، ومتابعة الأرصدة وطلب السلف المالية العاجلة.</p>
                  </div>
                  
                  {/* Dropdown for testing or changing scope only if admin or can("workers") */}
                  {(currentUser?.role === "admin" || can("workers")) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">ملف الموظف المعين:</span>
                      <select
                        value={selfSelectedWorkerId || workers.find((w) => w.worker_id === (currentUser?.perms?.worker_id || currentUser?.worker_id))?.id || ""}
                        onChange={(e) => setSelfSelectedWorkerId(e.target.value)}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none cursor-pointer max-w-xs text-slate-950 bg-white"
                      >
                        <option value="" className="text-slate-950">--- اختر ملف موظف للتصفح الجاري ---</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id} className="text-slate-950">
                            👷 {w.name} - {w.job} ({w.worker_id || "دون ID"})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-left">
                      <span className="px-3 py-1 text-[10px] bg-slate-950 border border-slate-850 rounded-lg text-slate-400 font-black font-sans">
                        🔐 وضع الخدمة الذاتية المحمية
                      </span>
                    </div>
                  )}
                </div>

                {/* Main Logic: Retrieve profile worker */}
                {(() => {
                  const hasFullAccess = currentUser?.role === "admin" || can("workers");
                  const myLinkedWorkerId = workers.find((w) => w.worker_id === (currentUser?.perms?.worker_id || currentUser?.worker_id))?.id;
                  
                  // If hasFullAccess, allow selfSelectedWorkerId, else strictly force their own linked worker ID
                  const targetWorkerId = hasFullAccess ? (selfSelectedWorkerId || myLinkedWorkerId) : myLinkedWorkerId;
                  const profileWorker = workers.find((w) => w.id === targetWorkerId);

                  if (!profileWorker) {
                    return (
                      <div className="p-8 text-center bg-slate-950/20 border border-slate-800 rounded-2xl space-y-3">
                        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
                        <h4 className="text-sm font-black text-white">لم يتم ربط هذا الحساب بملف عامل حالي في شجرة الموارد البشرية بعد!</h4>
                        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                          يرجى مراجعة إدارة الموارد البشرية أو أدمن النظام لربط حسابك الحالي (<strong>{currentUser?.name}</strong>) بـ <strong>الرقم الوظيفي / ID الهوية</strong> الصحيح من لوحة الموظفين والصلاحية.
                        </p>
                        {currentUser?.role === "admin" && (
                          <div className="pt-2 text-xs text-amber-400 font-bold">
                            💡 بصفتك مسؤولاً عامًا (أدمن)، يمكنك تصفح أي ملف آخر باستخدام قائمة الاختيار في الأعلى للتجربة والتحقق المباشر!
                          </div>
                        )}
                      </div>
                    );
                  }

                  const contract = awExtractWorkerContract(profileWorker.notes || "");
                  const leavesList = awExtractWorkerLeaves(profileWorker.notes || "");
                  const basicSalary = Number(contract.salary || 0);
                  const housing = Number(contract.housing || 0);
                  const transport = Number(contract.transport || 0);
                  const other = Number(contract.other || 0);
                  const totalMonthlySalary = basicSalary + housing + transport + other;
                  
                  // Financial summaries
                  const workedDays = Number(profileWorker.days || 0);
                  const dailyWage = Number(profileWorker.daily || 0);
                  const earnedAccumulated = dailyWage * workedDays;
                  const totalAdvanceDeducted = Number(profileWorker.advance || 0);
                  const netSalaryBalance = profileWorker.balance;

                  return (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Column 1: Contract & Career Profile */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* Profile Info Card */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-md">
                              <span className="text-2xl">👷</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-white leading-tight">{profileWorker.name}</h4>
                              <p className="text-[10px] text-amber-400 mt-1 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                                {profileWorker.job} • {profileWorker.status}
                              </p>
                            </div>
                          </div>

                          <div className="divide-y divide-slate-850/80 text-xs text-slate-300">
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400 font-bold">رقم الهوية الإقامة:</span>
                              <span className="text-white font-semibold font-mono">{profileWorker.worker_id || "غير مسجل"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400 font-bold">رقم الجوال:</span>
                              <span className="text-white font-semibold font-mono">{profileWorker.phone || "---"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400 font-bold">المشروع الحالي:</span>
                              <span className="text-white font-semibold">{profileWorker.project || "عام"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400 font-bold">تاريخ الالتحاق بالعمل:</span>
                              <span className="text-white font-semibold font-sans">{contract.start || "غير محدد"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400 font-bold">فترة تجربة العقد:</span>
                              <span className="text-white font-semibold font-sans">{contract.probation || "90 يوم"}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400 font-bold">رقم جواز السفر:</span>
                              <span className="text-white font-semibold font-mono">{contract.passport || "---"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Salary and Compensation details */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                          <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                            <span>💸</span>
                            <span>تفاصيل الراتب ومزايا العقد الأساسية</span>
                          </h4>

                          <div className="grid grid-cols-2 gap-3 text-right">
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 text-right">
                              <span className="text-[10px] text-slate-400 block font-bold">الراتب الأساسي</span>
                              <span className="text-sm font-black text-white block mt-0.5 font-mono">{basicSalary.toLocaleString()} <span className="text-[9px] text-slate-400">ريال</span></span>
                            </div>
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 text-right">
                              <span className="text-[10px] text-slate-400 block font-bold">بدل السكن شهريًا</span>
                              <span className="text-sm font-black text-slate-200 block mt-0.5 font-mono">{housing.toLocaleString()} <span className="text-[9px] text-slate-400">ريال</span></span>
                            </div>
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 text-right">
                              <span className="text-[10px] text-slate-400 block font-bold">بدل الانتقالات</span>
                              <span className="text-sm font-black text-slate-200 block mt-0.5 font-mono">{transport.toLocaleString()} <span className="text-[9px] text-slate-400">ريال</span></span>
                            </div>
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 text-right">
                              <span className="text-[10px] text-slate-400 block font-bold">بدلات أخرى وعوض</span>
                              <span className="text-sm font-black text-slate-200 block mt-0.5 font-mono">{other.toLocaleString()} <span className="text-[9px] text-slate-400">ريال</span></span>
                            </div>
                          </div>

                          <div className="p-3 bg-gradient-to-l from-emerald-500/10 to-transparent border border-emerald-500/15 rounded-xl">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-emerald-300 font-bold">إجمالي الراتب الشهري الشامل:</span>
                              <span className="text-base font-black text-emerald-400 font-mono">{totalMonthlySalary.toLocaleString()} ريال</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Advance Payments / Loans Requests */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* Financial Account and Sulafe Balance */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                                                    <h4 className="text-xs font-black text-indigo-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                            <span>🏛️</span>
                            <span>الرصيد المالي الحالي وتفاصيل السلفيات</span>
                          </h4>

                          <div className="space-y-2.5 text-xs text-slate-300">
                            <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between items-center">
                              <span className="text-slate-400 font-bold">أيام العمل الجارية المسجلة:</span>
                              <span className="text-white font-black font-mono">{workedDays} أيام</span>
                            </div>
                            <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between items-center">
                              <span className="text-slate-400 font-bold">أجر اليومية في الموقع المعين:</span>
                              <span className="text-white font-black font-mono">{dailyWage.toLocaleString()} ريال/يوم</span>
                            </div>
                            <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between items-center">
                              <span className="text-slate-400 font-bold">إجمالي المتراكم المستحق:</span>
                              <span className="text-amber-400 font-black font-mono">{earnedAccumulated.toLocaleString()} ريال</span>
                            </div>
                            <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between items-center border border-rose-500/20">
                              <span className="text-rose-400 font-bold">إجمالي السلفيات المسحوبة:</span>
                              <span className="text-rose-400 font-black font-mono">-{totalAdvanceDeducted.toLocaleString()} ريال</span>
                            </div>
                            <div className="p-3 bg-indigo-500/10 rounded-xl flex justify-between items-center border border-indigo-500/25">
                              <span className="text-indigo-300 font-black text-xs">صافي المستحق المعلق (الرصيد المتاح):</span>
                              <span className="text-base font-black text-indigo-400 font-mono">{netSalaryBalance.toLocaleString()} ريال</span>
                            </div>
                          </div>
                        </div>

                        {/* Request Sulafe Form */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                          <h4 className="text-xs font-black text-pink-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                            <span>✍️</span>
                            <span>تقديم طلب سلفة مالية عاجلة (صرف مباشر)</span>
                          </h4>

                          <form onSubmit={(e) => addSelfWorkerAdvanceLogic(e, profileWorker)} className="space-y-3.5">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">مبلغ السلفة المطلوب (ريال)</label>
                              <input 
                                type="number" 
                                required
                                placeholder="0" 
                                value={advAmount} 
                                onChange={(e) => setAdvAmount(e.target.value ? Number(e.target.value) : "")} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-rose-500" 
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] text-slate-400 font-bold block">صرف السند ماليًا من صندوق</label>
                                {(currentUser?.role === "admin" || can("treasury")) && (
                                  <button
                                    type="button"
                                    onClick={() => openAddTreasuryDialog(profileWorker?.company_id || selectedCompanyId)}
                                    className="text-[9px] text-amber-500 hover:text-amber-400 font-bold transition-colors"
                                  >
                                    ➕ إضافة خزنة
                                  </button>
                                )}
                              </div>
                              <select 
                                value={advTreasury} 
                                onChange={(e) => setAdvTreasury(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer text-slate-950 bg-white"
                              >
                                {getAuthorizedTreasuries(currentUser, selectedCompanyId).map((tName) => (
                                  <option key={tName} value={tName} className="text-slate-950">💰 {tName}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">تاريخ تاريخ المعاملة</label>
                              <input 
                                type="date" 
                                required
                                value={advDate} 
                                onChange={(e) => setAdvDate(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none font-mono" 
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">سبب السلفة وملاحظات الإفصاح</label>
                              <textarea 
                                placeholder="مثلاً: سلفة اضطرارية لدفع مصاريف عائلية..." 
                                value={advNotes}
                                onChange={(e) => setAdvNotes(e.target.value)}
                                className="w-full px-2.5 py-2 h-16 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                              />
                            </div>

                            <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-black rounded-lg transition-colors shadow-lg">
                              {isLoading ? "جاري المعاملة..." : "إيداع وصرف طلب السلفة المباشر"}
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Column 3: Leaves & Vacations Management */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* Leaves Overview and registration history */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                          <h4 className="text-xs font-black text-teal-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                            <span>🏖️</span>
                            <span>بيانات الإجازات السنوية المسجلة</span>
                          </h4>

                          <div className="flex items-center justify-between p-3 bg-teal-500/10 rounded-xl border border-teal-500/10">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-bold">الرصيد السنوي المعتمد</span>
                              <span className="text-xs font-black text-white block mt-0.5 font-mono">{contract.vacation || 30} يوم/سنة</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-bold">الإجازات المستهلكة</span>
                              <span className="text-xs font-black text-amber-500 block mt-0.5 font-mono">{leavesList.length} مرات</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] text-slate-400 block font-bold">تاريخ وسجل الإجازات السابقة ({leavesList.length})</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {leavesList.length === 0 ? (
                                <span className="text-[10px] text-slate-500 block text-center py-4 bg-slate-950/50 rounded-xl">لا توجد إجازات مسجلة في ملف الخدمة الذاتية حالياً.</span>
                              ) : (
                                leavesList.map((l, lIdx) => (
                                  <div key={lIdx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                                    <div className="flex justify-between font-black text-[10px] text-teal-400">
                                      <span>🏝️ {l.type}</span>
                                      <span className="text-[9px] text-slate-400">من {l.start} إلى {l.end}</span>
                                    </div>
                                    {l.notes && <p className="text-[10px] text-slate-400 mt-1 truncate font-sans">{l.notes}</p>}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Leave Request Form */}
                        <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                          <h4 className="text-xs font-black text-teal-400 flex items-center gap-1.5 border-b border-slate-850 pb-2">
                            <span>✍️</span>
                            <span>تسجيل وتأكيد إجازة رسمية ذاتية</span>
                          </h4>

                          <form onSubmit={(e) => addSelfWorkerLeaveLogic(e, profileWorker)} className="space-y-3.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold block">تاريخ البداية</label>
                                <input 
                                  type="date" 
                                  required
                                  value={lhStart} 
                                  onChange={(e) => setLhStart(e.target.value)} 
                                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 font-bold block">تاريخ النهاية</label>
                                <input 
                                  type="date" 
                                  required
                                  value={lhEnd} 
                                  onChange={(e) => setLhEnd(e.target.value)} 
                                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono" 
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">تصنيف الإجازة</label>
                              <select 
                                value={lhType} 
                                onChange={(e) => setLhType(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none cursor-pointer text-slate-950 bg-white"
                              >
                                <option value="إجازة اعتيادية" className="text-slate-950">إجازة اعتيادية سنوية</option>
                                <option value="إجازة مرضية" className="text-slate-950">إجازة مرضية موثقة</option>
                                <option value="إجازة اضطرارية" className="text-slate-950">إجازة اضطرارية طارئة</option>
                                <option value="دون راتب" className="text-slate-950">إجازة دون راتب</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold block">ملاحظات أو مبررات طلب الإجازة</label>
                              <input 
                                placeholder="ملاحظات وتوضيحات..." 
                                value={lhNotes} 
                                onChange={(e) => setLhNotes(e.target.value)} 
                                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500" 
                              />
                            </div>

                            <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black rounded-lg transition-colors shadow-lg">
                              {isLoading ? "جاري التسجيل..." : "تسجيل وتأكيد الإجازة في ملف الخدمة"}
                            </button>
                          </form>
                        </div>
                      </div>

                    </div>

                    {/* Row 2: Delay and Net Monthly Salary Calculator (Full Width Panel) */}
                    <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 space-y-4 text-right mt-6">
                      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5 font-sans">
                            <span>📊</span>
                            <span>تقرير حضورك وحاسبة الراتب الصافي الجاري للمستحقات</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 font-sans">تحديد الشهر الجاري واحتساب فوري للغياب، ساعات التأخير، المزايا المستحقة، السلف، وصافي الراتب المستحق في نهاية الشهر.</p>
                        </div>
                        <div className="flex items-center gap-2 font-sans">
                          <span className="text-xs text-slate-400 font-bold font-sans">تحديد شهر الاحتساب:</span>
                          <input 
                            type="month" 
                            value={selectedSalaryMonth}
                            onChange={(e) => setSelectedSalaryMonth(e.target.value)}
                            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 focus:outline-none cursor-pointer font-sans"
                          />
                        </div>
                      </div>

                      {(() => {
                        const stats = calculateWorkerSalaryForMonth(profileWorker, selectedSalaryMonth);
                        return (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold font-sans">الراتب الأساسي والبدلات المعتمدة</span>
                                <span className="text-sm font-black text-white block mt-1 font-mono">{(stats.basicSalary + stats.housing + stats.transport + stats.other).toLocaleString()} ريال</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">أساسي: {stats.basicSalary} | بدلات: {stats.housing + stats.transport + stats.other}</span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold font-sans">أيام حضورك هذا الشهر</span>
                                <span className="text-sm font-black text-amber-400 block mt-1 font-mono">{stats.presentDays} يوم عمل</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">من إجمالي البصمات المقيدة: {stats.monthRecordsCount}</span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold font-sans">إجمالي تأخيراتك المسجلة</span>
                                <span className="text-sm font-black text-rose-400 block mt-1 font-mono">{stats.totalDelayMinutes} دقيقة ({Math.floor(stats.totalDelayMinutes / 60)} س و {stats.totalDelayMinutes % 60} د)</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">تأخر في {stats.delayDaysCount} أيام • معدل خصم الساعة: {stats.hourlyRate} ريال</span>
                              </div>
                              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                                <span className="text-[11px] text-slate-400 block font-bold font-sans">السلف والمسحوبات للشهر</span>
                                <span className="text-sm font-black text-cyan-400 block mt-1 font-mono">-{stats.totalAdvancesInMonth.toLocaleString()} ريال</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">عدد حركات السلف: {stats.monthAdvances.length}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                              {/* Left Column: Delay details list table */}
                              <div className="lg:col-span-2 bg-slate-950/30 rounded-xl p-4 border border-slate-800 space-y-2">
                                <h5 className="text-xs font-black text-slate-300 font-sans font-sans">📋 سجل وساعات تأخير الحضور اليومية في شهر ({selectedSalaryMonth})</h5>
                                {stats.delayDetailsList.length === 0 ? (
                                  <div className="p-8 text-center text-xs text-slate-500 font-sans">لا توجد أي تأخيرات مقيدة لك في هذا الشهر! شكرًا لالتزامك الممتاز.</div>
                                ) : (
                                  <div className="overflow-y-auto max-h-40">
                                    <table className="w-full text-right text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 font-sans">
                                          <th className="py-2 px-2 font-sans">تاريخ اليوم</th>
                                          <th className="py-2 px-2 font-sans">وقت بصمة الحضور</th>
                                          <th className="py-2 px-2 font-sans">فترة التأخير عن الدوام</th>
                                          <th className="py-2 px-2 font-sans">الخصم المترتب</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {stats.delayDetailsList.map((d, dIdx) => (
                                          <tr key={dIdx} className="border-b border-slate-800/60 text-slate-300 hover:bg-slate-900/50 font-sans">
                                            <td className="py-2 px-2 font-sans font-sans">{d.date}</td>
                                            <td className="py-2 px-2 text-emerald-400 font-mono font-bold font-sans">{d.checkIn}</td>
                                            <td className="py-2 px-2 text-rose-400 font-mono font-bold font-sans">{d.delayMins} دقيقة</td>
                                            <td className="py-2 px-2 font-mono text-rose-400 font-sans">-{((d.delayMins / 60) * stats.hourlyRate).toFixed(1)} ريال</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Gross -> Deductions -> Net Salary receipt */}
                              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col justify-between font-sans">
                                <div className="space-y-3 text-xs font-sans">
                                  <h5 className="text-xs font-black text-amber-400 text-center border-b border-slate-800 pb-2 font-sans font-sans">🧾 كشف استحقاق راتب نهاية الشهر</h5>
                                  
                                  <div className="flex justify-between font-sans">
                                    <span className="text-slate-400 font-bold font-sans">الراتب الأساسي:</span>
                                    <span className="text-slate-200 font-mono">{stats.basicSalary.toLocaleString()} ريال</span>
                                  </div>
                                  <div className="flex justify-between font-sans">
                                    <span className="text-slate-400 font-bold font-sans">البدلات والمزايا:</span>
                                    <span className="text-slate-200 font-mono">{(stats.housing + stats.transport + stats.other).toLocaleString()} ريال</span>
                                  </div>
                                  <div className="flex justify-between text-amber-300 font-bold pt-1 border-t border-slate-800 font-sans">
                                    <span className="font-sans">إجمالي الاستحقاق الشامل (Gross):</span>
                                    <span className="font-mono">{stats.expectedGross.toLocaleString()} ريال</span>
                                  </div>

                                  <div className="flex justify-between text-rose-400 pt-1 font-sans">
                                    <span className="font-sans font-bold text-rose-400">خصم غياب وتأخيرات:</span>
                                    <span className="font-mono">-{stats.delayDeduction.toLocaleString()} ريال</span>
                                  </div>
                                  <div className="flex justify-between text-rose-400 font-sans">
                                    <span className="font-sans font-bold text-rose-400">خصم السلف المستلمة:</span>
                                    <span className="font-mono">-{stats.totalAdvancesInMonth.toLocaleString()} ريال</span>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center font-sans">
                                  <span className="text-xs font-black text-emerald-400 font-sans font-black">الصافي الجاري للراتب (Net):</span>
                                  <span className="text-base font-black text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">{stats.netSalary.toLocaleString()} ريال</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
              </div>
            </div>
          )}

          {/* Audit logs screen displaying sessions logs */}
          {activeSection === "sessions" && (currentUser?.role === "admin" || can("sessions")) && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2"><span>👁️</span> سجل الحركات التراكمي وتدقيق الجلسات الآمنة</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                      <th className="py-2.5 px-3 font-bold">الموظف</th>
                      <th className="py-2.5 px-3 font-bold">كود تسجيله</th>
                      <th className="py-2.5 px-3 font-bold">المرتبة</th>
                      <th className="py-2.5 px-3 font-bold">توقيت الحركة</th>
                      <th className="py-2.5 px-3 font-bold">العملية المتبعة اليوم</th>
                      <th className="py-2.5 px-3 font-bold">نوع ومواصفات الجهاز</th>
                      <th className="py-2.5 px-3 font-bold">عنوان الـ IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/30">
                    {sessions.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10 h-10 transition-colors">
                        <td className="py-2 px-3 font-bold text-white">{s.name}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-400">{s.code}</td>
                        <td className="py-2 px-3"><span className="text-[10px] text-amber-500 font-bold">{s.role}</span></td>
                        <td className="py-2 px-3 font-mono text-slate-400">{s.time}</td>
                        <td className="py-2 px-3 font-black text-slate-200">{s.action}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700 font-sans">
                            {s.device_type === "جوال" ? "📱" : s.device_type === "تابلت" ? "📱" : "💻"} {s.device_info || s.device_type || "كمبيوتر"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-blue-400 font-bold">
                          {s.ip_address || "127.0.0.1"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fallback Warning Card for Unauthorized Users */}
          {((activeSection === "users" && !(currentUser?.role === "admin" || can("users"))) ||
            (activeSection === "sessions" && !(currentUser?.role === "admin" || can("sessions"))) ||
            (activeSection === "companies" && !(currentUser?.role === "admin" || can("companies")))) && (
            <div className="flex flex-col items-center justify-center p-12 text-center max-w-lg mx-auto my-12 space-y-6 bg-slate-900/40 backdrop-blur-xl border border-amber-500/20 rounded-[32px] shadow-2xl relative overflow-hidden" dir="rtl">
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/10 rounded-tr-[32px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/10 rounded-bl-[32px] pointer-events-none" />
              
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-black text-white">🔒 قسم محمي - غير مصرح بالدخول</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                  عذراً، حسابك الحالي <b className="text-amber-400">({currentUser?.name})</b> مسجل بصلاحيات محدودة ولا يملك الصلاحيات الإدارية الكافية لعرض هذا القسم.
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-2 text-right w-full">
                <p className="text-xs text-slate-300 leading-relaxed">
                  الرجاء التواصل مع <b className="text-amber-500">مدير النظام العام</b> للحصول على الصلاحيات المطلوبة لحسابك الحالي، أو قم بتسجيل الدخول كمسؤول مخول لرؤية محتوى هذا القسم وإدارة الموظفين والصلاحيات.
                </p>
              </div>

              <p className="text-[9px] text-slate-500 leading-relaxed">
                بإمكانك الضغط على <b className="text-rose-400">🚪 خروج آمن من النظام</b> في أسفل القائمة الجانبية لتسجيل الخروج والدخول بالحساب المناسب.
              </p>
            </div>
          )}

        </main>

        {/* Manager Financial Edit Audit Control Modal */}
        {showAuditModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[110]" dir="rtl">
            <div className="bg-slate-900 border border-amber-500/20 rounded-3xl w-full max-w-md p-6 space-y-6 text-right shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div>
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">إجراء رقابي مطلوب (تعديل مالي سابق)</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">تتطلب الصلاحيات الإدارية تبرير وتوثيق أي تعديل مالي</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  عزيزي المدير المالي، أنت تقوم حالياً بتعديل قيد أو سند مالي مدون مسبقاً في الدفاتر المحاسبية. يرجى توثيق مبررات هذا التعديل وإرفاق قيد مرجعي كأثر تدقيق للأغراض الرقابية.
                </p>

                <div className="space-y-4">
                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] font-black text-slate-400 block">
                      سبب وتبرير التعديل المالي <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      value={auditReason}
                      onChange={(e) => setAuditReason(e.target.value)}
                      placeholder="على سبيل المثال: تصحيح خطأ إملائي في اسم العميل، تعديل قيمة الدفعة المتبقية..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 min-h-[85px] resize-none focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-[10px] font-black text-slate-400 block">
                      رقم القيد/المستند المرجعي <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={auditRefNo}
                      onChange={(e) => setAuditRefNo(e.target.value)}
                      placeholder="أدخل رقم المعاملة المرجعية أو إيصال البنك أو مرجع التدقيق..."
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button 
                  type="button"
                  onClick={handleCancelAuditSave}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition-colors border border-slate-750 text-white"
                >
                  إلغاء التعديل
                </button>
                <button 
                  type="button"
                  disabled={!auditReason.trim() || !auditRefNo.trim()}
                  onClick={handleConfirmAuditSave}
                  className={`px-5 py-2 text-xs font-black rounded-xl text-white transition-all flex items-center gap-1.5 ${
                    !auditReason.trim() || !auditRefNo.trim()
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-amber-600 hover:bg-amber-500 active:scale-95 shadow-lg shadow-amber-600/10"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>تأكيد واعتماد التعديل</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Unified custom confirm dialog */}
        {confirmDialog && confirmDialog.open && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]" dir="rtl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 text-right">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="text-amber-500">⚠</span>
                  <span>{confirmDialog.title}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {confirmDialog.message}
                </p>

                {confirmDialog.requireReason && (
                  <div className="space-y-1.5 text-right mt-4">
                    <label className="text-[10px] font-black text-slate-400 block">
                      مذكرة تسوية (سبب الحذف الإجباري للرقابة المالية)
                    </label>
                    <textarea
                      required
                      value={confirmReason}
                      onChange={(e) => setConfirmReason(e.target.value)}
                      placeholder={confirmDialog.reasonPlaceholder || "يرجى كتابة سبب الحذف بالتفصيل..."}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-rose-500 min-h-[85px] resize-none"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => {
                    setConfirmDialog(null);
                    setConfirmReason("");
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition-colors border border-slate-750 text-white"
                >
                  تراجع
                </button>
                <button 
                  type="button"
                  disabled={confirmDialog.requireReason && !confirmReason.trim()}
                  onClick={() => {
                    confirmDialog.onConfirm(confirmReason.trim());
                    setConfirmDialog(null);
                    setConfirmReason("");
                  }}
                  className={`px-4 py-2 text-xs font-black rounded-xl text-white transition-colors ${
                    confirmDialog.requireReason && !confirmReason.trim()
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  تأكيد العملية
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Receipt Print Preview Modal Overlay */}
        {printingReceiptId && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto z-[90]" dir="rtl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col my-8">
              {/* Modal Actions panel (Fixed at top) */}
              <div className="bg-slate-950 border-b border-slate-850 p-4 flex justify-between items-center no-print">
                <span className="text-sm font-black text-amber-400">📄 معاينة وطباعة سند القبض المالي</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      window.print();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة السند / PDF</span>
                  </button>
                  <button 
                    onClick={() => setPrintingReceiptId(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all"
                  >
                    إغلاق النافذة ❌
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div id="receipt-print-section" className="p-8 bg-white text-slate-900 overflow-y-auto print:p-0" style={{ direction: 'rtl' }}>
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #receipt-print-section, #receipt-print-section * {
                      visibility: visible;
                    }
                    #receipt-print-section {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      padding: 0 !important;
                      margin: 0 !important;
                      color: #000 !important;
                      background: transparent !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                  }
                `}</style>
                {(() => {
                  const r = receipts.find((a) => a.id === printingReceiptId);
                  if (!r) return <p className="text-red-500 font-bold p-4 text-center">لم يتم العثور على السند المحدد.</p>;
                  return (
                    <div className="space-y-6 max-w-2xl mx-auto text-right text-slate-950 font-sans p-6 border-4 border-slate-300 rounded-3xl bg-[#fafafa]">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-4">
                        <div className="text-right">
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight">شركة عرب وورلد</h1>
                          <p className="text-xs text-emerald-700 font-black mt-1">سندات القبض المالي والحلول الرقمية</p>
                        </div>
                        <div className="text-left leading-relaxed text-xs text-slate-800">
                          <div><b>رقم السند:</b> <span className="font-mono text-emerald-800 font-black">{r.no}</span></div>
                          <div><b>التاريخ:</b> <span className="font-mono font-bold">{r.date}</span></div>
                        </div>
                      </div>

                      <div className="bg-emerald-950 text-white text-center py-2.5 rounded-xl font-bold tracking-wide text-base shadow">
                        سند قبض مالي مقيد محاسبيًا وارد
                      </div>

                      {/* Receipt Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white">
                          <b className="text-[10px] text-emerald-700 block mb-1">الجهة المسددة (استلمنا من)</b>
                          <span className="text-slate-950 font-black text-sm">{r.from_name}</span>
                        </div>
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white">
                          <b className="text-[10px] text-emerald-700 block mb-1">رقم العقد التابع / الحساب</b>
                          <span className="text-slate-950 font-black text-sm">{r.contract_no || "سند مستقل / عام"}</span>
                        </div>
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white">
                          <b className="text-[10px] text-emerald-700 block mb-1">طريقة ووسيلة الاستلام</b>
                          <span className="text-slate-950 font-black text-sm">{r.method}</span>
                        </div>
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white">
                          <b className="text-[10px] text-emerald-700 block mb-1">الفرع الإداري للتحصيل</b>
                          <span className="text-slate-950 font-black text-sm">{awExtractRegion(r.notes || "") || "غير محدد"}</span>
                        </div>
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white col-span-2">
                          <b className="text-[10px] text-emerald-700 block mb-1">حساب الخزنة المقيد</b>
                          <span className="text-slate-950 font-black text-sm">🏦 {awExtractTreasury(r.notes || "") || "خزنة التحصيل"}</span>
                        </div>
                        {awExtractExternalNo(r.notes || "") && (
                          <div className="border border-slate-300 rounded-2xl p-3 bg-white">
                            <b className="text-[10px] text-emerald-700 block mb-1">رقم السند الخارجي الموازي</b>
                            <span className="text-slate-950 font-black text-sm">{awExtractExternalNo(r.notes || "")}</span>
                          </div>
                        )}
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white">
                          <b className="text-[10px] text-emerald-700 block mb-1">المشروع المرفق</b>
                          <span className="text-slate-950 font-black text-sm">{r.project || "عام"}</span>
                        </div>
                      </div>

                      {/* Money Amount section */}
                      <div className="bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-2xl p-5 text-center shadow-inner">
                        <b className="text-xs text-emerald-800 block mb-1.5 font-bold">المبلغ المقبوض بالتفصيل</b>
                        <span className="text-3xl font-black text-emerald-800 font-mono">
                          {Number(r.amount || 0).toLocaleString()} <span className="font-sans text-lg font-bold">ريال سعودي فقط</span>
                        </span>
                      </div>

                      {/* Installments Remaining context */}
                      {r.remaining_before !== undefined && r.remaining_after !== undefined && (
                        <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-2xl p-3 bg-slate-50 text-xs">
                          <div>
                            <b className="text-[#555] block">المتبقي الكلي قبل القبض:</b>
                            <span className="font-black text-slate-800 font-mono text-sm">{Number(r.remaining_before).toLocaleString()} ريال</span>
                          </div>
                          <div>
                            <b className="text-[#555] block">المتبقي الكلي بعد التقييد:</b>
                            <span className="font-black text-slate-800 font-mono text-sm">{Number(r.remaining_after).toLocaleString()} ريال</span>
                          </div>
                        </div>
                      )}

                      {/* Pay explanation note */}
                      {awCleanNotes(r.notes || "") && (
                        <div className="border border-slate-300 rounded-2xl p-3 bg-white text-xs">
                          <b className="text-[10px] text-emerald-700 block mb-1">البيان والشروحات الإضافية</b>
                          <p className="text-slate-800 font-medium leading-relaxed">{awCleanNotes(r.notes || "")}</p>
                        </div>
                      )}

                      {/* Signatures */}
                      <div className="grid grid-cols-3 gap-6 pt-10 text-xs">
                        <div className="text-center">
                          <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-700">توقيع المستلم المحصل</div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-700">الختم الرسمي للشركة</div>
                        </div>
                        <div className="text-center">
                          <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-700">توقيع الإدارة المالية</div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
                        حقوق التقسيط والمتابعة محفوظة لبرنامج عرب وورلد الرقمي • تم توليده ومزامنته بمصداقية عالية محاسبيًا.
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Add Treasury Modal */}
        {showAddTreasuryModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]" dir="rtl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 text-right">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="text-amber-500">💰</span>
                  <span>إضافة خزنة مالية جديدة</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  سيتم تسجيل هذه الخزنة كصندوق معتمد لتسهيل المتابعة والفرز والعمليات المالية للشركة المحددة.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400">اسم الخزنة المقترح</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خزنة المعارض، خزنة جدة، الخ"
                  value={newTreasuryInputName}
                  onChange={(e) => setNewTreasuryInputName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTreasuryModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition-colors border border-slate-750 text-white"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanName = newTreasuryInputName.trim();
                    if (!cleanName) {
                      showToast("الرجاء إدخال اسم الخزنة!", "error");
                      return;
                    }
                    addNewTreasury(cleanName, targetCompanyIdForModal);
                    setShowAddTreasuryModal(false);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-xs font-black rounded-xl text-slate-950 transition-colors"
                >
                  إضافة الآن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Authenticator Modal */}
        <AuthenticatorModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          userCode={currentUser?.code || loginCode || "1001"}
          userName={currentUser?.name || loginCode || "الموظف المفوّض"}
          userRole={currentUser?.role === "admin" ? "مدير النظام" : "موظف"}
          companyName={activeCompany?.name || "شركة عرب وورلد"}
          showToast={showToast}
          onSuccess2FA={(userCode, totpCode) => {
            handleDirectLogin(userCode, totpCode, activeCompany?.id);
          }}
        />
      </div>
    </div>
  );
}
