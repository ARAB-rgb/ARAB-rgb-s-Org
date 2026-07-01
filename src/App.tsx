/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Home, ClipboardList, FileText, Landmark, TrendingUp, TrendingDown, Briefcase, Users,
  Settings, LogOut, Calendar, MapPin, User, Phone, Shield, Search, Plus,
  Edit2, Trash2, Download, AlertTriangle, Sparkles, Clock, RefreshCw, Key, Printer, Building
} from "lucide-react";

import { User as AuthUser, Installment, Quote, Receipt, Payment, Expense, Project, Worker, DbSession, Company, Extract } from "./types";
import {
  sb, logSession, getContractTiming, awExtractRegion, awCleanNotes,
  awBuildNotesWithRegion, awBuildNotesWithRegionAndTreasury, awBuildNotesWithRegionAndTreasuryAndCapital, awExtractTreasury, awExtractCapital, generateNextNo,
  awExtractCapitalSource, awExtractCapitalCompany, awExtractCapitalCollection,
  awExtractWorkerContract, awExtractWorkerLeaves, awBuildWorkerNotes, awCleanWorkerNotes,
  getSupabaseCredentials, saveSupabaseCredentials, checkSupabaseHealth, isSupabaseHealthy,
  awExtractExternalNo, awBuildNotesWithRegionAndTreasuryAndExternalNo
} from "./db";

import { Toast, ToastItem, ToastType } from "./components/Shared/Toast";
import { Dashboard } from "./components/Dashboard";
import { Installments } from "./components/Installments";
import { safeStorage } from "./safeStorage";

const localStorage = safeStorage;
import { Treasury } from "./components/Treasury";

const getStoredTreasuries = (companyId?: string | null): string[] => {
  const defaults = ["خزنة الشركة", "خزنة التحصيل", "خزنة التحويل", "نقاط البيع", "خزنة المقاولات"];
  const suffix = companyId && companyId !== "all" ? `_${companyId}` : "";
  const saved = localStorage.getItem(`aw_treasuries${suffix}`);
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length > 0) {
        const merged = [...arr];
        defaults.forEach(d => {
          if (!merged.includes(d)) {
            merged.push(d);
          }
        });
        return merged;
      }
    } catch {}
  }
  return defaults;
};

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [isLoading, setIsLoading] = useState(false);

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
  const [loginPass, setLoginPass] = useState("");

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

  // In-app Popup states for Popups and safe Iframe Actions
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  // Supabase Dynamic Integration Settings
  const [sbUrl, setSbUrl] = useState("");
  const [sbKey, setSbKey] = useState("");
  const [sbStatus, setSbStatus] = useState<"checking" | "connected" | "fallback">("checking");
  const [sbTesting, setSbTesting] = useState(false);
  const [sbConfigExpanded, setSbConfigExpanded] = useState(false);

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
  const [qAmount, setQAmount] = useState<number | "">("");
  const [qVat, setQVat] = useState<number | "">(15);
  const [qStatus, setQStatus] = useState<"جديد" | "مرسل" | "مقبول" | "مرفوض">("جديد");
  const [qNotes, setQNotes] = useState("");

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

  // Search/Sort filters for receipts
  const [rSearch, setRSearch] = useState("");
  const [rSort, setRSort] = useState("date_desc");
  const [rFromDate, setRFromDate] = useState("");
  const [rToDate, setRToDate] = useState("");

  // 3. Payments Forms
  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState<number | "">("");
  const [payMethod, setPayMethod] = useState("تحويل بنكي");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payProject, setPayProject] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payTreasury, setPayTreasury] = useState("خزنة الشركة");

  // 4. Expenses Forms
  const [eName, setEName] = useState("");
  const [eCategory, setECategory] = useState<"مواد" | "عمالة" | "نقل" | "إيجار" | "وقود" | "أخرى">("مواد");
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
  const [wNotes, setWNotes] = useState("");

  // 7. Companies Forms
  const [cName, setCName] = useState("");
  const [cRegister, setCRegister] = useState("");
  const [cTaxNo, setCTaxNo] = useState("");
  const [cCapital, setCCapital] = useState<number | "">("");
  const [cPhone, setCPhone] = useState("");
  const [cAddress, setCAddress] = useState("");

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
  const [cUserId, setCUserId] = useState<string>("");

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
  const [selectedCompanyIdForPerms, setSelectedCompanyIdForPerms] = useState<string>("global");
  const [uCompanyPerms, setUCompanyPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [uPerms, setUPerms] = useState<Record<string, boolean>>({
    installmentsView: true,
    installmentsAdd: false,
    installmentsEdit: false,
    installmentsDelete: false,
    quotes: false,
    receipts: false,
    payments: false,
    expenses: false,
    treasury: false,
    projects: false,
    workers: false,
    companies: false,
    users: false,
    sessions: false,
    print: false,
    dashTopCards: true,
    dashCollection: true,
    dashPulse: true,
    dashLateClients: true,
    dashLastReceipts: true,
    dashUpcomingPaid: true,
  });

  // Auth checker logic
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim() || !loginPass.trim()) return;
    setIsLoading(true);

    try {
      const { data, error } = await sb
        .from("users")
        .select("*")
        .eq("code", loginCode.trim())
        .eq("password", loginPass.trim())
        .maybeSingle();

      if (error || !data) {
        showToast("بيانات تصريح الدخول غير صحيحة!", "error");
        setIsLoading(false);
        return;
      }

      const user: AuthUser = data;
      setCurrentUser(user);
      localStorage.setItem("aw_current_user", JSON.stringify(user));
      showToast(`مرحباً بك مجدداً ${user.name}`);
      await logSession(user, "تسجيل دخول للنظام المالي");
      await loadEverything();
    } catch {
      showToast("حدث خطأ في الاتصال بالملقم المالي!", "error");
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
      setInstallments(inst.data || []);
      setQuotes(q.data || []);
      setReceipts(rec.data || []);
      setPayments(pay.data || []);
      setExpenses(exp.data || []);
      setProjects(pr.data || []);
      setWorkers(w.data || []);
      setSessions(s.data || []);
      let compList = comp.data || [];
      const hasArabWorld = compList.some((c) => c.id === "arab_world");
      const hasDemoCompany = compList.some((c) => c.id === "demo_company");
      
      if (!hasArabWorld || !hasDemoCompany) {
        const toAdd = [];
        if (!hasArabWorld) {
          toAdd.push({
            id: "arab_world",
            name: "شركة عرب وورلد للمقاولات والعقود",
            commercial_register: "1010777555",
            tax_no: "300099988800003",
            capital: 10000000,
            phone: "0556446888",
            address: "الرياض، المملكة العربية السعودية",
            created_at: new Date().toISOString()
          });
        }
        if (!hasDemoCompany) {
          toAdd.push({
            id: "demo_company",
            name: "شركة التجربة المستقلة (Demo)",
            commercial_register: "1010123456",
            tax_no: "310123456700003",
            capital: 2500000,
            phone: "0500000001",
            address: "منطقة الدمام التجريبية",
            created_at: new Date().toISOString()
          });
        }
        
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

      // Autoresolve/refresh current user details to update links/permissions dynamically
      const savedUserStr = localStorage.getItem("aw_current_user");
      if (!savedUserStr) {
        // User logged out mid-flight or session was cleared, do not restore state
        return;
      }
      const freshUser = uList.find((x) => x.id === currentUser?.id);
      if (freshUser) {
        setCurrentUser(freshUser);
        localStorage.setItem("aw_current_user", JSON.stringify(freshUser));
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
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const getTargetCompanyId = (formCompanyVal?: string) => {
    if (currentUser?.role !== "admin") {
      return currentUser?.company_id || null;
    }
    return formCompanyVal || (selectedCompanyId !== "all" ? selectedCompanyId : null) || null;
  };

  // Auth User allowed scope helpers
  const getAuthorizedCompanies = () => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return companies;
    const userCompany = currentUser.company_id || "arab_world";
    return companies.filter((c) => c.id === userCompany);
  };

  const isCompanyAuthorized = (compId: string | undefined | null) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    const userCompany = currentUser.company_id || "arab_world";
    const itemCompany = compId || "arab_world";
    return itemCompany === userCompany;
  };

  const getActivePerms = () => {
    if (!currentUser) return null;
    return currentUser.perms;
  };

  const userRegionFilter = getActivePerms()?.region || "";

  const can = (perm: string) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    
    const activePerms = getActivePerms();
    if (activePerms) {
      return !!activePerms[perm as keyof typeof activePerms];
    }
    return false;
  };

  const getActivePermsForCompany = (user: AuthUser | null, compId: string | undefined) => {
    if (!user) return null;
    return user.perms;
  };

  const getAuthorizedTreasuries = (user: AuthUser | null, compId: string | undefined): string[] => {
    const targetCompId = compId || (user?.role !== "admin" ? user?.company_id : selectedCompanyId);
    const allSafes = getStoredTreasuries(targetCompId);
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

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        if (selectedCompanyId !== "all" && !companies.some((c) => c.id === selectedCompanyId)) {
          setSelectedCompanyId("all");
        }
      } else {
        setSelectedCompanyId(currentUser.company_id || "arab_world");
      }
    }
  }, [currentUser, companies]);

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

    const { data: rows, error } = await sb
      .from("receipts")
      .select("*")
      .eq("installment_id", installmentId);

    if (error) {
      showToast("تعذر إعادة حساب العقد في الملقم", "error");
      return;
    }

    const linked = installments.find((x) => x.id === installmentId);
    if (!linked) return;

    const paidFromReceipts = (rows || []).reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const newRemaining = Math.max(0, Number(linked.amount || 0) - paidFromReceipts);
    const newStatus = newRemaining <= 0 ? "مكتمل" : "منتظم";

    await sb
      .from("installments")
      .update({ paid: paidFromReceipts, remaining: newRemaining, status: newStatus })
      .eq("id", installmentId);
  };

  // Self-healing function for mismatched receipts
  const autoRepairMismatchedReceipts = async (loadedReceipts: Receipt[], loadedInstallments: Installment[]) => {
    const mismatched = loadedReceipts.filter(r => {
      if (!r.installment_id || !r.from_name) return false;
      const linked = loadedInstallments.find(i => i.id === r.installment_id);
      if (!linked || !linked.client) return false;
      
      const normFromName = String(r.from_name).trim().replace(/\s+/g, ' ').toLowerCase();
      const normClientName = String(linked.client).trim().replace(/\s+/g, ' ').toLowerCase();
      
      if (normFromName === normClientName) return false;
      
      // Check if payee name shares any substantial common words with the client name
      const wordsA = normFromName.split(' ').filter(w => w.length > 2);
      const wordsB = normClientName.split(' ').filter(w => w.length > 2);
      const sharesCommon = wordsA.some(w => wordsB.includes(w));
      
      return !sharesCommon; // True if completely different names
    });

    if (mismatched.length === 0) return;

    let repairedCount = 0;
    const installmentsToRecalc = new Set<string>();

    for (const r of mismatched) {
      // Find the correct installment belonging to the from_name
      const correctInstallment = loadedInstallments.find(i => {
        if (!i.client) return false;
        const normFromName = String(r.from_name).trim().replace(/\s+/g, ' ').toLowerCase();
        const normClientName = String(i.client).trim().replace(/\s+/g, ' ').toLowerCase();
        
        return normClientName === normFromName || normClientName.includes(normFromName) || normFromName.includes(normClientName);
      });

      if (correctInstallment) {
        const beforeAmt = Number(correctInstallment.remaining || 0);
        const afterAmt = Math.max(0, beforeAmt - Number(r.amount || 0));
        
        const updatedRow = {
          installment_id: correctInstallment.id,
          contract_no: correctInstallment.no,
          identity: correctInstallment.identity || "",
          phone: correctInstallment.phone || "",
          nationality: correctInstallment.nationality || "",
          remaining_before: beforeAmt,
          remaining_after: afterAmt
        };

        try {
          await sb.from("receipts").update(updatedRow).eq("id", r.id);
          if (r.installment_id) {
            installmentsToRecalc.add(r.installment_id);
          }
          installmentsToRecalc.add(correctInstallment.id);
          repairedCount++;
        } catch (err) {
          console.error("[Auto Repair Error]", err);
        }
      }
    }

    if (repairedCount > 0) {
      for (const instId of Array.from(installmentsToRecalc)) {
        await recalcLinkedContractFromReceipts(instId);
      }
      await loadEverything();
      showToast(`🟢 تم تلقائياً نقل ${repairedCount} سند قبض مفقود لملفات العملاء الصحيحة وإعادة توازن رصيد العقود!`, "success");
    }
  };

  const hasRunRepair = useRef(false);
  useEffect(() => {
    if (installments.length > 0 && receipts.length > 0 && !hasRunRepair.current) {
      hasRunRepair.current = true;
      autoRepairMismatchedReceipts(receipts, installments);
    }
  }, [installments, receipts]);


  // Interactive CRUD operations
  // Save Installments
  const onSaveInstallment = async (row: any, editId: string | null): Promise<boolean> => {
    const userRegion = userRegionFilter;
    const activeRegion = currentUser && currentUser.role !== "admin" && userRegion ? userRegion : row.region_input;
    const activeTreasury = row.treasury_input || "خزنة التحصيل";
    const activeCapital = Number(row.capital_input || 0);
    const capitalSource = row.capital_source_input || "";
    const capitalCompany = Number(row.capital_company_input || 0);
    const capitalCollection = Number(row.capital_collection_input || 0);
    const capitalSplits = row.capital_splits_input;
    const finalNotes = awBuildNotesWithRegionAndTreasuryAndCapital(
      row.notes, 
      activeRegion, 
      activeTreasury, 
      activeCapital,
      capitalSource,
      capitalCompany,
      capitalCollection,
      capitalSplits
    );

    const payload = {
      ...row,
      notes: finalNotes,
      company_id: getTargetCompanyId(row.company_id),
    };
    delete payload.region_input;
    delete payload.treasury_input;
    delete payload.capital_input;
    delete payload.capital_source_input;
    delete payload.capital_company_input;
    delete payload.capital_collection_input;
    delete payload.capital_splits_input;

    setIsLoading(true);
    try {
      const q = editId
        ? sb.from("installments").update(payload).eq("id", editId)
        : sb.from("installments").insert(payload);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        setIsLoading(false);
        return false;
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

  const onDeleteInstallment = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await sb.from("installments").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }
      await logSession(currentUser!, `حذف ملف عقد تقسيط ID: ${id}`);
      await loadEverything();
      showToast("تم مسح مستندات العقد كاملاً");
    } catch {
      showToast("فشل في استكمال حذف المستند", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Print popup styling logic matching screenshot details
  const onPrintContract = (id: string) => {
    const x = installments.find((a) => a.id === id);
    if (!x) return;

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
    <div style="width:120px;text-align:center"><div class="logo"></div></div>
    <div class="brand"><h1>شركة عرب وورلد</h1><p>نظام عقود وتقسيط وسندات</p></div>
    <div style="width:120px;font-size:11px;line-height:1.7"><b>التاريخ:</b><br>${new Date().toLocaleDateString("ar-SA")}<br><b>رقم العقد:</b><br>${x.no || ""}</div>
  </div>
  <div class="title">ورقة اتفاقية عقد مالي وسياق التزام</div>
  <div class="grid">
    <div class="box"><b>اسم الطرف المدين</b><span>${x.client}</span></div>
    <div class="box"><b>رقم السجل / الهوية</b><span>${x.identity}</span></div>
    <div class="box"><b>رقم الجوال الاتصالي</b><span>${x.phone}</span></div>
    <div class="box"><b>جنسية السجل</b><span>${x.nationality || "سعودي"}</span></div>
    <div class="box"><b>المشروع المرفق</b><span>${x.project || "عام"}</span></div>
    <div class="box"><b>مقر ووظيفة العمل</b><span>${x.workplace || "غير محدد"}</span></div>
    <div class="box"><b>تاريخ العقد وإيجاده</b><span>${x.start_date}</span></div>
    <div class="box"><b>عدد فترات الدفع</b><span>${x.periods} أيام</span></div>
    <div class="box"><b>القسط اليومي الإجباري</b><span>${Number(x.installment || 0).toLocaleString()} ريال</span></div>
    <div class="box"><b>الفرع الإداري</b><span>${awExtractRegion(x.notes || "") || "غير محدد"}</span></div>
    <div class="box"><b>الكفيل والضامن الغارم</b><span>${x.guarantor || "لا يوجد كفيل"}</span></div>
    <div class="box"><b>وضعية الملف</b><span>${x.status}</span></div>
    <div class="box" style="grid-column: span 3"><b>سياق الملاحظات والشروط</b><span>${awCleanNotes(x.notes || "") || "لا يوجد"}</span></div>
  </div>
  <div class="summary">
    <div class="sum"><b>إجمالي عقود الطرف الكلي</b><span>${totalAmount.toLocaleString()} ريال</span></div>
    <div class="sum"><b>المدفوع والمسلّم قبلاً</b><span>${totalPaid.toLocaleString()} ريال</span></div>
    <div class="sum"><b>المتبقي تحت الذمة</b><span>${totalRemaining.toLocaleString()} ريال</span></div>
  </div>
  <h3>كافة العقود والاتفاقيات الجارية للطرف العميل</h3>
  <table><thead><tr><th>رقم العقد</th><th>مشروع العمل</th><th>موقع المشغل</th><th>المبلغ الكلي</th><th>المستلم</th><th>المتبقي المعلق</th><th>القسط اليومي</th><th>أيام الأقساط</th><th>الوضعية</th></tr></thead><tbody>${rowsHtml}</tbody></table>
  <div class="signs"><div class="sign">بصمة وتوقيع العميل الضامن</div><div class="sign">اعتماد وختم شركة عرب وورلد للحلول العقارية</div></div>
  <div class="footer">تم تحرير مستندات العقد ومراجعته ماليًا في فرع السداد وتوثيق التوقيعات إبراء للذمة</div>
</div>
</body>
</html>`);
    w.document.close();
  };

  const onPrintReceipt = (id: string) => {
    const r = receipts.find((a) => a.id === id);
    if (!r) return;

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
    <div style="width:120px;text-align:center"><div class="logo"></div></div>
    <div class="brand"><h1>شركة عرب وورلد</h1><p>سندات القبض المالي والحسابات الرقمية</p></div>
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
    <div class="sign">الحسابات والتدقيق المالي</div>
    <div class="sign">توقيع أو بصمة المسدد</div>
  </div>
  <div class="footer">
    تم ترحيل وقيد سند القبض ماليًا في الدفتر اليومي العام وإصدار مقتضى إثبات السداد وتوثيق المستندات إلكترونيًا.
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
    if (!qClient) return;

    const row = {
      no: generateNextNo("AW-Q", quotes, "no"),
      client: qClient.trim(),
      phone: qPhone.trim(),
      project: qProject.trim(),
      amount: Number(qAmount || 0),
      vat: Number(qVat || 0),
      total: Math.round(Number(qAmount || 0) * (1 + Number(qVat || 0) / 100)),
      date: new Date().toISOString().slice(0, 10),
      status: qStatus,
      notes: qNotes,
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
      setQAmount("");
      setQNotes("");
      await loadEverything();
      showToast("تم حفظ عرض السعر بنجاح!");
    } catch {
      showToast("تعذر استكمال حفظ البيانات", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Receipts CRUD with auto updating Linked Installments
  const saveReceiptLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rFrom) return;

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

    let linked = rSelectedInstallment;
    if (!linked && rContractQuery) {
      linked = installments.find(
        (x) =>
          x.no === rContractQuery ||
          x.client === rContractQuery ||
          x.identity === rContractQuery ||
          `${x.no} | ${x.client} | ${x.identity}` === rContractQuery
      ) || null;
    }

    const amt = Number(rAmount || 0);
    const beforeAmt = linked ? Number(linked.remaining || 0) : 0;
    const afterAmt = linked ? Math.max(0, beforeAmt - amt) : 0;

    const rRegion = linked ? (awExtractRegion(linked.notes || "") || userRegionFilter) : userRegionFilter;
    const notesAppended = awBuildNotesWithRegionAndTreasuryAndExternalNo(rNotes, rRegion, rTreasury, rExternalNo);

    const row: any = {
      from_name: rFrom,
      amount: amt,
      method: rMethod,
      date: rDate,
      project: rProject,
      notes: notesAppended,
      installment_id: linked ? linked.id : null,
      contract_no: linked ? linked.no : "",
      identity: linked ? linked.identity : "",
      phone: linked ? linked.phone : "",
      nationality: linked ? linked.nationality : "",
      remaining_before: beforeAmt,
      remaining_after: afterAmt,
      company_id: getTargetCompanyId(formCompanyId),
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

      await logSession(currentUser!, editReceiptId ? `تعديل سند قبض مالي رقم: ${row.no}` : `تحرير سند قبض وراد مالي رقم: ${row.no}`);
      
      setEditReceiptId(null);
      setRSelectedInstallment(null);
      setRContractQuery("");
      setRFrom("");
      setRAmount("");
      setRProject("");
      setRNotes("");
      setRTreasury("خزنة التحصيل");
      setRExternalNo("");
      await loadEverything();
      showToast("تم حفظ السند وتحديث العقد التابع بنجاح!");
    } catch (err: any) {
      console.error(err);
      showToast("فشل في مزامنة الرصيد المزدوج للعقود: " + (err?.message || err), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReceiptLogicExecute = async (id: string, instId?: string) => {
    setIsLoading(true);
    try {
      const { error } = await sb.from("receipts").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }
      if (instId) {
        await recalcLinkedContractFromReceipts(instId);
      }
      await logSession(currentUser!, `حذف سند قبض مالي ID: ${id}`);
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
      "هل أنت متأكد من مسح سند القبض ماليًا بشكل نهائي وتحديث العقد؟",
      () => deleteReceiptLogicExecute(id, instId)
    );
  };

  // Payments CRUD
  const savePaymentLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTo || !payAmount) return;

    const row = {
      no: generateNextNo("AW-PAY", payments, "no"),
      to_name: payTo.trim(),
      amount: Number(payAmount),
      method: payMethod,
      date: payDate,
      project: payProject.trim(),
      notes: awBuildNotesWithRegionAndTreasury(payNotes, userRegionFilter, payTreasury),
      company_id: getTargetCompanyId(formCompanyId),
    };

    setIsLoading(true);
    try {
      const q = editPaymentId
        ? sb.from("payments").update(row).eq("id", editPaymentId)
        : sb.from("payments").insert(row);

      const { error } = await q;
      if (error) {
        showToast(error.message, "error");
        return;
      }

      await logSession(currentUser!, editPaymentId ? `تعديل سند الصرف رقم: ${row.no}` : `تحرير سند صرف صادر مالي رقم: ${row.no}`);
      setEditPaymentId(null);
      setPayTo("");
      setPayAmount("");
      setPayProject("");
      setPayNotes("");
      setPayTreasury("خزنة الشركة");
      await loadEverything();
      showToast("تم قيّد سند الصرف بنجاح!");
    } catch {
      showToast("خطأ في القيود المحاسبية للصرف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Expenses CRUD
  const saveExpenseLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eName || !eAmount) return;

    const row = {
      no: generateNextNo("AW-EXP", expenses, "no"),
      name: eName.trim(),
      category: eCategory,
      amount: Number(eAmount),
      date: eDate,
      project: eProject.trim(),
      supplier: eSupplier.trim(),
      notes: awBuildNotesWithRegionAndTreasury(eNotes, userRegionFilter, eTreasury),
      company_id: getTargetCompanyId(formCompanyId),
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

      await logSession(currentUser!, editExpenseId ? `تعديل بند المصروف رقم: ${row.no}` : `تحرير بند مصروفات فرعي رقم: ${row.no}`);
      setEditExpenseId(null);
      setEName("");
      setEAmount("");
      setEProject("");
      setESupplier("");
      setENotes("");
      setETreasury("خزنة الشركة");
      await loadEverything();
      showToast("تم توثيق المصروف في الدفتر المالي!");
    } catch {
      showToast("فشل ترحيل قيد المصروف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Projects CRUD
  const saveProjectLogic = async (e: React.FormEvent) => {
    e.preventDefault();
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
      company_id: getTargetCompanyId(formCompanyId),
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
      await loadEverything();
      showToast("تم حفظ بطاقة المشروع بنجاح!");
    } catch {
      showToast("حدث خلل في ملقم ملفات المشاريع", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Workers CRUD
  const saveWorkerLogic = async (e: React.FormEvent) => {
    e.preventDefault();
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
      notes: wNotes,
      company_id: getTargetCompanyId(formCompanyId),
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
      setWNotes("");
      await loadEverything();
      showToast("تم تحديث سلف مستحقات العمال.");
    } catch {
      showToast("خلل في مستند مجمع السلف عمال", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Companies & Extracts CRUD Logic
  const saveCompanyLogic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return;

    const row: any = {
      name: cName.trim(),
      commercial_register: cRegister.trim(),
      tax_no: cTaxNo.trim(),
      capital: Number(cCapital || 0),
      phone: cPhone.trim(),
      address: cAddress.trim(),
    };

    if (!editCompanyId) {
      row.id = "comp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    }

    setIsLoading(true);
    try {
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
      setCRegister("");
      setCTaxNo("");
      setCCapital("");
      setCPhone("");
      setCAddress("");
      await loadEverything();
      showToast("تم حفظ بطاقة الشركة بنجاح!");
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم لحفظ الشركة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onDeleteCompany = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الشركة "${name}" بالكامل؟ سيتم فك ارتباط أي مستندات تابعة.`)) return;

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
  };

  const saveExtractLogic = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const onDeleteExtract = async (id: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخلص "${title}"؟`)) return;

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
    if (!uName || !uCode || !uPass) return;

    if (uRole !== "admin" && !uCompanyId) {
      showToast("⚠️ يرجى اختيار الشركة التابع لها الموظف!", "error");
      return;
    }

    const row = {
      name: uName.trim(),
      code: uCode.trim(),
      password: uPass.trim(),
      role: uRole,
      company_id: uRole === "admin" ? null : uCompanyId,
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
      setSelectedCompanyIdForPerms("global");
      setUCompanyPerms({});
      setUPerms({
        installmentsView: true,
        installmentsAdd: false,
        installmentsEdit: false,
        installmentsDelete: false,
        quotes: false,
        receipts: false,
        payments: false,
        expenses: false,
        treasury: false,
        projects: false,
        workers: false,
        companies: false,
        users: false,
        sessions: false,
        print: false,
        dashTopCards: true,
        dashCollection: true,
        dashPulse: true,
        dashLateClients: true,
        dashLastReceipts: true,
        dashUpcomingPaid: true,
      });

      await loadEverything();
      showToast("تم تحديث سجلات حساب الموظفين المعينين");
    } catch {
      showToast("فشل في تثبيت الصلاحيات الإدارية", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Excel Export logic for Receipts
  const exportReceiptsExcel = () => {
    try {
      const targetRowsArr = getVisibleReceipts().filter((x) => {
        const query = rSearch.toLowerCase().trim();
        const text = `${x.no} ${x.date} ${x.from_name} ${x.contract_no} ${x.identity} ${x.phone} ${x.amount} ${x.remaining_after} ${x.method} ${x.project}`.toLowerCase();
        return !query || text.includes(query);
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

  // Fill in active inputs of receipts once linked installment matched
  const handleAutoFillReceipt = (val: string) => {
    setRContractQuery(val);
    const linked = installments.find(
      (x) =>
        x.no === val ||
        x.client === val ||
        x.identity === val ||
        `${x.no} | ${x.client} | ${x.identity}` === val
    );
    if (linked) {
      setRSelectedInstallment(linked);
      setRFrom(linked.client);
      setRProject(linked.project || "عام");
      setRAmount(linked.installment || "");
    } else {
      setRSelectedInstallment(null);
    }
  };

  // Nav categories helpers
  const navigationItems = [
    { key: "dashboard", label: "الرئيسية", icon: Home, visible: true },
    { key: "my_profile", label: "ملفي الوظيفي والخدمات الذاتية", icon: User, visible: true },
    { key: "installments", label: "التقسيط والعقود", icon: ClipboardList, visible: true },
    { key: "quotes", label: "عروض الأسعار", icon: FileText, visible: true },
    { key: "receipts", label: "سند قبض", icon: Landmark, visible: true },
    { key: "payments", label: "سند صرف", icon: TrendingUp, visible: true },
    { key: "expenses", label: "المصروفات", icon: TrendingDown, visible: true },
    { key: "treasury", label: "الخزنة الفرعية", icon: Shield, visible: true },
    { key: "projects", label: "المشاريع الجارية", icon: Briefcase, visible: true },
    { key: "workers", label: "العمال والسلفيات", icon: Users, visible: true },
    { key: "companies", label: "دليل الشركات والمستخلصات", icon: Building, visible: currentUser?.role === "admin" || can("companies") },
    { key: "users", label: "الموظفين والصلاحية", icon: Settings, visible: true },
    { key: "sessions", label: "سجل حركات النظام", icon: Clock, visible: true },
  ];

  // Auth Layout rendering check
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient p-4 text-right selection:bg-amber-500/30 select-none overflow-hidden relative" dir="rtl">
        <Toast toasts={toasts} removeToast={removeToast} />
        
        {/* Absolute Decorative Golden Ambient Lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        
        {/* Core Luxury Card */}
        <div className="w-full max-w-md bg-slate-950/40 backdrop-blur-2xl border border-amber-500/25 p-10 rounded-[32px] space-y-8 relative shadow-[0_0_50px_-5px_rgba(245,158,11,0.15)] overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-amber-500/5 before:to-transparent before:pointer-events-none">
          
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
              <h2 className="text-[10px] tracking-[0.25em] font-black text-amber-500/80 uppercase font-sans">ARAB WORLD GROUP</h2>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300">
                عرب وورلد المالي
              </h1>
              <p className="text-[11px] font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">
                الإدارة الذاتية المتكاملة والمصادقة الأمنية الموحدة للمقاولات والتقسيط
              </p>
            </div>

            {/* Glowing Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
              <span className="text-[9px] font-bold text-amber-400 font-mono tracking-wider">SECURE SHIELD v27.4</span>
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
                <label className="text-[10px] font-black tracking-wider text-slate-300">كود الموظف / المعرّف الخاص</label>
                <span className="text-[9px] text-slate-500 font-mono">USER CODE</span>
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
          </form>

          {/* Footer branding */}
          <div className="pt-2 text-center space-y-2 relative z-10">
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 font-bold">
              <span>🔒 تشفير محمي 256 بت</span>
              <span>•</span>
              <span>مراجعة الآليات التشغيلية نشطة</span>
            </div>
            <p className="text-[9px] font-medium text-slate-600 leading-relaxed max-w-xs mx-auto">
              بموجب أنظمة هيئة المقاولات واللوائح والائتمان الموحدة لشركة عرب وورلد للمقاولات العامة والتقسيط.
            </p>
          </div>
        </div>
      </div>
    );
  }

  let companyCapitalInContracts = 0;
  let collectionCapitalInContracts = 0;

  getVisibleInstallments().forEach((x) => {
    const source = awExtractCapitalSource(x.notes || "");
    const compAmount = awExtractCapitalCompany(x.notes || "");
    const collAmount = awExtractCapitalCollection(x.notes || "");
    const totalCap = awExtractCapital(x.notes || "");

    if (source === "شركة") {
      companyCapitalInContracts += totalCap;
    } else if (source === "تحصيل") {
      collectionCapitalInContracts += totalCap;
    } else if (source === "كلاهما") {
      companyCapitalInContracts += compAmount;
      collectionCapitalInContracts += collAmount;
    }
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
                <h1 className="text-base md:text-lg font-black tracking-tight text-white flex items-center gap-2 font-sans">
                  <span>شركة</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 via-yellow-200 to-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.15)]">
                    {selectedCompanyId === "all" || companies.length === 0
                      ? "عرب وورلد"
                      : companies.find((c) => c.id === selectedCompanyId)?.name || "عرب وورلد"
                    }
                  </span>
                  <span className="text-xs font-bold text-slate-300">للمقاولات العامة والتقسيط</span>
                </h1>
                <p className="text-[9px] text-slate-400 font-medium tracking-wide mt-0.5">البوابة الإدارية والمنظومة الحسابية المتكاملة الموثقة</p>
              </div>
            </div>

            {currentUser?.role === "admin" && companies.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900/60 border border-amber-500/20 rounded-xl px-3 py-1.5 shadow-lg shadow-amber-500/5 hover:border-amber-500/40 transition-all font-sans">
                <span className="text-[10px] text-amber-500 font-extrabold whitespace-nowrap">🏢 الشركة النشطة:</span>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer text-slate-950 bg-white"
                >
                  <option value="all" className="text-slate-950 font-bold">✨ كل الشركات (لوحة تحكم كاملة)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id} className="text-slate-950 font-bold">🏢 {c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3.5">
            {/* رأس مال الشركة في العقود */}
            <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/60 border border-amber-500/20 px-4 py-2 rounded-2xl flex items-center gap-3 text-right shadow-lg shadow-amber-500/5 relative before:absolute before:inset-0 before:rounded-2xl before:bg-amber-500/5 before:pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
              <div>
                <span className="block text-[8px] md:text-[9px] font-black text-amber-500/80 leading-normal uppercase">رأس مال الشركة بالعقود</span>
                <span className="block text-sm font-black text-amber-100 font-mono">
                  {companyCapitalInContracts.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ريال</span>
                </span>
              </div>
            </div>

            {/* رأس مال التحصيل في العقود */}
            <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/60 border border-emerald-500/20 px-4 py-2 rounded-2xl flex items-center gap-3 text-right shadow-lg shadow-emerald-500/5 relative before:absolute before:inset-0 before:rounded-2xl before:bg-emerald-500/5 before:pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
              <div>
                <span className="block text-[8px] md:text-[9px] font-black text-emerald-400 leading-normal uppercase">رأس مال التحصيل بالعقود</span>
                <span className="block text-sm font-black text-emerald-100 font-mono">
                  {collectionCapitalInContracts.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ريال</span>
                </span>
              </div>
            </div>

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
              companies={companies}
              selectedCompanyId={selectedCompanyId}
            />
          )}

          {activeSection === "installments" && (
            <Installments
              currentUser={currentUser}
              activePerms={getActivePerms()}
              installments={getVisibleInstallments()}
              projects={getVisibleProjects()}
              onSaveInstallment={onSaveInstallment}
              onDeleteInstallment={onDeleteInstallment}
              onPrintContract={onPrintContract}
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
              isAdmin={currentUser?.role === "admin"}
            />
          )}

          {/* Core Quotes Tab Container */}
          {activeSection === "quotes" && (
            <div className="space-y-6">
              <form onSubmit={saveQuoteLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>📋</span> تحرير وثيقة عروض الأسعار</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input required placeholder="اسم العميل" value={qClient} onChange={(e) => setQClient(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-sans" />
                  <input placeholder="رقم الجوال" value={qPhone} onChange={(e) => setQPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans" />
                  <input placeholder="المشروع التابع" value={qProject} onChange={(e) => setQProject(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans" />
                  <input type="number" required placeholder="قيمة العرض" value={qAmount} onChange={(e) => setQAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-mono" />
                  <input type="number" placeholder="الضريبة المقررة %" value={qVat} onChange={(e) => setQVat(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-mono" />
                  
                  <select value={formCompanyId} onChange={(e) => setFormCompanyId(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans">
                    <option value="">🏢 تبعية شركة الشعار (تلقائي)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select value={qStatus} onChange={(e: any) => setQStatus(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans">
                    <option value="جديد">جديد</option>
                    <option value="مرسل">مرسل</option>
                    <option value="مقبول">مقبول</option>
                    <option value="مرفوض">مرفوض</option>
                  </select>
                  <textarea placeholder="شروط وملاحظات إضافية" value={qNotes} onChange={(e) => setQNotes(e.target.value)} className="w-full px-3 py-2 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white sm:col-span-1 focus:outline-none font-sans" />
                </div>
                <div className="flex gap-2 justify-end">
                  {editQuoteId && (
                    <button type="button" onClick={() => { setEditQuoteId(null); setQClient(""); setQPhone(""); setQProject(""); setQAmount(""); setQNotes(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-black">{editQuoteId ? "تأكيد واستبدال" : "حفظ وحيازة أسعار"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800">
                      <th className="py-2.5 px-3 font-bold">رقم العرض</th>
                      <th className="py-2.5 px-3 font-bold">العميل</th>
                      <th className="py-2.5 px-3 font-bold">المشروع</th>
                      <th className="py-2.5 px-3 font-bold">القيمة والضريبة</th>
                      <th className="py-2.5 px-3 font-bold">الإجمالي الشامل</th>
                      <th className="py-2.5 px-3 font-bold">الحالة</th>
                      <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getVisibleQuotes().map((q, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-300">{q.no}</td>
                        <td className="py-3 px-3 font-black text-white">{q.client}</td>
                        <td className="py-3 px-3">{q.project}</td>
                        <td className="py-3 px-3 font-mono">{q.amount.toLocaleString()} ريال (+{q.vat}%)</td>
                        <td className="py-3 px-3 font-black text-emerald-400 font-mono">{q.total.toLocaleString()} ريال</td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-slate-800 text-slate-100">{q.status}</span>
                        </td>
                        <td className="py-3 px-3 text-center space-x-1">
                          <button onClick={() => { setEditQuoteId(q.id); setQClient(q.client || ""); setQPhone(q.phone || ""); setQProject(q.project || ""); setQAmount(q.amount || ""); setQNotes(q.notes || ""); }} className="p-1 text-blue-400 hover:text-white inline-block"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if(confirm("حذف العرض بشكل نهائي؟")) { sb.from("quotes").delete().eq("id", q.id).then(() => loadEverything()); } }} className="p-1 text-rose-400 hover:text-rose-500 inline-block"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
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
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>💰</span> تحرير سند قبض مالي وارد</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400">ربط العقد التابع (رقم العقد أو الاسم المعين لتوليد الحسابات)</label>
                    <input
                      placeholder="ابحث واختر لربط الحساب ومتبقياته تلقائياً..."
                      value={rContractQuery}
                      onChange={(e) => handleAutoFillReceipt(e.target.value)}
                      maxLength={180}
                      list="contractsListDatalist"
                      className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none"
                    />
                    <datalist id="contractsListDatalist">
                      {installments.map((x, idx) => (
                        <option key={idx} value={`${x.no} | ${x.client} | ${x.identity}`} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">استلمنا من</label>
                    <input required placeholder="اسم الدافع العميل" value={rFrom} onChange={(e) => setRFrom(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">حجم المبلغ المستلم</label>
                    <input type="number" required placeholder="قيمة السند" value={rAmount} onChange={(e) => setRAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">طريقة الاستلام</label>
                    <select value={rMethod} onChange={(e) => setRMethod(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                      <option value="مدى">مدى</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="نقداً">نقداً</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">تاريخ القبض ماليًا</label>
                    <input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-500">الخزنة المستهدفة بالقيد</label>
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
                    <input readOnly value={rSelectedInstallment ? `${Number(rSelectedInstallment.remaining).toLocaleString()} ريال` : "غير مرتبط"} className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-bold text-slate-400" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">المشروع المرفق بالقيد</label>
                    <input placeholder="المشروع" value={rProject} onChange={(e) => setRProject(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400">البيان وشرائح الملاحظة</label>
                    <textarea placeholder="شرائح قسط يومي..." value={rNotes} onChange={(e) => setRNotes(e.target.value)} className="w-full px-3 py-1.5 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  {editReceiptId && (
                    <button type="button" onClick={() => { setEditReceiptId(null); setRContractQuery(""); setRSelectedInstallment(null); setRFrom(""); setRAmount(""); setRProject(""); setRNotes(""); setRTreasury("خزنة التحصيل"); setRExternalNo(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
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
                          return !query || text.includes(query);
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
                          <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
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
                              <button onClick={() => { setEditReceiptId(r.id); handleAutoFillReceipt(r.contract_no || ""); setRFrom(r.from_name || ""); setRAmount(r.amount || ""); setRMethod(r.method || ""); setRDate(r.date || ""); setRProject(r.project || ""); setRNotes(awCleanNotes(r.notes || "")); setRTreasury(awExtractTreasury(r.notes || "") || "خزنة التحصيل"); setRExternalNo(awExtractExternalNo(r.notes || "")); document.getElementById("receipts-tab-view")?.scrollIntoView({ behavior: "smooth" }); }} className="p-1 text-blue-400 hover:text-white" title="تعديل"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteReceiptLogic(r.id, r.installment_id)} className="p-1 text-rose-400 hover:text-rose-500" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">صرفنا إلى المستفيد</label>
                    <input required placeholder="صرفنا إلى المستفيد" value={payTo} onChange={(e) => setPayTo(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400">مبلغ الصرف</label>
                    <input type="number" required placeholder="مبلغ الصرف" value={payAmount} onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-500">حساب الخزنة الممول</label>
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
                  <div className="space-y-1 sm:col-span-2 md:col-span-3">
                    <label className="text-[10px] font-black text-slate-400">الارتباط بالمشروع</label>
                    <input placeholder="الارتباط بالمشروع" value={payProject} onChange={(e) => setPayProject(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div className="space-y-1 sm:col-span-2 md:col-span-4">
                    <label className="text-[10px] font-black text-slate-400">البيان والتفاصيل</label>
                    <textarea placeholder="البيان" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full px-3 py-2 h-[45px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  {editPaymentId && (
                    <button type="button" onClick={() => { setEditPaymentId(null); setPayTo(""); setPayAmount(""); setPayProject(""); setPayNotes(""); setPayTreasury("خزنة الشركة"); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editPaymentId ? "استبدال وصيغة السند" : "قيد سند الصرف ماليًا"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                      <th className="py-2.5 px-3 font-bold">رقم السند</th>
                      <th className="py-2.5 px-3 font-bold">التاريخ</th>
                      <th className="py-2.5 px-3 font-bold">صرف إلى</th>
                      <th className="py-2.5 px-3 font-bold">مبلغ الصرف الصادر</th>
                      <th className="py-2.5 px-3 font-bold">طريقة الصرف</th>
                      <th className="py-2.5 px-3 font-bold">المشروع والبيان</th>
                      <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getVisiblePayments().map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-300">{p.no}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{p.date}</td>
                        <td className="py-3 px-3 font-black text-white">{p.to_name}</td>
                        <td className="py-3 px-3 font-black text-rose-400 font-mono">-{p.amount.toLocaleString()} ريال</td>
                        <td className="py-3 px-3 font-bold">
                          <span className="block">{p.method}</span>
                          <span className="block text-[10px] text-amber-400 font-extrabold mt-0.5 font-sans">🏦 {awExtractTreasury(p.notes || "") || "خزنة الشركة"}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          <b className="text-white text-[11px] block">{p.project}</b>
                          {awCleanNotes(p.notes || "")}
                        </td>
                        <td className="py-3 px-3 text-center space-x-1">
                          <button onClick={() => { setEditPaymentId(p.id); setPayTo(p.to_name || ""); setPayAmount(p.amount || ""); setPayMethod(p.method || ""); setPayDate(p.date || ""); setPayProject(p.project || ""); setPayNotes(awCleanNotes(p.notes || "")); setPayTreasury(awExtractTreasury(p.notes || "") || "خزنة الشركة"); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if(confirm("تأكيد الحذف؟")) { sb.from("payments").delete().eq("id", p.id).then(() => loadEverything()); } }} className="p-1 text-rose-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Core Expenses Tab Container */}
          {activeSection === "expenses" && (
            <div className="space-y-6">
              <form onSubmit={saveExpenseLogic} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="border-b border-slate-850 pb-3">
                  <h3 className="text-base font-black text-white flex items-center gap-2"><span>🧾</span> تسجيل بند مصروف فرعي</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input required placeholder="اسم المصروف ووصفه" value={eName} onChange={(e) => setEName(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <select value={eCategory} onChange={(e: any) => setECategory(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none">
                    <option value="مواد">مواد</option>
                    <option value="عمالة">عمالة</option>
                    <option value="نقل">نقل</option>
                    <option value="إيجار">إيجار</option>
                    <option value="وقود">وقود</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                  <input type="number" required placeholder="المبلغ" value={eAmount} onChange={(e) => setEAmount(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="المشروع التابع" value={eProject} onChange={(e) => setEProject(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <input placeholder="المورد أو المستفيد" value={eSupplier} onChange={(e) => setESupplier(e.target.value)} className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                  <select
                    value={eTreasury}
                    onChange={(e) => setETreasury(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer bg-slate-950"
                  >
                    {getAuthorizedTreasuries(currentUser, selectedCompanyId).map((tName) => (
                      <option key={tName} value={tName} className="bg-slate-950 text-white">💰 {tName}</option>
                    ))}
                  </select>
                  <textarea placeholder="ملاحظات" value={eNotes} onChange={(e) => setENotes(e.target.value)} className="w-full px-3 py-1.5 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none" />
                </div>
                <div className="flex gap-2 justify-end">
                  {editExpenseId && (
                    <button type="button" onClick={() => { setEditExpenseId(null); setEName(""); setEAmount(""); setEProject(""); setESupplier(""); setENotes(""); setETreasury("خزنة الشركة"); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editExpenseId ? "تعديل القيّد" : "قيد المصروف ماليًا"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
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
                    {getVisibleExpenses().map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-300">{e.no}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{e.date}</td>
                        <td className="py-3 px-3">
                          <span className="block font-black text-white">{e.name}</span>
                          <span className="block text-[10px] text-amber-500 mt-0.5 font-bold">فئة: {e.category}</span>
                        </td>
                        <td className="py-3 px-3 font-black text-rose-400 font-mono">-{e.amount.toLocaleString()} ريال</td>
                        <td className="py-3 px-3">
                          <span className="block font-bold text-slate-200">{e.supplier || "مورد كلي"}</span>
                          <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{e.project}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="block text-slate-400 max-w-xs truncate">{awCleanNotes(e.notes || "")}</span>
                          <span className="inline-block text-[9px] text-cyan-400 font-sans font-extrabold bg-cyan-950/45 px-1.5 py-0.5 rounded border border-cyan-850 mt-1">🏦 {awExtractTreasury(e.notes || "") || "خزنة الشركة"}</span>
                        </td>
                        <td className="py-3 px-3 text-center space-x-1">
                          <button onClick={() => { setEditExpenseId(e.id); setEName(e.name || ""); setECategory(e.category || ""); setEAmount(e.amount || ""); setEDate(e.date || ""); setEProject(e.project || ""); setESupplier(e.supplier || ""); setENotes(awCleanNotes(e.notes || "")); setETreasury(awExtractTreasury(e.notes || "") || "خزنة الشركة"); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if(confirm("تأكيد الحذف؟")) { sb.from("expenses").delete().eq("id", e.id).then(() => loadEverything()); } }} className="p-1 text-rose-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Projects Tab Container */}
          {activeSection === "projects" && (
            <div className="space-y-6">
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
                </div>
                <div className="flex gap-2 justify-end">
                  {editProjectId && (
                    <button type="button" onClick={() => { setEditProjectId(null); setPName(""); setPLocation(""); setPEngineer(""); setPBudget(""); setPProgress(0); setPNotes(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editProjectId ? "حفظ التحديث" : "إنشاء بطاقة المشروع"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                      <th className="py-2.5 px-3 font-bold">اسم المشروع والموقع</th>
                      <th className="py-2.5 px-3 font-bold">المهندس المشرف</th>
                      <th className="py-2.5 px-3 font-bold">الميزانية</th>
                      <th className="py-2.5 px-3 font-bold">Progress</th>
                      <th className="py-2.5 px-3 font-bold">الحالة</th>
                      <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getVisibleProjects().map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-3">
                          <span className="block font-black text-white">{p.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-500" /> {p.location || "غير محدد"}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-200">{p.engineer || "بإشراف فرقا المقاول"}</td>
                        <td className="py-3 px-3 font-mono text-white font-extrabold">{Number(p.budget || 0).toLocaleString()} ريال</td>
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
                          <button onClick={() => { setEditProjectId(p.id); setPName(p.name || ""); setPLocation(p.location || ""); setPEngineer(p.engineer || ""); setPBudget(p.budget || ""); setPProgress(p.progress !== undefined && p.progress !== null ? p.progress : 0); setPStatus(p.status || "نشط"); setPNotes(p.notes || ""); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if(confirm("حذف ملف المشروع بشكل نهائي؟")) { sb.from("projects").delete().eq("id", p.id).then(() => loadEverything()); } }} className="p-1 text-rose-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  <textarea placeholder="ملاحظات" value={wNotes} onChange={(e) => setWNotes(e.target.value)} className="w-full px-3 py-1.5 h-[41px] bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-bold text-white sm:col-span-2 focus:outline-none" />
                </div>
                <div className="flex gap-2 justify-end">
                  {editWorkerId && (
                    <button type="button" onClick={() => { setEditWorkerId(null); setWName(""); setWId(""); setWPhone(""); setWProject(""); setWDaily(""); setWDays(""); setWAdvance(0); setWNotes(""); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black">{editWorkerId ? "تعديل القيّد" : "قيد العامل بالمقاولات"}</button>
                </div>
              </form>

              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                      <th className="py-2.5 px-3 font-bold">الاسم والمهنة</th>
                      <th className="py-2.5 px-3 font-bold">المشروع المعني</th>
                      <th className="py-2.5 px-3 font-bold text-center">أيام العمل الجارية</th>
                      <th className="py-2.5 px-3 font-bold">إجمالي المستحق اليومي</th>
                      <th className="py-2.5 px-3 font-bold">سلفة مسحوبة</th>
                      <th className="py-2.5 px-3 font-bold">الصافي المعلق</th>
                      <th className="py-2.5 px-3 font-bold">الوضعية</th>
                      <th className="py-2.5 px-3 font-bold text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getVisibleWorkers().map((w, idx) => (
                      <tr key={idx} className="border-b border-slate-850 hover:bg-slate-800/10 transition-colors">
                        <td className="py-3 px-3">
                          <span className="block font-black text-white">{w.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">مهنة: {w.job} • {w.worker_id || "بدون هوية"}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-500">{w.project}</td>
                        <td className="py-3 px-3 font-mono font-bold text-center text-white">{w.days} يومًا</td>
                        <td className="py-3 px-3 font-mono text-slate-200">{(w.daily * w.days).toLocaleString()} ريال</td>
                        <td className="py-3 px-3 font-black text-rose-400 font-mono">-{Number(w.advance || 0).toLocaleString()} ريال</td>
                        <td className="py-3 px-3 font-black text-emerald-400 font-mono">{(w.total - w.advance).toLocaleString()} ريال</td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${w.status === "على رأس العمل" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-850 text-slate-400"}`}>{w.status}</span>
                        </td>
                        <td className="py-3 px-3 text-center space-x-1">
                          <button onClick={() => initHrWorker(w)} className="p-1 text-amber-400 hover:text-amber-300 hover:scale-110 duration-200 inline-block" title="الشؤون والملف الوظيفي"><Users className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setEditWorkerId(w.id); setWName(w.name || ""); setWId(w.worker_id || ""); setWPhone(w.phone || ""); setWJob(w.job || "عامل"); setWProject(w.project || ""); setWDaily(w.daily || ""); setWDays(w.days || ""); setWAdvance(w.advance !== undefined && w.advance !== null ? w.advance : 0); setWStatus(w.status || "على رأس العمل"); setWNotes(w.notes || ""); }} className="p-1 text-blue-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if(confirm("مسح العامل من قوائم الحساب؟")) { sb.from("workers").delete().eq("id", w.id).then(() => loadEverything()); } }} className="p-1 text-rose-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

                          <div className="space-y-1 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                            <label className="text-[10px] text-slate-300 font-bold block">🔐 ربط ملف العقد والخدمة الذاتية بحساب مستخدم جاري</label>
                            <select 
                              value={cUserId} 
                              onChange={(e) => setCUserId(e.target.value)} 
                              className="w-full px-2 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-[11px] font-bold text-amber-400 focus:outline-none cursor-pointer text-slate-950 bg-white"
                            >
                              <option value="" className="text-slate-950">❌ غير مربوط بحساب مستخدم (اضغط لربط حساب مالي)</option>
                              {users.map((u) => (
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
                            <label className="text-[10px] text-slate-400 font-bold">صرف مالي من الخزنة</label>
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
                  </div>
                </div>
              )}
            </div>
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

                    {companies.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/20 border border-dashed border-slate-805 rounded-2xl">
                        <span className="text-3xl block">🏛️</span>
                        <h4 className="text-xs font-black text-slate-400 mt-3">لا توجد شركات مدرجة حتى الآن</h4>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">سجل أول شركة من النموذج لاستعراض عمالها ومشاريعها وسندات أمرها.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {companies.map((comp) => {
                          const compWorkers = workers.filter((w) => w.company_id === comp.id);
                          const compProjects = projects.filter((p) => p.company_id === comp.id);
                          const compInstallments = installments.filter((i) => i.company_id === comp.id);
                          const compTotalCapital = compInstallments.reduce((sum, i) => sum + Number(i.amount || 0), 0);

                          return (
                            <div key={comp.id} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/20 transition-all flex flex-col justify-between relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-amber-500/20 before:via-transparent before:to-transparent">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-xs font-extrabold text-white font-sans">{comp.name}</h4>
                                    {comp.commercial_register && (
                                      <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">سجل: {comp.commercial_register}</span>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditCompanyId(comp.id);
                                        setCName(comp.name || "");
                                        setCRegister(comp.commercial_register || "");
                                        setCTaxNo(comp.tax_no || "");
                                        setCCapital(comp.capital || "");
                                        setCPhone(comp.phone || "");
                                        setCAddress(comp.address || "");
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
                          {companies.map((comp) => (
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
{`-- SQL لإنشاء جداول النظام وتفعيلها فوراً في Supabase
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  code TEXT UNIQUE,
  password TEXT,
  role TEXT,
  perms JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buyer_name TEXT,
  buyer_phone TEXT,
  national_id TEXT,
  guarantor_name TEXT,
  guarantor_phone TEXT,
  guarantor_national_id TEXT,
  ref_no TEXT UNIQUE,
  amount_with_interest NUMERIC,
  amount_paid NUMERIC DEFAULT 0,
  months INT,
  is_approved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client TEXT,
  phone TEXT,
  project TEXT,
  amount NUMERIC,
  vat NUMERIC DEFAULT 15,
  status TEXT DEFAULT 'جديد',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  installment_id TEXT,
  ref_no TEXT,
  buyer_name TEXT,
  amount NUMERIC,
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  payment_to TEXT,
  ref_no TEXT,
  amount NUMERIC,
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category TEXT,
  amount NUMERIC,
  notes TEXT,
  receiver TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  manager TEXT,
  budget NUMERIC,
  status TEXT DEFAULT 'تحت التنفيذ',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id TEXT UNIQUE,
  name TEXT,
  job TEXT,
  salary NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  user_name TEXT,
  event TEXT,
  action_type TEXT,
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
                          onChange={(e: any) => setURole(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white"
                        >
                          <option value="employee" className="text-slate-950">👨‍💼 موظف فرع محدود</option>
                          <option value="supervisor" className="text-slate-950">🕵️‍♂️ مشرف مكتب عام / رئيسي</option>
                          <option value="admin" className="text-slate-950">👑 أدمن مكتب عام</option>
                        </select>
                      </div>

                      {uRole !== "admin" && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-black block">🏢 الشركة التابع لها الموظف *</label>
                          <select
                            required
                            value={uCompanyId}
                            onChange={(e) => setUCompanyId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none text-slate-950 bg-white font-sans"
                          >
                            <option value="" className="text-slate-950">اختر الشركة...</option>
                            {companies.map((c) => (
                              <option key={c.id} value={c.id} className="text-slate-950 font-bold">🏢 {c.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

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
                    {getStoredTreasuries(selectedCompanyIdForPerms !== "global" ? selectedCompanyIdForPerms : selectedCompanyId).map((tName) => {
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
                    <button type="button" onClick={() => { setEditUserId(null); setUName(""); setUCode(""); setUPass(""); setUWorkerId(""); setURegion(""); setURole("employee"); setUCompanyId(""); setUCompanyPerms({}); setSelectedCompanyIdForPerms("global"); }} className="px-5 py-2.5 bg-slate-800 rounded-xl text-xs font-black">إلغاء</button>
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
                    {users.map((u, idx) => {
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
                            <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-800 text-amber-400 font-bold border border-slate-700">{u.role === "admin" ? "أدمن مكتب عام" : (u.role === "supervisor" ? "مشرف مكتب عام / رئيسي" : "موظف فرع")}</span>
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
                              <button onClick={() => { if(confirm("مسح حساب الموظف؟")) { sb.from("users").delete().eq("id", u.id).then(() => loadEverything()); } }} className="p-1 text-rose-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
                              <label className="text-[10px] text-slate-400 font-bold block">صرف السند ماليًا من صندوق</label>
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
              </div>
              
              <div className="flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl transition-colors border border-slate-750 text-white"
                >
                  تراجع
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-black rounded-xl text-white transition-colors"
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
      </div>
    </div>
  );
}
