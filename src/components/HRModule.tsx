/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users, User, FileText, ClipboardList, Shield, Landmark, TrendingUp, TrendingDown,
  Clock, Search, Plus, Trash2, Edit2, Calendar, Check, X, AlertCircle, Printer, Download,
  Coins, Briefcase, Building, ChevronLeft, ChevronRight, File, ShieldCheck, HeartPulse
} from "lucide-react";
import { sb } from "../db";
import { User as AuthUser, Project, Company, CompanyAsset } from "../types";

// HR Interfaces
export interface HrEmployee {
  id: string;
  company_id: string;
  name: string;
  employee_no: string;
  id_iqama: string;
  nationality: string;
  phone: string;
  job_title: string;
  department: string;
  project: string;
  branch: string;
  start_date: string;
  basic_salary: number;
  allowances: number;
  payment_method: "monthly" | "daily";
  daily_rate: number;
  bank_account: string;
  iban: string;
  status: "على رأس العمل" | "إجازة" | "موقوف" | "مستقيل" | "منتهية خدماته";
  image_url?: string;
  attachments?: string; // stringified array of attachments or text
  created_at?: string;
}

export interface HrContract {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  type: "محدد المدة" | "غير محدد المدة" | "عقد يوميات";
  start_date: string;
  end_date: string;
  probation: string; // e.g., "90 يوماً"
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  work_hours: number;
  work_days: number;
  daily_rate: number;
  project_branch: string;
  conditions: string;
  status: "مسودة" | "ساري" | "منتهي" | "ملغي";
  attachments?: string;
  created_at?: string;
}

export interface HrCustody {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  type: string; // سيارة، جوال، إلخ
  description: string;
  serial_no: string;
  value: number;
  delivery_date: string;
  delivery_condition: string;
  project_branch: string;
  image_url?: string;
  delivered_by: string;
  signature_url?: string;
  status: "مستلمة" | "مرتجعة" | "تالفة" | "مفقودة";
  return_date?: string;
  return_condition?: string;
  notes?: string;
  created_at?: string;
}

export interface HrJournal {
  id: string;
  company_id: string;
  date: string;
  employee_id: string;
  employee_name: string;
  project: string;
  branch: string;
  work_days: number;
  work_hours: number;
  overtime_hours: number;
  daily_rate: number;
  overtime_rate: number;
  total_entitled: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string;
  voucher_no?: string;
  notes?: string;
  status: "مسودة" | "معتمدة" | "مدفوعة جزئياً" | "مدفوعة بالكامل";
  created_at?: string;
}

export interface HrDeduction {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  type: "غياب" | "تأخير" | "سلفة" | "مخالفة" | "تلف عهدة" | "فقد عهدة" | "خصم إداري" | "خصم يوم" | "خصم ساعات" | "خصم مخصص";
  date: string;
  amount: number;
  days_hours?: string;
  reason: string;
  project_branch: string;
  attachments?: string;
  created_by: string;
  approved_by?: string;
  status: "مسودة" | "بانتظار الاعتماد" | "معتمد" | "ملغي";
  month_applied: string; // YYYY-MM
  created_at?: string;
}

interface HRProps {
  currentUser: AuthUser | null;
  projects: Project[];
  companies: Company[];
  selectedCompanyId: string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  onPaymentCreated?: () => void;
}

export const HRModule: React.FC<HRProps> = ({
  currentUser,
  projects,
  companies,
  selectedCompanyId,
  showToast,
  onPaymentCreated
}) => {
  // Navigation tabs inside HR
  const [activeTab, setActiveTab] = useState<"employees" | "contracts" | "custody" | "journals" | "deductions" | "ledger" | "reports">("employees");

  // State lists
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [contracts, setContracts] = useState<HrContract[]>([]);
  const [custodies, setCustodies] = useState<HrCustody[]>([]);
  const [journals, setJournals] = useState<HrJournal[]>([]);
  const [deductions, setDeductions] = useState<HrDeduction[]>([]);
  const [companyAssets, setCompanyAssets] = useState<CompanyAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Common filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Active Company ID based on session and choice
  const activeCompanyId = currentUser?.role === "admin"
    ? (selectedCompanyId === "all" ? (currentUser.company_id || "arab_world") : selectedCompanyId)
    : (currentUser?.company_id || "arab_world");

  // Check custom visual permissions
  const can = (perm: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    
    // Check company perms if available
    if (currentUser.company_perms && currentUser.company_perms[activeCompanyId]) {
      const compPerm = currentUser.company_perms[activeCompanyId];
      if (compPerm && !compPerm.use_global) {
        return !!compPerm[perm as keyof typeof compPerm];
      }
    }
    return !!currentUser.perms[perm as keyof typeof currentUser.perms];
  };

  // Fetch all HR data
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Employees
      const empRes = await sb.from("hr_employees").select("*").eq("company_id", activeCompanyId);
      if (empRes.data) setEmployees(empRes.data);

      // 2. Contracts
      const conRes = await sb.from("hr_contracts").select("*").eq("company_id", activeCompanyId);
      if (conRes.data) setContracts(conRes.data);

      // 3. Custody
      const custRes = await sb.from("hr_custody").select("*").eq("company_id", activeCompanyId);
      if (custRes.data) setCustodies(custRes.data);

      // 4. Journals
      const jourRes = await sb.from("hr_journals").select("*").eq("company_id", activeCompanyId);
      if (jourRes.data) setJournals(jourRes.data);

      // 5. Deductions
      const dedRes = await sb.from("hr_deductions").select("*").eq("company_id", activeCompanyId);
      if (dedRes.data) setDeductions(dedRes.data);

      // 6. Company Assets
      const assetsRes = await sb.from("company_assets").select("*").eq("company_id", activeCompanyId);
      if (assetsRes.data) setCompanyAssets(assetsRes.data);
    } catch (err) {
      console.error("Error loading HR data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeCompanyId]);

  // Sub-modules Forms & Modals states
  const [employeeForm, setEmployeeForm] = useState<Partial<HrEmployee> | null>(null);
  const [contractForm, setContractForm] = useState<Partial<HrContract> | null>(null);
  const [custodyForm, setCustodyForm] = useState<Partial<HrCustody> | null>(null);
  const [journalForm, setJournalForm] = useState<Partial<HrJournal> | null>(null);
  const [deductionForm, setDeductionForm] = useState<Partial<HrDeduction> | null>(null);

  // Batch journals modal
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchDate, setBatchDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [batchProject, setBatchProject] = useState<string>("");
  const [batchBranch, setBatchBranch] = useState<string>("");
  const [batchEntries, setBatchEntries] = useState<{ employeeId: string; workDays: number; workHours: number; overtimeHours: number; notes: string; }[]>([]);

  // Print templates
  const [printContract, setPrintContract] = useState<HrContract | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  // Ledger state
  const [ledgerEmployeeId, setLedgerEmployeeId] = useState<string>("");
  const [ledgerStartDate, setLedgerStartDate] = useState<string>("");
  const [ledgerEndDate, setLedgerEndDate] = useState<string>("");

  // Helper to generate sequential unique Employee No within company
  const generateEmployeeNo = (): string => {
    const compEmployees = employees.filter(e => e.company_id === activeCompanyId);
    let maxNum = 1000;
    compEmployees.forEach(emp => {
      const match = emp.employee_no?.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `EMP-${maxNum + 1}`;
  };

  // Handle Employee Save (Insert / Update)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm?.name) return showToast("يرجى إدخال اسم الموظف", "error");

    try {
      const isEdit = !!employeeForm.id;
      const payload: any = {
        ...employeeForm,
        company_id: activeCompanyId,
        basic_salary: Number(employeeForm.basic_salary || 0),
        allowances: Number(employeeForm.allowances || 0),
        daily_rate: Number(employeeForm.daily_rate || 0),
      };

      if (!isEdit) {
        payload.id = crypto.randomUUID();
        payload.employee_no = generateEmployeeNo();
        payload.created_at = new Date().toISOString();
        payload.status = payload.status || "على رأس العمل";
        await sb.from("hr_employees").insert(payload);
        showToast("تم إضافة الموظف بنجاح");
      } else {
        await sb.from("hr_employees").update(payload).eq("id", employeeForm.id);
        showToast("تم تحديث بيانات الموظف بنجاح");
      }
      setEmployeeForm(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل حفظ الموظف", "error");
    }
  };

  // Handle Employee Status Change (with custody check)
  const handleTerminateEmployee = async (employeeId: string, targetStatus: "مستقيل" | "منتهية خدماته") => {
    // Check outstanding custody
    const outstandingCustody = custodies.filter(
      c => c.employee_id === employeeId && c.status === "مستلمة"
    );

    if (outstandingCustody.length > 0) {
      return showToast(
        `لا يمكن إنهاء خدمات الموظف! لديه عهد غير مرتجعة (${outstandingCustody.length} عهدة). يرجى استرجاعها أولاً.`,
        "warning"
      );
    }

    try {
      await sb.from("hr_employees").update({ status: targetStatus }).eq("id", employeeId);
      showToast("تم تحديث حالة الموظف بنجاح");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل تحديث الحالة", "error");
    }
  };

  // Handle Contract Save (Active Contract constraint rule)
  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm?.employee_id || !contractForm?.start_date) {
      return showToast("يرجى ملء البيانات الأساسية للعقد", "error");
    }

    const emp = employees.find(emp => emp.id === contractForm.employee_id);
    const empName = emp ? emp.name : "";

    // If new contract is marked Active (ساري), ensure no other contract is currently active for this employee
    if (contractForm.status === "ساري") {
      const activeCon = contracts.find(
        c => c.employee_id === contractForm.employee_id && c.status === "ساري" && c.id !== contractForm.id
      );
      if (activeCon) {
        return showToast(
          `الموظف ${empName} لديه عقد ساري بالفعل! لا يمكن تفعيل عقدين في نفس الوقت إلا بعد إنهاء أو إلغاء العقد الحالي.`,
          "error"
        );
      }
    }

    try {
      const isEdit = !!contractForm.id;
      const payload: any = {
        ...contractForm,
        employee_name: empName,
        company_id: activeCompanyId,
        basic_salary: Number(contractForm.basic_salary || 0),
        housing_allowance: Number(contractForm.housing_allowance || 0),
        transport_allowance: Number(contractForm.transport_allowance || 0),
        other_allowances: Number(contractForm.other_allowances || 0),
        work_hours: Number(contractForm.work_hours || 0),
        work_days: Number(contractForm.work_days || 0),
        daily_rate: Number(contractForm.daily_rate || 0),
      };

      if (!isEdit) {
        payload.id = crypto.randomUUID();
        payload.created_at = new Date().toISOString();
        payload.status = payload.status || "مسودة";
        await sb.from("hr_contracts").insert(payload);
        showToast("تم إنشاء العقد بنجاح");
      } else {
        await sb.from("hr_contracts").update(payload).eq("id", contractForm.id);
        showToast("تم تحديث العقد بنجاح");
      }
      setContractForm(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل حفظ العقد", "error");
    }
  };

  // Handle Custody Save
  const handleSaveCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custodyForm?.employee_id || !custodyForm?.type || !custodyForm?.delivery_date) {
      return showToast("يرجى ملء بيانات العهدة بالكامل", "error");
    }

    const emp = employees.find(emp => emp.id === custodyForm.employee_id);
    const empName = emp ? emp.name : "";

    try {
      const isEdit = !!custodyForm.id;
      const payload: any = {
        ...custodyForm,
        employee_name: empName,
        company_id: activeCompanyId,
        value: Number(custodyForm.value || 0),
      };

      if (!isEdit) {
        payload.id = crypto.randomUUID();
        payload.created_at = new Date().toISOString();
        payload.status = payload.status || "مستلمة";
        await sb.from("hr_custody").insert(payload);
        showToast("تم تسليم العهدة بنجاح");
      } else {
        await sb.from("hr_custody").update(payload).eq("id", custodyForm.id);
        showToast("تم تحديث العهدة بنجاح");
      }
      setCustodyForm(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل حفظ العهدة", "error");
    }
  };

  // Handle Return Custody
  const handleReturnCustody = async (custodyId: string, condition: string) => {
    try {
      await sb.from("hr_custody").update({
        status: "مرتجعة",
        return_date: new Date().toISOString().split("T")[0],
        return_condition: condition
      }).eq("id", custodyId);
      showToast("تم إرجاع العهدة بنجاح");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل إرجاع العهدة", "error");
    }
  };

  // Calculate journal totals based on daily/hourly parameters
  const calculateJournalTotal = (form: Partial<HrJournal>): number => {
    const days = Number(form.work_days || 0);
    const dailyRate = Number(form.daily_rate || 0);
    const hours = Number(form.work_hours || 0);
    const overtimeHours = Number(form.overtime_hours || 0);
    const overtimeRate = Number(form.overtime_rate || 0);

    // Equation: Daily Total = work_days * daily_rate
    const dailyTotal = days * dailyRate;
    // Overtime Value = overtime_hours * overtime_rate
    const overtimeTotal = overtimeHours * overtimeRate;

    return dailyTotal + overtimeTotal;
  };

  // Handle Journal Save
  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalForm?.employee_id || !journalForm?.date) {
      return showToast("يرجى ملء بيانات اليومية الأساسية", "error");
    }

    const emp = employees.find(emp => emp.id === journalForm.employee_id);
    const empName = emp ? emp.name : "";

    const total = calculateJournalTotal(journalForm);

    try {
      const isEdit = !!journalForm.id;
      const payload: any = {
        ...journalForm,
        employee_name: empName,
        company_id: activeCompanyId,
        total_entitled: total,
        remaining_amount: total - Number(journalForm.paid_amount || 0),
      };

      if (!isEdit) {
        payload.id = crypto.randomUUID();
        payload.created_at = new Date().toISOString();
        payload.status = payload.status || "مسودة";
        await sb.from("hr_journals").insert(payload);
        showToast("تم تسجيل اليومية بنجاح");
      } else {
        await sb.from("hr_journals").update(payload).eq("id", journalForm.id);
        showToast("تم تحديث اليومية بنجاح");
      }
      setJournalForm(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل حفظ اليومية", "error");
    }
  };

  // Handle Batch journals creation
  const handleSaveBatchJournals = async () => {
    if (!batchProject) return showToast("يرجى اختيار المشروع", "error");
    if (batchEntries.length === 0) return showToast("يرجى إضافة عمال للدفعة", "error");

    try {
      const inserts = batchEntries.map(entry => {
        const emp = employees.find(e => e.id === entry.employeeId);
        const dailyRate = emp?.daily_rate || 0;
        const total = (entry.workDays * dailyRate) + (entry.overtimeHours * (dailyRate / 8 * 1.5)); // Overtime rate defaults to 1.5 of hourly
        
        return {
          id: crypto.randomUUID(),
          company_id: activeCompanyId,
          date: batchDate,
          employee_id: entry.employeeId,
          employee_name: emp?.name || "",
          project: batchProject,
          branch: batchBranch,
          work_days: entry.workDays,
          work_hours: entry.workHours,
          overtime_hours: entry.overtimeHours,
          daily_rate: dailyRate,
          overtime_rate: Math.round((dailyRate / 8) * 1.5),
          total_entitled: total,
          paid_amount: 0,
          remaining_amount: total,
          payment_method: "نقداً",
          status: "مسودة",
          notes: entry.notes,
          created_at: new Date().toISOString()
        };
      });

      await sb.from("hr_journals").insert(inserts);
      showToast(`تم تسجيل يوميات الدفعة بنجاح لـ ${inserts.length} موظف/عامل`);
      setShowBatchModal(false);
      setBatchEntries([]);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل تسجيل الدفعة", "error");
    }
  };

  // Handle Pay Journal & relate to main system payment voucher (خزنة + سند صرف)
  const handlePayJournal = async (journal: HrJournal, treasuryName: string) => {
    if (!journal.id) return;
    try {
      // 1. Create main system Payment Voucher (سند صرف)
      const paymentNo = `PAY-HR-${Math.floor(1000 + Math.random() * 9000)}`;
      const mainPayment = {
        id: crypto.randomUUID(),
        company_id: activeCompanyId,
        no: paymentNo,
        to_name: journal.employee_name,
        amount: journal.total_entitled,
        method: "نقداً",
        date: journal.date,
        project: journal.project || "شؤون الموظفين",
        notes: `صرف يومية مستحقة للموظف تاريخ: ${journal.date} [الخزنة: ${treasuryName}]`,
        created_at: new Date().toISOString()
      };

      await sb.from("payments").insert(mainPayment);

      // 2. Update Journal to Paid
      await sb.from("hr_journals").update({
        status: "مدفوعة بالكامل",
        paid_amount: journal.total_entitled,
        remaining_amount: 0,
        voucher_no: paymentNo,
        payment_method: `الخزنة: ${treasuryName}`
      }).eq("id", journal.id);

      showToast(`تم صرف اليومية بالكامل بنجاح برقم سند: ${paymentNo}`);
      if (onPaymentCreated) onPaymentCreated();
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل إتمام الصرف المالي", "error");
    }
  };

  // Handle Deduction Save
  const handleSaveDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionForm?.employee_id || !deductionForm?.amount || !deductionForm?.type) {
      return showToast("يرجى ملء بيانات الخصم بالكامل", "error");
    }

    const emp = employees.find(emp => emp.id === deductionForm.employee_id);
    const empName = emp ? emp.name : "";

    try {
      const isEdit = !!deductionForm.id;
      const payload: any = {
        ...deductionForm,
        employee_name: empName,
        company_id: activeCompanyId,
        amount: Number(deductionForm.amount || 0),
        created_by: currentUser?.name || "النظام"
      };

      if (!isEdit) {
        payload.id = crypto.randomUUID();
        payload.created_at = new Date().toISOString();
        payload.status = payload.status || "مسودة";
        await sb.from("hr_deductions").insert(payload);
        showToast("تم تسجيل الخصم بنجاح وبانتظار الاعتماد");
      } else {
        await sb.from("hr_deductions").update(payload).eq("id", deductionForm.id);
        showToast("تم تحديث الخصم بنجاح");
      }
      setDeductionForm(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل حفظ الخصم", "error");
    }
  };

  // Handle Deduction Approval
  const handleApproveDeduction = async (deductionId: string) => {
    try {
      await sb.from("hr_deductions").update({
        status: "معتمد",
        approved_by: currentUser?.name || "المدير"
      }).eq("id", deductionId);
      showToast("تم اعتماد الخصم بنجاح ليدخل في كشوف الرواتب");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "فشل اعتماد الخصم", "error");
    }
  };

  // Contract Expire Alerts calculator
  const getContractAlert = (endDateStr: string): { days: number; text: string; color: string; alert: boolean } => {
    if (!endDateStr) return { days: 999, text: "", color: "", alert: false };
    const today = new Date();
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { days: diffDays, text: "منتهي الصلاحية!", color: "text-rose-500 bg-rose-500/10", alert: true };
    }
    if (diffDays <= 7) {
      return { days: diffDays, text: "تنبيه: ينتهي خلال 7 أيام!", color: "text-red-400 bg-red-500/10 animate-pulse", alert: true };
    }
    if (diffDays <= 30) {
      return { days: diffDays, text: "تنبيه: ينتهي خلال 30 يوماً!", color: "text-amber-400 bg-amber-500/10", alert: true };
    }
    if (diffDays <= 60) {
      return { days: diffDays, text: "تنبيه: ينتهي خلال 60 يوماً!", color: "text-yellow-400 bg-yellow-500/10", alert: true };
    }
    if (diffDays <= 90) {
      return { days: diffDays, text: "تنبيه: ينتهي خلال 90 يوماً!", color: "text-orange-400 bg-orange-500/10", alert: true };
    }
    return { days: diffDays, text: "ساري الصلاحية", color: "text-emerald-400 bg-emerald-500/10", alert: false };
  };

  // Ledger calculation helper
  const getEmployeeLedger = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;

    let journalsList = journals.filter(j => j.employee_id === empId && j.status === "معتمدة" || j.status === "مدفوعة بالكامل");
    let deductionsList = deductions.filter(d => d.employee_id === empId && d.status === "معتمد");

    if (ledgerStartDate) {
      journalsList = journalsList.filter(j => j.date >= ledgerStartDate);
      deductionsList = deductionsList.filter(d => d.date >= ledgerStartDate);
    }
    if (ledgerEndDate) {
      journalsList = journalsList.filter(j => j.date <= ledgerEndDate);
      deductionsList = deductionsList.filter(d => d.date <= ledgerEndDate);
    }

    const totalJournalsEarned = journalsList.reduce((sum, j) => sum + j.total_entitled, 0);
    const totalJournalsPaid = journalsList.reduce((sum, j) => sum + j.paid_amount, 0);
    const totalDeductions = deductionsList.reduce((sum, d) => sum + d.amount, 0);

    const empCustodies = custodies.filter(c => c.employee_id === empId);
    const empContracts = contracts.filter(c => c.employee_id === empId);

    const netEarned = (emp.payment_method === "monthly" ? emp.basic_salary + emp.allowances : 0) + totalJournalsEarned;
    const finalBalance = netEarned - totalJournalsPaid - totalDeductions;

    return {
      employee: emp,
      journalsList,
      deductionsList,
      empCustodies,
      empContracts,
      totalJournalsEarned,
      totalJournalsPaid,
      totalDeductions,
      netEarned,
      finalBalance
    };
  };

  // Profile image handler (preset avatars or base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isDoc: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isDoc) {
          if (employeeForm) {
            setEmployeeForm({ ...employeeForm, attachments: reader.result as string });
          } else if (contractForm) {
            setContractForm({ ...contractForm, attachments: reader.result as string });
          } else if (custodyForm) {
            setCustodyForm({ ...custodyForm, image_url: reader.result as string });
          } else if (deductionForm) {
            setDeductionForm({ ...deductionForm, attachments: reader.result as string });
          }
        } else {
          setEmployeeForm({ ...employeeForm, image_url: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // PDF Export simple browser print helper
  const handlePrint = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    const originalContent = document.body.innerHTML;
    if (printContent) {
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload(); // reload to restore React state cleanly
    }
  };

  return (
    <div className="space-y-8 text-right font-sans" dir="rtl">
      {/* Module Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-3">
            <Users className="w-6 h-6" />
            <span>وحدة شؤون الموظفين والموارد البشرية المتكاملة</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">إدارة شاملة لملفات العمال، العقود القانونية، العهد المسلمة، واليوميات والخصميات المعزولة</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-full border border-amber-500/20 font-black">
            🏢 الشركة النشطة: {companies.find(c => c.id === activeCompanyId)?.name || "عرب وورلد"}
          </span>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
        {[
          { key: "employees", label: "ملف الموظف", icon: User, allowed: can("hr_employees_view") },
          { key: "contracts", label: "العقود والرواتب", icon: ClipboardList, allowed: can("hr_contracts_view") },
          { key: "custody", label: "العهد والأصول", icon: Shield, allowed: can("hr_custody_view") },
          { key: "journals", label: "اليوميات والحضور", icon: Clock, allowed: can("hr_journals_add") },
          { key: "deductions", label: "الخصميات والجزاءات", icon: TrendingDown, allowed: can("hr_deductions_add") },
          { key: "ledger", label: "كشف حساب الموظف", icon: Landmark, allowed: can("hr_salaries_view") },
          { key: "reports", label: "التقارير الإحصائية", icon: FileText, allowed: can("hr_reports_print") },
        ].filter(t => t.allowed).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                activeTab === tab.key
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/5"
                  : "text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Renderings */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-white/5">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث باسم الموظف أو رقم الإقامة أو رقم الجوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-950/60 border border-white/5 focus:border-amber-500/50 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950/60 border border-white/5 px-4 py-2 rounded-xl text-xs text-slate-300 outline-none focus:border-amber-500/50"
              >
                <option value="all">كل الحالات</option>
                <option value="على رأس العمل">على رأس العمل</option>
                <option value="إجازة">في إجازة</option>
                <option value="موقوف">موقوف</option>
                <option value="مستقيل">مستقيل</option>
                <option value="منتهية خدماته">منتهية خدماته</option>
              </select>
              {can("hr_employees_add") && (
                <button
                  onClick={() => setEmployeeForm({})}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer mr-auto md:mr-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة ملف موظف جديد</span>
                </button>
              )}
            </div>
          </div>

          {/* Employee Directory List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">جاري تحميل ملفات الموظفين...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.filter(emp => {
                const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  emp.id_iqama.includes(searchQuery) ||
                  emp.phone.includes(searchQuery);
                const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
                return matchesSearch && matchesStatus;
              }).map((emp) => (
                <div key={emp.id} className="glass border border-white/5 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="flex items-start gap-4">
                    {/* Employee Profile Pic or Avatar */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                      {emp.image_url ? (
                        <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    {/* Information Summary */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-500 font-mono">{emp.employee_no}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          emp.status === "على رأس العمل" ? "bg-emerald-500/10 text-emerald-400" :
                          emp.status === "إجازة" ? "bg-blue-500/10 text-blue-400" :
                          emp.status === "موقوف" ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-rose-500/10 text-rose-400"
                        }`}>
                          {emp.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-100">{emp.name}</h3>
                      <p className="text-[11px] text-amber-300 font-medium">{emp.job_title} • {emp.department || "بدون قسم"}</p>
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="mt-4 border-t border-white/5 pt-4 grid grid-cols-2 gap-y-2 text-xs text-slate-400">
                    <div>
                      <span className="block text-[9px] text-slate-500">الجوال:</span>
                      <b className="text-slate-300 font-mono">{emp.phone}</b>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500">الهوية/الإقامة:</span>
                      <b className="text-slate-300 font-mono">{emp.id_iqama}</b>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500">طريقة الأجر:</span>
                      <b className="text-slate-300">{emp.payment_method === "monthly" ? "راتب شهري" : `يوميات (${emp.daily_rate} ريال)`}</b>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500">الفرع / المشروع:</span>
                      <b className="text-amber-400 truncate block max-w-full">{emp.project || "عام"}</b>
                    </div>
                  </div>

                  {/* Actions Drawer */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewProfileId(emp.id)}
                      className="text-xs text-amber-400 hover:text-amber-300 underline font-black"
                    >
                      عرض الملف الكامل
                    </button>
                    <div className="flex items-center gap-1">
                      {can("hr_employees_edit") && (
                        <button
                          onClick={() => setEmployeeForm(emp)}
                          className="p-2 bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 border border-white/5 hover:border-amber-500/20 rounded-xl transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {can("hr_employees_edit") && emp.status === "على رأس العمل" && (
                        <select
                          onChange={(e) => handleTerminateEmployee(emp.id, e.target.value as any)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2 py-1.5 rounded-xl text-[10px] text-rose-400 outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>إنهاء خدمة</option>
                          <option value="مستقيل">مستقيل</option>
                          <option value="منتهية خدماته">منتهية خدماته</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Second Tab: Contracts */}
      {activeTab === "contracts" && (
        <div className="space-y-6">
          {/* Alerts Panel for Contract Expirations */}
          <div className="space-y-2">
            {contracts.filter(c => c.status === "ساري").map(con => {
              const alert = getContractAlert(con.end_date);
              if (alert.alert) {
                return (
                  <div key={con.id} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${alert.color}`}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5" />
                      <div className="text-right">
                        <h4 className="text-xs font-black">عقد الموظف: {con.employee_name} قارب على الانتهاء</h4>
                        <p className="text-[10px] opacity-80 mt-0.5">تاريخ الانتهاء: {con.end_date} ({alert.text})</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPrintContract(con)}
                      className="text-[10px] font-black bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      عرض وطباعة العقد
                    </button>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-md font-black text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              <span>عقود الموظفين التاريخية والنشطة</span>
            </h3>
            {can("hr_contracts_add") && (
              <button
                onClick={() => setContractForm({})}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>تحرير عقد عمل جديد</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-300 font-black border-b border-white/5">
                  <th className="p-4">اسم الموظف</th>
                  <th className="p-4">نوع العقد</th>
                  <th className="p-4">تاريخ البداية</th>
                  <th className="p-4">تاريخ الانتهاء</th>
                  <th className="p-4">الراتب الأساسي</th>
                  <th className="p-4">بدل سكن / نقل</th>
                  <th className="p-4">حالة العقد</th>
                  <th className="p-4 text-left">التحكم</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((con) => {
                  const alertInfo = getContractAlert(con.end_date);
                  return (
                    <tr key={con.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className="p-4 font-black text-slate-100">{con.employee_name}</td>
                      <td className="p-4 text-amber-300">{con.type}</td>
                      <td className="p-4 font-mono">{con.start_date}</td>
                      <td className="p-4 font-mono">
                        {con.end_date || "مفتوح"}
                        {alertInfo.alert && (
                          <span className={`block text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-1 w-max ${alertInfo.color}`}>
                            {alertInfo.text}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono">{con.basic_salary.toLocaleString()} ريال</td>
                      <td className="p-4 font-mono text-slate-400">
                        {con.housing_allowance} / {con.transport_allowance}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          con.status === "ساري" ? "bg-emerald-500/15 text-emerald-400" :
                          con.status === "مسودة" ? "bg-slate-800 text-slate-400" :
                          con.status === "منتهي" ? "bg-rose-500/10 text-rose-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {con.status}
                        </span>
                      </td>
                      <td className="p-4 text-left space-x-2 space-x-reverse">
                        <button
                          onClick={() => setPrintContract(con)}
                          className="text-amber-400 hover:text-amber-300 underline font-black"
                        >
                          نسخة الطباعة والتوقيع
                        </button>
                        {can("hr_contracts_add") && (
                          <button
                            onClick={() => setContractForm(con)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            تعديل
                          </button>
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

      {/* Third Tab: Custody */}
      {activeTab === "custody" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-black text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <span>عهد وأصول الموظفين (المسجلة بالشركة)</span>
            </h3>
            {can("hr_custody_add") && (
              <button
                onClick={() => setCustodyForm({})}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>تسليم عهدة جديدة لموظف</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-300 font-black border-b border-white/5">
                  <th className="p-4">اسم الموظف</th>
                  <th className="p-4">العهدة</th>
                  <th className="p-4">الرقم التسلسلي</th>
                  <th className="p-4">تاريخ التسليم</th>
                  <th className="p-4">المستلم بواسطة</th>
                  <th className="p-4">القيمة التقديرية</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left">خيارات الإرجاع</th>
                </tr>
              </thead>
              <tbody>
                {custodies.map((cust) => (
                  <tr key={cust.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="p-4 font-black text-slate-100">{cust.employee_name}</td>
                    <td className="p-4 text-amber-300">
                      <div>{cust.type}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{cust.description}</div>
                    </td>
                    <td className="p-4 font-mono">{cust.serial_no || "-"}</td>
                    <td className="p-4 font-mono">{cust.delivery_date}</td>
                    <td className="p-4">{cust.delivered_by || "الإدارة"}</td>
                    <td className="p-4 font-mono text-slate-400">{cust.value.toLocaleString()} ريال</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cust.status === "مستلمة" ? "bg-amber-500/15 text-amber-400 animate-pulse" :
                        cust.status === "مرتجعة" ? "bg-emerald-500/15 text-emerald-400" :
                        cust.status === "تالفة" ? "bg-rose-500/10 text-rose-400" :
                        "bg-red-500/15 text-red-500"
                      }`}>
                        {cust.status}
                      </span>
                    </td>
                    <td className="p-4 text-left">
                      {cust.status === "مستلمة" && can("hr_custody_return") ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const cond = prompt("يرجى إدخال حالة العهدة عند الاسترجاع:");
                              if (cond !== null) handleReturnCustody(cust.id, cond);
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-[10px]"
                          >
                            استرجاع العهدة
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("هل تريد اعتماد العهدة كـ تالفة/مفقودة من قبل صاحب الصلاحية؟")) {
                                await sb.from("hr_custody").update({ status: "تالفة" }).eq("id", cust.id);
                                loadAllData();
                              }
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 text-[10px]"
                          >
                            تالفة/مفقودة
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">تاريخ الإرجاع: {cust.return_date || "-"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fourth Tab: Daily Journals */}
      {activeTab === "journals" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-md font-black text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>يوميات وساعات عمل الموظفين والعمال</span>
            </h3>
            <div className="flex items-center gap-2">
              {can("hr_journals_add") && (
                <>
                  <button
                    onClick={() => {
                      setBatchProject("");
                      setBatchBranch("");
                      setBatchEntries([]);
                      setShowBatchModal(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span>إدخال جماعي لمجموعة عمال</span>
                  </button>
                  <button
                    onClick={() => setJournalForm({})}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل يومية منفردة</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-300 font-black border-b border-white/5">
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">الموظف/العامل</th>
                  <th className="p-4">المشروع/الفرع</th>
                  <th className="p-4">الأيام/الساعات</th>
                  <th className="p-4">إضافي (ساعة)</th>
                  <th className="p-4">إجمالي الاستحقاق</th>
                  <th className="p-4">المبلغ المدفوع</th>
                  <th className="p-4">طريقة الصرف</th>
                  <th className="p-4">سند الصرف</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left">الصرف والاعتماد</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((jour) => (
                  <tr key={jour.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="p-4 font-mono">{jour.date}</td>
                    <td className="p-4 font-black text-slate-100">{jour.employee_name}</td>
                    <td className="p-4 text-slate-400">{jour.project || "عام"}</td>
                    <td className="p-4 font-mono">
                      {jour.work_days > 0 ? `${jour.work_days} يوم` : `${jour.work_hours} ساعة`}
                    </td>
                    <td className="p-4 font-mono">{jour.overtime_hours || "-"}</td>
                    <td className="p-4 font-black text-amber-400 font-mono">{jour.total_entitled.toLocaleString()} ريال</td>
                    <td className="p-4 font-mono text-emerald-400">{jour.paid_amount.toLocaleString()} ريال</td>
                    <td className="p-4 text-[10px] text-slate-400">{jour.payment_method || "-"}</td>
                    <td className="p-4 font-mono text-[10px] text-amber-500 font-bold">{jour.voucher_no || "-"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        jour.status === "مدفوعة بالكامل" ? "bg-emerald-500/15 text-emerald-400" :
                        jour.status === "معتمدة" ? "bg-amber-500/10 text-amber-400" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {jour.status}
                      </span>
                    </td>
                    <td className="p-4 text-left space-x-1 space-x-reverse">
                      {jour.status === "مسودة" && can("hr_journals_approve") && (
                        <button
                          onClick={async () => {
                            await sb.from("hr_journals").update({ status: "معتمدة" }).eq("id", jour.id);
                            loadAllData();
                            showToast("تم اعتماد اليومية بنجاح");
                          }}
                          className="bg-amber-500 text-slate-950 px-2.5 py-1.5 rounded-lg text-[10px] font-black"
                        >
                          اعتماد
                        </button>
                      )}
                      {jour.status === "معتمدة" && can("hr_journals_pay") && (
                        <button
                          onClick={() => {
                            const tName = prompt("يرجى اختيار اسم الخزنة للصرف الفعلي (مثال: خزنة الشركة، خزنة التحصيل):");
                            if (tName) handlePayJournal(jour, tName);
                          }}
                          className="bg-emerald-500 text-slate-950 px-2.5 py-1.5 rounded-lg text-[10px] font-black"
                        >
                          صرف مالي
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fifth Tab: Deductions */}
      {activeTab === "deductions" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-black text-slate-100 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <span>الخصميات والجزاءات الإدارية والسلف</span>
            </h3>
            {can("hr_deductions_add") && (
              <button
                onClick={() => setDeductionForm({})}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة خصم أو جزاء جديد</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-white/5 text-slate-300 font-black border-b border-white/5">
                  <th className="p-4">اسم الموظف</th>
                  <th className="p-4">نوع الخصم</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4">الشهر المطبق</th>
                  <th className="p-4">السبب والبيان</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left">الاعتماد</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((ded) => (
                  <tr key={ded.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="p-4 font-black text-slate-100">{ded.employee_name}</td>
                    <td className="p-4 text-amber-300">{ded.type}</td>
                    <td className="p-4 font-mono">{ded.date}</td>
                    <td className="p-4 font-mono text-rose-400 font-black">{ded.amount.toLocaleString()} ريال</td>
                    <td className="p-4 font-mono">{ded.month_applied}</td>
                    <td className="p-4 text-slate-400">{ded.reason}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        ded.status === "معتمد" ? "bg-emerald-500/15 text-emerald-400" :
                        ded.status === "مسودة" ? "bg-slate-800 text-slate-400" :
                        "bg-rose-500/10 text-rose-400"
                      }`}>
                        {ded.status}
                      </span>
                    </td>
                    <td className="p-4 text-left">
                      {ded.status === "مسودة" && can("hr_deductions_approve") && (
                        <button
                          onClick={() => handleApproveDeduction(ded.id)}
                          className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg text-[10px] font-black"
                        >
                          اعتماد الخصم
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sixth Tab: Ledger */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-black text-amber-400">استعلام عن كشف حساب موظف تفصيلي</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الموظف</label>
                <select
                  value={ledgerEmployeeId}
                  onChange={(e) => setLedgerEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">اختر الموظف...</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employee_no})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handlePrint("ledger-print-area")}
                  disabled={!ledgerEmployeeId}
                  className="w-full bg-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  <span>عرض وطباعة كشف الحساب</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ledger View Card */}
          {ledgerEmployeeId && (() => {
            const leg = getEmployeeLedger(ledgerEmployeeId);
            if (!leg) return null;
            return (
              <div id="ledger-print-area" className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-6 text-right">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-md font-black text-white">{leg.employee.name}</h2>
                    <p className="text-xs text-amber-400 mt-1">{leg.employee.job_title} • رقم وظيفي: {leg.employee.employee_no}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">تاريخ المباشرة: {leg.employee.start_date}</p>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-300">كشف حساب موظف مالي</h3>
                    <p className="text-[9px] text-slate-500 mt-1">تاريخ الاستخراج: {new Date().toLocaleDateString("ar-EG")}</p>
                  </div>
                </div>

                {/* Account Balances Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="block text-[10px] text-slate-400">الراتب الأساسي + البدلات</span>
                    <b className="text-base text-white font-mono">{(leg.employee.basic_salary + leg.employee.allowances).toLocaleString()} ريال</b>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="block text-[10px] text-slate-400">إجمالي مستحقات اليوميات</span>
                    <b className="text-base text-amber-400 font-mono">{leg.totalJournalsEarned.toLocaleString()} ريال</b>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <span className="block text-[10px] text-slate-400">إجمالي الخصميات المعتمدة</span>
                    <b className="text-base text-rose-400 font-mono">{leg.totalDeductions.toLocaleString()} ريال</b>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                    <span className="block text-[10px] text-emerald-400">صافي المستحق (الرصيد المتبقي)</span>
                    <b className="text-base text-emerald-300 font-mono">{leg.finalBalance.toLocaleString()} ريال</b>
                  </div>
                </div>

                {/* Subsections: custody & active contracts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Custody list */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="text-xs font-black text-amber-300 border-b border-white/5 pb-2 mb-2">العهد المستلمة حالياً</h4>
                    {leg.empCustodies.filter(c => c.status === "مستلمة").length === 0 ? (
                      <p className="text-[10px] text-slate-500">لا يوجد عهد نشطة مستلمة.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {leg.empCustodies.filter(c => c.status === "مستلمة").map(c => (
                          <li key={c.id} className="flex justify-between">
                            <span>{c.type} ({c.description})</span>
                            <span className="text-amber-400 font-mono">{c.value.toLocaleString()} ريال</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Historical Contracts */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="text-xs font-black text-amber-300 border-b border-white/5 pb-2 mb-2">العقود والرواتب السابقة والحالية</h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {leg.empContracts.map(c => (
                        <li key={c.id} className="flex justify-between items-center">
                          <span>{c.type} ({c.start_date} - {c.end_date || "مفتوح"})</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] ${c.status === "ساري" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                            {c.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Seventh Tab: Reports */}
      {activeTab === "reports" && (
        <div className="space-y-8">
          {/* Bento-grid with 6 widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Widget 1: Employee summary */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-right space-y-4">
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>تقرير الموظفين والعمال الإجمالي</span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="block text-[10px] text-slate-500">على رأس العمل</span>
                  <b className="text-base text-emerald-400 font-mono">{employees.filter(e => e.status === "على رأس العمل").length}</b>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5">
                  <span className="block text-[10px] text-slate-500">إجمالي الموظفين</span>
                  <b className="text-base text-slate-200 font-mono">{employees.length}</b>
                </div>
              </div>
            </div>

            {/* Widget 2: Unreturned Custody */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-right space-y-4">
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>تقرير العهد غير المرتجعة</span>
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] text-slate-500">عهد قيد الاستلام</span>
                  <b className="text-base text-amber-400 font-mono">{custodies.filter(c => c.status === "مستلمة").length} عهدة</b>
                </div>
                <b className="text-xs text-slate-400">إجمالي عهد مرتجعة: {custodies.filter(c => c.status === "مرتجعة").length}</b>
              </div>
            </div>

            {/* Widget 3: Labor cost per project */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 text-right space-y-4">
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>تكلفة العمالة لكل مشروع (يوميات)</span>
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {projects.map(proj => {
                  const cost = journals
                    .filter(j => j.project === proj.name)
                    .reduce((sum, j) => sum + j.total_entitled, 0);
                  return (
                    <div key={proj.id} className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 truncate max-w-40">{proj.name}</span>
                      <b className="font-mono text-amber-300">{cost.toLocaleString()} ريال</b>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Full Profile Modal (ملف الموظف الكامل) */}
      {viewProfileId && (() => {
        const emp = employees.find(e => e.id === viewProfileId);
        if (!emp) return null;
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-right">
              <div className="flex justify-between items-start">
                <h3 className="text-md font-black text-amber-400 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>تفاصيل ملف الموظف الكامل: {emp.name}</span>
                </h3>
                <button
                  onClick={() => setViewProfileId(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Area */}
              <div id="full-profile-print" className="bg-slate-950 p-6 rounded-2xl border border-white/5 space-y-6 text-xs text-slate-300">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                    {emp.image_url ? (
                      <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-10 h-10 text-slate-500" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-black text-white">{emp.name}</h2>
                    <p className="text-xs text-amber-300">{emp.job_title} • رقم الموظف: {emp.employee_no}</p>
                    <p className="text-[10px] text-slate-400">حالة العمل: {emp.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <span className="block text-slate-500 text-[10px]">رقم الجوال</span>
                    <b className="text-white font-mono">{emp.phone}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">الجنسية</span>
                    <b className="text-white">{emp.nationality}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">رقم الهوية / الإقامة</span>
                    <b className="text-white font-mono">{emp.id_iqama}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">تاريخ المباشرة</span>
                    <b className="text-white font-mono">{emp.start_date}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">القسم الرئيسي</span>
                    <b className="text-white">{emp.department || "عام"}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">الفرع أو المشروع</span>
                    <b className="text-white">{emp.project || "عام"}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">طريقة احتساب الأجر</span>
                    <b className="text-white">{emp.payment_method === "monthly" ? "راتب شهري" : `يوميات (${emp.daily_rate} ريال)`}</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">الراتب الأساسي</span>
                    <b className="text-amber-300 font-mono">{emp.basic_salary.toLocaleString()} ريال</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">البدلات الإجمالية</span>
                    <b className="text-amber-300 font-mono">{emp.allowances.toLocaleString()} ريال</b>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px]">رقم الحساب البنكي</span>
                    <b className="text-white font-mono">{emp.bank_account || "-"}</b>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500 text-[10px]">الآيبان IBAN</span>
                    <b className="text-white font-mono">{emp.iban || "-"}</b>
                  </div>
                </div>

                {/* Outstanding Custody warning */}
                {custodies.filter(c => c.employee_id === emp.id && c.status === "مستلمة").length > 0 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl">
                    <h4 className="font-black text-xs">⚠️ عهد معلقة وغير مستردة من الموظف:</h4>
                    <ul className="list-disc pr-4 mt-2 space-y-1 text-[11px]">
                      {custodies.filter(c => c.employee_id === emp.id && c.status === "مستلمة").map(c => (
                        <li key={c.id}>
                          {c.type} ({c.description}) - تاريخ الاستلام: {c.delivery_date}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handlePrint("full-profile-print")}
                  className="bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة ملف الموظف الكامل</span>
                </button>
                <button
                  onClick={() => setViewProfileId(null)}
                  className="bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Contract Print Modal */}
      {printContract && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 text-right">
            <div className="flex justify-between items-start">
              <h3 className="text-md font-black text-amber-400">عقد عمل قانوني موحد</h3>
              <button onClick={() => setPrintContract(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Area */}
            <div id="contract-print-area" className="bg-white text-slate-950 p-8 rounded-2xl space-y-6 text-xs text-right leading-relaxed border border-slate-300">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h2 className="text-lg font-black">عقد عمل موحد متعدد الفروع</h2>
                <p className="text-[10px] font-bold mt-1">شركة عرب وورلد للمقاولات العامة والتقسيط</p>
              </div>

              <p className="font-bold">
                إنه في يوم: {printContract.start_date}، تم الاتفاق والتعاقد بين الطرفين:
              </p>
              <div className="mr-4 space-y-1">
                <p><b>الطرف الأول:</b> شركة عرب وورلد المحدودة ويُمثلها المدير العام.</p>
                <p><b>الطرف الثاني الموظف/العامل:</b> السيد/ة {printContract.employee_name}، ويحمل هوية/إقامة رقم: {employees.find(e => e.id === printContract.employee_id)?.id_iqama || ""}.</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-black border-b border-slate-300 pb-1">البند الأول: طبيعة العمل والموقع</h3>
                <p>يوافق الطرف الثاني على العمل بمسمى وظيفي <b>{employees.find(e => e.id === printContract.employee_id)?.job_title || ""}</b>، وتحت إدارة وإشراف الطرف الأول في فرع/مشروع {printContract.project_branch || "المشروع الجاري"}.</p>

                <h3 className="font-black border-b border-slate-300 pb-1">البند الثاني: الراتب والبدلات المالية</h3>
                <p>يستحق الطرف الثاني لقاء عمله راتباً أساسياً قدره <b>{printContract.basic_salary.toLocaleString()} ريال سعودي</b> شهرياً، بالإضافة لبدل سكن <b>{printContract.housing_allowance.toLocaleString()} ريال</b>، وبدل نقل <b>{printContract.transport_allowance.toLocaleString()} ريال</b>.</p>

                <h3 className="font-black border-b border-slate-300 pb-1">البند الثالث: شروط وإحكام خاصة</h3>
                <p className="whitespace-pre-line">{printContract.conditions || "يلتزم الموظف بلوائح العمل والتعليمات الداخلية للشركة والحفاظ على الممتلكات والعهد."}</p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center font-bold border-t border-slate-300 mt-12">
                <div>
                  <p>الطرف الأول (صاحب العمل)</p>
                  <p className="mt-8">التوقيع والختم: ..........................</p>
                </div>
                <div>
                  <p>الطرف الثاني (الموظف)</p>
                  <p className="mt-8">التوقيع والختم: ..........................</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handlePrint("contract-print-area")}
                className="bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة وتوقيع العقد</span>
              </button>
              <button
                onClick={() => setPrintContract(null)}
                className="bg-white/5 border border-white/5 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Add/Edit Modal */}
      {employeeForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveEmployee} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 text-right">
            <h3 className="text-md font-black text-amber-400">
              {employeeForm.id ? "تعديل ملف الموظف" : "إضافة موظف جديد للمنظومة"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الاسم الكامل للموظف *</label>
                <input
                  type="text"
                  required
                  value={employeeForm.name || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">رقم الهوية الوطنية أو الإقامة *</label>
                <input
                  type="text"
                  required
                  value={employeeForm.id_iqama || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, id_iqama: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">المسمى الوظيفي</label>
                <input
                  type="text"
                  value={employeeForm.job_title || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, job_title: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">القسم الداخلي</label>
                <input
                  type="text"
                  value={employeeForm.department || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">المشروع النشط / الفرع</label>
                <select
                  value={employeeForm.project || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, project: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">عام</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">تاريخ المباشرة للعمل</label>
                <input
                  type="date"
                  value={employeeForm.start_date || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, start_date: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الراتب الأساسي شهرياً</label>
                <input
                  type="number"
                  value={employeeForm.basic_salary || 0}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, basic_salary: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">البدلات المالية شهرياً</label>
                <input
                  type="number"
                  value={employeeForm.allowances || 0}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, allowances: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">رقم الجوال *</label>
                <input
                  type="text"
                  required
                  value={employeeForm.phone || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الجنسية</label>
                <input
                  type="text"
                  value={employeeForm.nationality || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, nationality: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">طريقة احتساب الأجر</label>
                <select
                  value={employeeForm.payment_method || "monthly"}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, payment_method: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="monthly">راتب شهري</option>
                  <option value="daily">يوميات</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">قيمة اليومية (لعمال اليوميات)</label>
                <input
                  type="number"
                  value={employeeForm.daily_rate || 0}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, daily_rate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">رقم الحساب البنكي</label>
                <input
                  type="text"
                  value={employeeForm.bank_account || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">رقم الآيبان الدولي IBAN</label>
                <input
                  type="text"
                  value={employeeForm.iban || ""}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, iban: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 mb-1">صورة الموظف والمرفقات</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    className="text-xs text-slate-400"
                  />
                  {employeeForm.image_url && (
                    <img src={employeeForm.image_url} alt="Profile Preview" className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg"
              >
                حفظ الملف
              </button>
              <button
                type="button"
                onClick={() => setEmployeeForm(null)}
                className="bg-white/5 border border-white/5 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contract Add/Edit Modal */}
      {contractForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveContract} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 text-right">
            <h3 className="text-md font-black text-amber-400">تحرير عقد عمل جديد</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الموظف المعني بالعقد *</label>
                <select
                  required
                  value={contractForm.employee_id || ""}
                  onChange={(e) => setContractForm({ ...contractForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">اختر موظف...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">نوع العقد عمل *</label>
                <select
                  required
                  value={contractForm.type || "محدد المدة"}
                  onChange={(e) => setContractForm({ ...contractForm, type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="محدد المدة">محدد المدة</option>
                  <option value="غير محدد المدة">غير محدد المدة</option>
                  <option value="عقد يوميات">عقد يوميات</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">تاريخ بداية العقد *</label>
                <input
                  type="date"
                  required
                  value={contractForm.start_date || ""}
                  onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">تاريخ انتهاء العقد</label>
                <input
                  type="date"
                  value={contractForm.end_date || ""}
                  onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الراتب الأساسي بالعقد</label>
                <input
                  type="number"
                  value={contractForm.basic_salary || 0}
                  onChange={(e) => setContractForm({ ...contractForm, basic_salary: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">بدل سكن</label>
                <input
                  type="number"
                  value={contractForm.housing_allowance || 0}
                  onChange={(e) => setContractForm({ ...contractForm, housing_allowance: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">بدل نقل</label>
                <input
                  type="number"
                  value={contractForm.transport_allowance || 0}
                  onChange={(e) => setContractForm({ ...contractForm, transport_allowance: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الفرع أو الموقع</label>
                <input
                  type="text"
                  value={contractForm.project_branch || ""}
                  onChange={(e) => setContractForm({ ...contractForm, project_branch: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-slate-400 mb-1">الشروط والأحكام الخاصة بالعقد</label>
                <textarea
                  value={contractForm.conditions || ""}
                  onChange={(e) => setContractForm({ ...contractForm, conditions: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  placeholder="مثال: يلتزم الطرف الثاني بلوائح العمل والمحافظة على ممتلكات..."
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">حالة تفعيل العقد *</label>
                <select
                  required
                  value={contractForm.status || "مسودة"}
                  onChange={(e) => setContractForm({ ...contractForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-black"
                >
                  <option value="مسودة">مسودة العقد</option>
                  <option value="ساري">ساري ومعتمد</option>
                  <option value="منتهي">منتهي</option>
                  <option value="ملغي">ملغي</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg"
              >
                حفظ العقد
              </button>
              <button
                type="button"
                onClick={() => setContractForm(null)}
                className="bg-white/5 border border-white/5 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custody Add Modal */}
      {custodyForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveCustody} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-right">
            <h3 className="text-md font-black text-amber-400">تسليم عهدة وممتلكات شركة</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الموظف المستلم *</label>
                <select
                  required
                  value={custodyForm.employee_id || ""}
                  onChange={(e) => setCustodyForm({ ...custodyForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">اختر موظف...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-amber-400 font-bold mb-1 flex items-center gap-1">
                  <span>اختر من أصول وممتلكات الشركة المتاحة (لتعبئة البيانات تلقائياً)</span>
                  <span className="text-[9px] text-slate-500 font-medium">(أصول نشطة وغير مسلّمة كعهدة حالية)</span>
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const asset = companyAssets.find(a => a.id === selectedId);
                    if (asset) {
                      let mappedType = "أخرى";
                      if (asset.type === "vehicle") mappedType = "سيارة";
                      else if (asset.type === "equipment") mappedType = "معدات";
                      
                      setCustodyForm({
                        ...custodyForm,
                        type: mappedType,
                        description: `${asset.name} ${asset.model ? `(موديل: ${asset.model})` : ""}`.trim(),
                        serial_no: asset.plate_number_or_title || "",
                        value: asset.purchase_value || 0,
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-amber-500/20 hover:border-amber-500/50 px-4 py-2.5 rounded-xl text-xs text-amber-200 outline-none transition-all cursor-pointer font-bold"
                >
                  <option value="" className="text-slate-400">-- اختر من ممتلكات الشركة النشطة والمتاحة حالياً --</option>
                  {companyAssets
                    .filter(asset => {
                      // 1. Must be active status
                      if (asset.status !== "active") return false;

                      // 2. Must not be currently assigned (held custody with status "مستلمة")
                      const isAssigned = custodies.some(c => 
                        c.status === "مستلمة" && 
                        c.serial_no && 
                        asset.plate_number_or_title && 
                        c.serial_no.trim().toLowerCase() === asset.plate_number_or_title.trim().toLowerCase()
                      );
                      return !isAssigned;
                    })
                    .map(asset => {
                      let typeLabel = "أصل";
                      if (asset.type === "vehicle") typeLabel = "سيارة";
                      else if (asset.type === "real_estate") typeLabel = "عقار";
                      else if (asset.type === "equipment") typeLabel = "معدات/أجهزة";

                      return (
                        <option key={asset.id} value={asset.id} className="text-white">
                          {asset.name} {asset.model ? `(${asset.model})` : ""} {asset.plate_number_or_title ? `[رقم/لوحة: ${asset.plate_number_or_title}]` : ""} - {typeLabel}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">نوع العهدة المسلمة *</label>
                <select
                  required
                  value={custodyForm.type || "سيارة"}
                  onChange={(e) => setCustodyForm({ ...custodyForm, type: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="سيارة">سيارة تابعة للمؤسسة</option>
                  <option value="جوال">جوال عمل</option>
                  <option value="جهاز كمبيوتر">جهاز كمبيوتر / لابتوب</option>
                  <option value="أدوات">حقيبة أدوات عمل</option>
                  <option value="ملابس عمل">ملابس ومهمات سلامة</option>
                  <option value="معدات">معدات ثقيلة أو ميكانيكية</option>
                  <option value="مبلغ مالي">مبلغ عهدة مالي</option>
                  <option value="سلفة عهدة">سلفة عهدة مؤقتة</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">وصف تفصيلي والبيان</label>
                <textarea
                  value={custodyForm.description || ""}
                  onChange={(e) => setCustodyForm({ ...custodyForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  rows={2}
                  placeholder="مثال: لابتوب ديل أسود سيريال رقم..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">الرقم التسلسلي</label>
                  <input
                    type="text"
                    value={custodyForm.serial_no || ""}
                    onChange={(e) => setCustodyForm({ ...custodyForm, serial_no: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">القيمة التقديرية</label>
                  <input
                    type="number"
                    value={custodyForm.value || 0}
                    onChange={(e) => setCustodyForm({ ...custodyForm, value: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">تاريخ التسليم *</label>
                  <input
                    type="date"
                    required
                    value={custodyForm.delivery_date || ""}
                    onChange={(e) => setCustodyForm({ ...custodyForm, delivery_date: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">حالة العهدة عند التسليم</label>
                  <input
                    type="text"
                    value={custodyForm.delivery_condition || "جديدة ومكتملة"}
                    onChange={(e) => setCustodyForm({ ...custodyForm, delivery_condition: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">اسم المسؤول عن التسليم</label>
                <input
                  type="text"
                  value={custodyForm.delivered_by || currentUser?.name || ""}
                  onChange={(e) => setCustodyForm({ ...custodyForm, delivered_by: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg"
              >
                تسليم العهدة
              </button>
              <button
                type="button"
                onClick={() => setCustodyForm(null)}
                className="bg-white/5 border border-white/5 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Logs Modal (إدخال جماعي) */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4 text-right">
            <h3 className="text-md font-black text-amber-400">إدخال جماعي ليوميات العمال والموظفين بالشركة</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">التاريخ الموحد *</label>
                <input
                  type="date"
                  required
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">المشروع المستهدف *</label>
                <select
                  required
                  value={batchProject}
                  onChange={(e) => setBatchProject(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">اختر المشروع...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الفرع</label>
                <input
                  type="text"
                  value={batchBranch}
                  onChange={(e) => setBatchBranch(e.target.value)}
                  placeholder="مثال: الرياض"
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Selector list of active workers inside company */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <h4 className="text-xs font-black text-slate-200">العمال المستهدفين للتسجيل في الدفعة</h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {employees.filter(e => e.status === "على رأس العمل").map(emp => {
                  const entry = batchEntries.find(ent => ent.employeeId === emp.id);
                  const isChecked = !!entry;

                  return (
                    <div key={emp.id} className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBatchEntries([...batchEntries, { employeeId: emp.id, workDays: 1, workHours: 8, overtimeHours: 0, notes: "" }]);
                            } else {
                              setBatchEntries(batchEntries.filter(ent => ent.employeeId !== emp.id));
                            }
                          }}
                          className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 accent-amber-500"
                        />
                        <div>
                          <span className="block text-xs font-black text-slate-100">{emp.name}</span>
                          <span className="block text-[9px] text-amber-400">{emp.job_title} • الراتب اليومي: {emp.daily_rate} ريال</span>
                        </div>
                      </div>

                      {isChecked && (
                        <div className="flex items-center gap-3">
                          <div className="w-20">
                            <label className="block text-[8px] text-slate-400">أيام العمل</label>
                            <input
                              type="number"
                              min={1}
                              value={batchEntries.find(ent => ent.employeeId === emp.id)?.workDays || 1}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBatchEntries(batchEntries.map(ent => ent.employeeId === emp.id ? { ...ent, workDays: val } : ent));
                              }}
                              className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs text-white outline-none font-mono"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-[8px] text-slate-400">إضافي (ساعات)</label>
                            <input
                              type="number"
                              min={0}
                              value={batchEntries.find(ent => ent.employeeId === emp.id)?.overtimeHours || 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setBatchEntries(batchEntries.map(ent => ent.employeeId === emp.id ? { ...ent, overtimeHours: val } : ent));
                              }}
                              className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs text-white outline-none font-mono"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[8px] text-slate-400">ملاحظات</label>
                            <input
                              type="text"
                              value={batchEntries.find(ent => ent.employeeId === emp.id)?.notes || ""}
                              onChange={(e) => {
                                setBatchEntries(batchEntries.map(ent => ent.employeeId === emp.id ? { ...ent, notes: e.target.value } : ent));
                              }}
                              placeholder="بيان يومية..."
                              className="w-full bg-slate-950 border border-white/5 px-2 py-1 rounded text-xs text-white outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                onClick={handleSaveBatchJournals}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg"
              >
                اعتماد وتسجيل الدفعة بالكامل
              </button>
              <button
                onClick={() => setShowBatchModal(false)}
                className="bg-white/5 border border-white/5 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Journal Modal */}
      {journalForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveJournal} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-right">
            <h3 className="text-md font-black text-amber-400">تسجيل يومية منفردة لموظف</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الموظف / العامل *</label>
                <select
                  required
                  value={journalForm.employee_id || ""}
                  onChange={(e) => {
                    const emp = employees.find(x => x.id === e.target.value);
                    setJournalForm({
                      ...journalForm,
                      employee_id: e.target.value,
                      daily_rate: emp?.daily_rate || 0,
                      work_days: emp?.payment_method === "daily" ? 1 : 0,
                      work_hours: emp?.payment_method === "daily" ? 8 : 0,
                    });
                  }}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">اختر...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={journalForm.date || ""}
                    onChange={(e) => setJournalForm({ ...journalForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">المشروع</label>
                  <select
                    value={journalForm.project || ""}
                    onChange={(e) => setJournalForm({ ...journalForm, project: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="">عام</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">أيام العمل</label>
                  <input
                    type="number"
                    value={journalForm.work_days || 0}
                    onChange={(e) => setJournalForm({ ...journalForm, work_days: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">قيمة اليومية</label>
                  <input
                    type="number"
                    value={journalForm.daily_rate || 0}
                    onChange={(e) => setJournalForm({ ...journalForm, daily_rate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">ساعات عمل إضافية</label>
                  <input
                    type="number"
                    value={journalForm.overtime_hours || 0}
                    onChange={(e) => setJournalForm({ ...journalForm, overtime_hours: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
              <div className="text-xs text-amber-400 font-bold bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                إجمالي الاستحقاق التقريبي: {calculateJournalTotal(journalForm).toLocaleString()} ريال
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg"
              >
                تسجيل اليومية
              </button>
              <button
                type="button"
                onClick={() => setJournalForm(null)}
                className="bg-white/5 border border-white/5 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deduction Add Modal */}
      {deductionForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveDeduction} className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-right">
            <h3 className="text-md font-black text-rose-400">تسجيل خصم مالي / جزاء إداري</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">الموظف *</label>
                <select
                  required
                  value={deductionForm.employee_id || ""}
                  onChange={(e) => setDeductionForm({ ...deductionForm, employee_id: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">اختر...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">نوع الخصم والجزاء *</label>
                  <select
                    required
                    value={deductionForm.type || "غياب"}
                    onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="غياب">غياب بدون عذر</option>
                    <option value="تأخير">تأخير ساعات عمل</option>
                    <option value="سلفة">خصم قسط سلفة مالي</option>
                    <option value="مخالفة">مخالفة إدارية</option>
                    <option value="تلف عهدة">تلف عهدة</option>
                    <option value="فقد عهدة">فقد عهدة</option>
                    <option value="خصم إداري">خصم إداري مباشر</option>
                    <option value="خصم يوم">خصم يوم كامل</option>
                    <option value="خصم ساعات">خصم ساعات محددة</option>
                    <option value="خصم مخصص">خصم مخصص آخر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">تاريخ الخصم *</label>
                  <input
                    type="date"
                    required
                    value={deductionForm.date || ""}
                    onChange={(e) => setDeductionForm({ ...deductionForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">مبلغ الخصم الفعلي *</label>
                  <input
                    type="number"
                    required
                    value={deductionForm.amount || 0}
                    onChange={(e) => setDeductionForm({ ...deductionForm, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">الشهر المستهدف للتطبيق (مثال: 2026-07) *</label>
                  <input
                    type="month"
                    required
                    value={deductionForm.month_applied || ""}
                    onChange={(e) => setDeductionForm({ ...deductionForm, month_applied: e.target.value })}
                    className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">سبب الخصم والبيان</label>
                <textarea
                  value={deductionForm.reason || ""}
                  onChange={(e) => setDeductionForm({ ...deductionForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs text-white outline-none"
                  rows={2}
                  placeholder="مثال: خصم لتكرار التأخر الصباحي بدون عذر..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
              <button
                type="submit"
                className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg"
              >
                تسجيل الخصم
              </button>
              <button
                type="button"
                onClick={() => setDeductionForm(null)}
                className="bg-white/5 border border-white/5 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-black"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
