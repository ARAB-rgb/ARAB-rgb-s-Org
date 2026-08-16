/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Plus, Search, User, Phone, MapPin, ClipboardList, Shield,
  Printer, Trash2, Edit2, FileText, CheckCircle, AlertTriangle, Eye, X, Globe,
  RotateCw, RefreshCw, CalendarCheck
} from "lucide-react";
import { Installment, Project, User as AuthUser, Company, Worker } from "../types";
import {
  getContractTiming, awExtractRegion, awCleanNotes, generateNextNo, awExtractTreasury,
  awExtractCapital, awExtractCapitalSource, awExtractCapitalCompany, awExtractCapitalCollection,
  awExtractCapitalSplit, awExtractCycle, awExtractClassification, awExtractContractDirection,
  awExtractWorkerId, awExtractProjectId, awExtractDownPayment, awExtractRenewedFrom
} from "../db";
import { safeStorage } from "../safeStorage";

const localStorage = safeStorage;

interface InstallmentsProps {
  currentUser: AuthUser | null;
  activePerms?: any;
  installments: Installment[];
  projects: Project[];
  workers?: Worker[];
  onSaveInstallment: (row: any, editId: string | null) => Promise<boolean>;
  onDeleteInstallment: (id: string) => void;
  onPrintContract: (id: string) => void;
  onMigrateInstallment?: (installmentId: string, targetCompanyId: string, reason?: string) => Promise<boolean>;
  onCreateReceiptForContract?: (installment: Installment) => void;
  receipts: any[];
  companies?: Company[];
  selectedCompanyId?: string;
}

const getStoredTreasuries = (companyId?: string | null, companiesList?: Company[]): string[] => {
  const defaults = ["خزنة الشركة", "خزنة التحصيل", "خزنة التحويل", "نقاط البيع", "خزنة المقاولات"];
  
  if (companyId && companyId !== "all" && companiesList) {
    const matched = companiesList.find(c => c.id === companyId);
    if (matched && matched.treasuries && Array.isArray(matched.treasuries)) {
      const merged = [...matched.treasuries];
      defaults.forEach(d => {
        if (!merged.includes(d)) {
          merged.push(d);
        }
      });
      return merged;
    }
  }

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

export const Installments: React.FC<InstallmentsProps> = ({
  currentUser,
  activePerms,
  installments,
  projects,
  workers,
  onSaveInstallment,
  onDeleteInstallment,
  onPrintContract,
  onMigrateInstallment,
  onCreateReceiptForContract,
  receipts,
  companies,
  selectedCompanyId,
}) => {
  const finalPerms = activePerms || currentUser?.perms || {};
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [client, setClient] = useState("");
  const [contractType, setContractType] = useState<string>("تقسيط");
  const [contractDirection, setContractDirection] = useState<"لنا" | "علينا" | "مصروفات عمالة">("لنا");
  const [linkedWorkerId, setLinkedWorkerId] = useState<string>("");
  const [linkedProjectId, setLinkedProjectId] = useState<string>("");
  const [installmentCycle, setInstallmentCycle] = useState<string>("يومي");
  const [classification, setClassification] = useState<string>("مدين");
  const [identity, setIdentity] = useState("");
  const [nationality, setNationality] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [paid, setPaid] = useState<number | "">("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [periods, setPeriods] = useState<number | "">("");
  const [installment, setInstallment] = useState<number | "">("");
  const [discount, setDiscount] = useState<number | "">("");
  const [afterDiscount, setAfterDiscount] = useState<number | " text">("");
  const [projectSug, setProjectSug] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [guarantor, setGuarantor] = useState("");
  const [status, setStatus] = useState<"منتظم" | "متأخر" | "متعثر" | "مكتمل">("منتظم");
  const [notes, setNotes] = useState("");
  const [treasury, setTreasury] = useState("خزنة التحصيل");
  const [capital, setCapital] = useState<number | "">("");
  const [capitalSource, setCapitalSource] = useState<string>("خزنة الشركة");
  const [capitalCompany, setCapitalCompany] = useState<number | "">("");
  const [capitalCollection, setCapitalCollection] = useState<number | "">("");
  const [capitalSplits, setCapitalSplits] = useState<Record<string, number | "">>({});
  const [installmentCompanyId, setInstallmentCompanyId] = useState("");
  const [dynamicTreasuries, setDynamicTreasuries] = useState<string[]>(() => 
    getStoredTreasuries(installmentCompanyId || selectedCompanyId, companies)
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setDynamicTreasuries(getStoredTreasuries(installmentCompanyId || selectedCompanyId, companies));
    };
    window.addEventListener("storage", handleStorageChange);
    handleStorageChange();
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [installmentCompanyId, selectedCompanyId, companies]);
  const [isCapitalManuallyEdited, setIsCapitalManuallyEdited] = useState(false);

  // Confirmation Modal states before saving contract
  const [pendingContractRow, setPendingContractRow] = useState<any | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSavingContract, setIsSavingContract] = useState(false);

  // Sync selected company when not in edit mode
  useEffect(() => {
    if (!editId) {
      setInstallmentCompanyId(selectedCompanyId !== "all" ? (selectedCompanyId || "") : "");
    }
  }, [selectedCompanyId, editId]);

  // Keep capitalCompany and capitalCollection synced with capitalSplits for backward compatibility & legacy code
  useEffect(() => {
    setCapitalCompany(capitalSplits["خزنة الشركة"] || "");
    setCapitalCollection(capitalSplits["خزنة التحصيل"] || "");
  }, [capitalSplits]);

  // Capital reactive sync / default computation
  useEffect(() => {
    if (editId || isCapitalManuallyEdited) return;
    
    // Auto populate capital based on amount and paid (The reactive feature)
    const calculatedCapital = Math.max(0, Number(amount || 0) - Number(paid || 0));
    if (calculatedCapital > 0) {
      if (capitalSource === "كلاهما") {
        const count = dynamicTreasuries.length || 2;
        const perSafe = Math.round(calculatedCapital / count);
        const newSplits: Record<string, number | ""> = {};
        dynamicTreasuries.forEach(tName => {
          newSplits[tName] = perSafe;
        });
        setCapitalSplits(newSplits);
        setCapital("");
      } else {
        setCapital(calculatedCapital);
        setCapitalSplits({});
      }
    } else {
      setCapital("");
      setCapitalSplits({});
    }
  }, [amount, paid, capitalSource, editId, isCapitalManuallyEdited, dynamicTreasuries]);

  const handleCapitalSourceChange = (newSource: string) => {
    setCapitalSource(newSource);
    
    // Convert / transfer existing values seamlessly
    if (newSource === "كلاهما") {
      const currentTotal = Number(capital || 0);
      if (currentTotal > 0) {
        const count = dynamicTreasuries.length || 2;
        const perSafe = Math.round(currentTotal / count);
        const newSplits: Record<string, number | ""> = {};
        dynamicTreasuries.forEach(tName => {
          newSplits[tName] = perSafe;
        });
        setCapitalSplits(newSplits);
      } else {
        setCapitalSplits({});
      }
      setCapital("");
    } else {
      const totalSplits = Object.values(capitalSplits).reduce<number>((sum, val) => sum + Number(val || 0), 0);
      if (totalSplits > 0) {
        setCapital(totalSplits);
      }
      setCapitalSplits({});
    }
  };

  const handleCapitalChange = (val: string) => {
    setCapital(val ? Number(val) : "");
    setIsCapitalManuallyEdited(true);
  };

  const handleCapitalCompanyChange = (val: string) => {
    setCapitalCompany(val ? Number(val) : "");
    setIsCapitalManuallyEdited(true);
  };

  const handleCapitalCollectionChange = (val: string) => {
    setCapitalCollection(val ? Number(val) : "");
    setIsCapitalManuallyEdited(true);
  };

  // Filters State
  const [qSearch, setQSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fClassification, setFClassification] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fNationality, setFNationality] = useState("");
  const [fProject, setFProject] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fSort, setFSort] = useState("date_desc");

  // Contract Renewal State
  const [renewTarget, setRenewTarget] = useState<Installment | null>(null);
  const [renewMode, setRenewMode] = useState<"new_contract" | "extend_contract">("new_contract");
  const [renewNewContractNo, setRenewNewContractNo] = useState<string>("");
  const [renewStartDate, setRenewStartDate] = useState<string>("");
  const [renewPeriods, setRenewPeriods] = useState<string>("30");
  const [renewCycle, setRenewCycle] = useState<string>("يومي");
  const [renewAmount, setRenewAmount] = useState<string>("");
  const [renewDownPayment, setRenewDownPayment] = useState<string>("0");
  const [renewIncludeRemaining, setRenewIncludeRemaining] = useState<boolean>(false);
  const [renewDiscount, setRenewDiscount] = useState<string>("0");
  const [renewNotes, setRenewNotes] = useState<string>("");
  const [renewCloseOld, setRenewCloseOld] = useState<boolean>(true);
  const [isRenewing, setIsRenewing] = useState<boolean>(false);

  const openRenewModal = (c: Installment) => {
    setRenewTarget(c);
    setRenewMode("new_contract");
    const nextNo = generateNextNo("AW-CON", installments, "no");
    setRenewNewContractNo(nextNo);

    // Compute start date: if contract has end_date, start from next day or today
    let defaultStart = new Date().toISOString().slice(0, 10);
    if (c.end_date) {
      const endDateObj = new Date(c.end_date);
      if (!isNaN(endDateObj.getTime())) {
        endDateObj.setDate(endDateObj.getDate() + 1);
        defaultStart = endDateObj.toISOString().slice(0, 10);
      }
    }
    setRenewStartDate(defaultStart);

    const oldPeriods = c.periods ? String(c.periods) : "30";
    setRenewPeriods(oldPeriods);

    const oldCycle = awExtractCycle(c.notes || "") || "يومي";
    setRenewCycle(oldCycle);

    setRenewAmount(c.amount ? String(c.amount) : "");
    setRenewDownPayment("0");
    setRenewIncludeRemaining(false);
    setRenewDiscount("0");
    setRenewNotes(`تجديد وتمديد للعقد السابق (${c.no})`);
    setRenewCloseOld(true);
  };

  const handleExecuteRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewTarget) return;

    setIsRenewing(true);
    try {
      const periodsNum = Number(renewPeriods || 0);
      const baseAmount = Number(renewAmount || 0);
      const remainingToAdd = renewIncludeRemaining ? Number(renewTarget.remaining || 0) : 0;
      const totalAmount = baseAmount + remainingToAdd;
      const downPaymentNum = Number(renewDownPayment || 0);
      const discountNum = Number(renewDiscount || 0);
      const finalRemaining = Math.max(0, totalAmount - downPaymentNum - discountNum);
      const installmentVal = periodsNum > 0 ? Math.ceil(finalRemaining / periodsNum) : 0;

      // Calculate end date
      let calcEndDate = "";
      if (periodsNum > 0 && renewStartDate) {
        const d = new Date(renewStartDate);
        if (renewCycle === "اسبوعي") {
          d.setDate(d.getDate() + (periodsNum * 7) - 1);
        } else if (renewCycle === "نصف شهر") {
          d.setDate(d.getDate() + (periodsNum * 15) - 1);
        } else if (renewCycle === "شهري") {
          d.setMonth(d.getMonth() + periodsNum);
          d.setDate(d.getDate() - 1);
        } else {
          d.setDate(d.getDate() + periodsNum - 1);
        }
        calcEndDate = d.toISOString().slice(0, 10);
      }

      if (renewMode === "new_contract") {
        let finalNo = (renewNewContractNo || generateNextNo("AW-CON", installments, "no")).trim().toUpperCase();
        const isDup = installments.some(
          (i) => String(i.no || "").trim().toUpperCase() === finalNo
        );
        if (isDup) {
          finalNo = generateNextNo("AW-CON", installments, "no");
        }

        const newRow = {
          client: renewTarget.client,
          identity: renewTarget.identity || "",
          nationality: renewTarget.nationality || "",
          phone: renewTarget.phone || "",
          no: finalNo,
          amount: totalAmount,
          paid: downPaymentNum,
          remaining: finalRemaining,
          type: renewTarget.type || "تقسيط",
          start_date: renewStartDate,
          end_date: calcEndDate,
          periods: periodsNum,
          installment: installmentVal,
          discount: discountNum,
          after_discount: finalRemaining,
          project: renewTarget.project || "",
          workplace: renewTarget.workplace || "",
          guarantor: renewTarget.guarantor || "",
          status: "منتظم",
          notes: renewNotes.trim(),
          region_input: awExtractRegion(renewTarget.notes || "") || (finalPerms?.region || ""),
          treasury_input: awExtractTreasury(renewTarget.notes || "") || "خزنة التحصيل",
          cycle_input: renewCycle,
          classification_input: awExtractClassification(renewTarget.notes || "") || "مدين",
          contract_direction_input: (renewTarget.contract_direction as any) || awExtractContractDirection(renewTarget.notes || "") || "لنا",
          worker_id_input: renewTarget.worker_id || awExtractWorkerId(renewTarget.notes || "") || "",
          project_id_input: renewTarget.project_id || awExtractProjectId(renewTarget.notes || "") || "",
          renewed_from_input: renewTarget.no,
          capital_input: 0,
          capital_source_input: "",
          capital_company_input: 0,
          capital_collection_input: 0,
          capital_splits_input: {},
          company_id: renewTarget.company_id || undefined,
        };

        const success = await onSaveInstallment(newRow, null);
        if (success) {
          if (renewCloseOld) {
            const oldRowUpdated = {
              ...renewTarget,
              status: "مكتمل",
              region_input: awExtractRegion(renewTarget.notes || ""),
              treasury_input: awExtractTreasury(renewTarget.notes || ""),
              cycle_input: awExtractCycle(renewTarget.notes || ""),
              classification_input: awExtractClassification(renewTarget.notes || ""),
              contract_direction_input: renewTarget.contract_direction || awExtractContractDirection(renewTarget.notes || ""),
              worker_id_input: renewTarget.worker_id || awExtractWorkerId(renewTarget.notes || ""),
              project_id_input: renewTarget.project_id || awExtractProjectId(renewTarget.notes || ""),
            };
            await onSaveInstallment(oldRowUpdated, renewTarget.id);
          }
          setRenewTarget(null);
          if (selectedFileContract) {
            setSelectedFileContract(null);
          }
        }
      } else {
        // Extend existing contract
        const updatedPeriods = Number(renewTarget.periods || 0) + periodsNum;
        const updatedAmount = Number(renewTarget.amount || 0) + baseAmount;
        const updatedRemaining = Math.max(0, updatedAmount - Number(renewTarget.paid || 0) - discountNum);
        const updatedInstallmentVal = updatedPeriods > 0 ? Math.ceil(updatedRemaining / updatedPeriods) : 0;

        const updatedRow = {
          ...renewTarget,
          amount: updatedAmount,
          remaining: updatedRemaining,
          periods: updatedPeriods,
          installment: updatedInstallmentVal,
          end_date: calcEndDate || renewTarget.end_date,
          status: "منتظم",
          notes: `${awCleanNotes(renewTarget.notes || "")} | تم تمديد وتجديد العقد بتاريخ ${renewStartDate}`,
          region_input: awExtractRegion(renewTarget.notes || ""),
          treasury_input: awExtractTreasury(renewTarget.notes || ""),
          cycle_input: renewCycle,
          classification_input: awExtractClassification(renewTarget.notes || ""),
          contract_direction_input: renewTarget.contract_direction || awExtractContractDirection(renewTarget.notes || ""),
          worker_id_input: renewTarget.worker_id || awExtractWorkerId(renewTarget.notes || ""),
          project_id_input: renewTarget.project_id || awExtractProjectId(renewTarget.notes || ""),
        };

        const success = await onSaveInstallment(updatedRow, renewTarget.id);
        if (success) {
          setRenewTarget(null);
          if (selectedFileContract) {
            setSelectedFileContract(null);
          }
        }
      }
    } finally {
      setIsRenewing(false);
    }
  };

  // Modal Detail State
  const [selectedFileContract, setSelectedFileContract] = useState<Installment | null>(null);

  useEffect(() => {
    if (selectedFileContract) {
      const updated = installments.find((i) => i.id === selectedFileContract.id);
      if (updated) {
        setSelectedFileContract(updated);
      }
    }
  }, [installments]);

  // Auto computation triggers
  useEffect(() => {
    recalcLogic();
  }, [amount, paid, discount, periods, startDate, installmentCycle]);

  useEffect(() => {
    // Automatically guarantee unique sequence number for new contracts
    if (!editId) {
      setContractNo(generateNextNo("AW-CON", installments, "no"));
    }
  }, [installments, editId]);

  const recalcLogic = () => {
    const amt = Number(amount || 0);
    const pd = Number(paid || 0);
    const disc = Number(discount || 0);
    const days = Number(periods || 0);

    let calculatedEnd = "";
    if (days > 0 && startDate) {
      const d = new Date(startDate);
      if (installmentCycle === "اسبوعي") {
        d.setDate(d.getDate() + (days * 7) - 1);
      } else if (installmentCycle === "نصف شهر") {
        d.setDate(d.getDate() + (days * 15) - 1);
      } else if (installmentCycle === "شهري") {
        d.setMonth(d.getMonth() + days);
        d.setDate(d.getDate() - 1);
      } else { // "يومي"
        d.setDate(d.getDate() + days - 1);
      }
      calculatedEnd = d.toISOString().slice(0, 10);
    }
    setEndDate(calculatedEnd);

    const remaining = Math.max(0, amt - pd);
    const instVal = days > 0 ? Math.ceil(remaining / days) : 0;
    const finalRem = Math.max(0, remaining - disc);

    setInstallment(instVal || "");
    setAfterDiscount(finalRem || "");
  };

  const handleClear = () => {
    setEditId(null);
    setClient("");
    setContractType("تقسيط");
    setContractDirection("لنا");
    setLinkedWorkerId("");
    setLinkedProjectId("");
    setInstallmentCycle("يومي");
    setClassification("مدين");
    setIdentity("");
    setNationality("");
    // Keep or enforce authorized region restriction
    if (currentUser && currentUser.role !== "admin" && finalPerms?.region) {
      setRegion(finalPerms.region);
    } else {
      setRegion("");
    }
    setPhone("");
    setContractNo(generateNextNo("AW-CON", installments, "no"));
    setAmount("");
    setPaid("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setPeriods("");
    setInstallment("");
    setDiscount("");
    setAfterDiscount("");
    setProjectSug("");
    setWorkplace("");
    setGuarantor("");
    setStatus("منتظم");
    setNotes("");
    setTreasury(getStoredTreasuries(installmentCompanyId || selectedCompanyId, companies)[0] || "خزنة التحصيل");
    setCapital("");
    setCapitalSource("خزنة الشركة");
    setCapitalCompany("");
    setCapitalCollection("");
    setCapitalSplits({});
    setInstallmentCompanyId(selectedCompanyId !== "all" ? (selectedCompanyId || "") : "");
    setIsCapitalManuallyEdited(false);
  };

  const handleEdit = (x: Installment) => {
    setEditId(x.id);
    setClient(x.client || "");
    setContractType(x.type === "daily" || !x.type ? "تقسيط" : x.type);
    setContractDirection((x.contract_direction as any) || awExtractContractDirection(x.notes || "") || "لنا");
    setLinkedWorkerId(x.worker_id || awExtractWorkerId(x.notes || "") || "");
    setLinkedProjectId(x.project_id || awExtractProjectId(x.notes || "") || "");
    setInstallmentCycle(awExtractCycle(x.notes || "") || "يومي");
    setClassification(awExtractClassification(x.notes || "") || "مدين");
    setIdentity(x.identity || "");
    setNationality(x.nationality || "");
    setRegion(awExtractRegion(x.notes || "") || (finalPerms?.region || ""));
    setPhone(x.phone || "");
    setContractNo(x.no || "");
    setAmount(x.amount || "");
    const recordedDownPayment = awExtractDownPayment(x.notes || "");
    setPaid(recordedDownPayment > 0 ? recordedDownPayment : "");
    setStartDate(x.start_date || "");
    setPeriods(x.periods || "");
    setDiscount(x.discount || "");
    setProjectSug(x.project || "");
    setWorkplace(x.workplace || "");
    setGuarantor(x.guarantor || "");
    setStatus(x.status || "منتظم");
    setNotes(awCleanNotes(x.notes || ""));
    setTreasury(awExtractTreasury(x.notes || "") || getStoredTreasuries(installmentCompanyId || selectedCompanyId, companies)[0] || "خزنة التحصيل");
    setCapital(awExtractCapital(x.notes || "") || "");
    const rawSrc = awExtractCapitalSource(x.notes || "");
    const mappedSrc = rawSrc === "شركة" ? "خزنة الشركة" : (rawSrc === "تحصيل" ? "خزنة التحصيل" : rawSrc);
    setCapitalSource(mappedSrc);
    setCapitalCompany(awExtractCapitalCompany(x.notes || "") || "");
    setCapitalCollection(awExtractCapitalCollection(x.notes || "") || "");
    
    // Load splitting amounts dynamically
    const loadedSplits: Record<string, number | ""> = {};
    dynamicTreasuries.forEach(tName => {
      const val = awExtractCapitalSplit(x.notes || "", tName);
      loadedSplits[tName] = val || "";
    });
    setCapitalSplits(loadedSplits);

    setInstallmentCompanyId(x.company_id || "");
    setIsCapitalManuallyEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim()) return;

    // Guarantee unique contract number
    let finalContractNo = (contractNo || generateNextNo("AW-CON", installments, "no")).trim().toUpperCase();
    const isDup = installments.some(
      (i) => i.id !== editId && String(i.no || "").trim().toUpperCase() === finalContractNo
    );

    if (isDup) {
      if (!editId) {
        finalContractNo = generateNextNo("AW-CON", installments, "no");
        setContractNo(finalContractNo);
      } else {
        alert("⚠️ رقم العقد مسجل مسبقاً لعقد آخر! يرجى استخدام رقم عقد فريد.");
        return;
      }
    }

    const row = {
      client: client.trim(),
      identity: identity.trim(),
      nationality,
      phone: phone.trim(),
      no: finalContractNo,
      amount: Number(amount || 0),
      paid: Number(paid || 0),
      remaining: Math.max(0, Number(amount || 0) - Number(paid || 0)),
      type: contractType,
      start_date: startDate,
      end_date: endDate,
      periods: Number(periods || 0),
      installment: Number(installment || 0),
      discount: Number(discount || 0),
      after_discount: Number(afterDiscount || 0),
      project: projectSug.trim(),
      workplace: workplace.trim(),
      guarantor: guarantor.trim(),
      status,
      notes: notes.trim(), // notes builder handling appended inside App.tsx
      region_input: region, // to be passed down
      treasury_input: treasury, // to be passed down
      cycle_input: installmentCycle, // pass down cycle to onSaveInstallment
      classification_input: classification, // pass down classification (دائن/مدين)
      contract_direction_input: contractDirection,
      worker_id_input: linkedWorkerId,
      project_id_input: linkedProjectId,
      capital_input: capitalSource === "كلاهما" ? Object.values(capitalSplits).reduce<number>((sum, val) => sum + Number(val || 0), 0) : Number(capital || 0),
      capital_source_input: capitalSource,
      capital_company_input: capitalSource === "كلاهما" ? Number(capitalSplits["خزنة الشركة"] || 0) : (capitalSource === "خزنة الشركة" ? Number(capital || 0) : 0),
      capital_collection_input: capitalSource === "كلاهما" ? Number(capitalSplits["خزنة التحصيل"] || 0) : (capitalSource === "خزنة التحصيل" ? Number(capital || 0) : 0),
      capital_splits_input: capitalSplits,
      company_id: installmentCompanyId || (selectedCompanyId !== "all" ? selectedCompanyId : undefined)
    };

    setPendingContractRow(row);
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingContractRow) return;
    setIsSavingContract(true);
    try {
      const success = await onSaveInstallment(pendingContractRow, editId);
      if (success) {
        setShowConfirmModal(false);
        setPendingContractRow(null);
        handleClear();
      }
    } finally {
      setIsSavingContract(false);
    }
  };

  // Safe checks for user permission context
  const allowedRegion = finalPerms?.region || "";
  const filteredInstallments = installments.filter((item) => {
    const itemRegion = awExtractRegion(item.notes || "");
    if (currentUser && currentUser.role !== "admin" && allowedRegion) {
      return itemRegion === allowedRegion;
    }
    return true;
  });

  const getVisibleList = () => {
    const list = filteredInstallments.filter((x) => {
      const t = getContractTiming(x);
      const computedStatus = t.overdueDays > 0 ? "متأخر" : x.status;
      const r = awExtractRegion(x.notes || "");

      const txt = `${x.client} ${x.identity} ${x.phone} ${x.no} ${x.project} ${x.workplace} ${x.nationality} ${r}`.toLowerCase();
      const itemType = x.type === "daily" || !x.type ? "تقسيط" : x.type;
      const itemClassification = awExtractClassification(x.notes || "");

      return (
        (!qSearch || txt.includes(qSearch.toLowerCase().trim())) &&
        (!fStatus || computedStatus === fStatus) &&
        (!fNationality || x.nationality === fNationality) &&
        (!fProject || String(x.project).toLowerCase().includes(fProject.toLowerCase().trim())) &&
        (!fRegion || r === fRegion) &&
        (!fType || itemType === fType) &&
        (!fClassification || itemClassification === fClassification)
      );
    });

    return list.sort((a, b) => {
      if (fSort === "date_desc") {
        return String(b.start_date || "").localeCompare(String(a.start_date || ""));
      }
      if (fSort === "date_asc") {
        return String(a.start_date || "").localeCompare(String(b.start_date || ""));
      }
      if (fSort === "client_asc") {
        return String(a.client || "").localeCompare(String(b.client || ""), "ar");
      }
      if (fSort === "amount_desc") {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (fSort === "amount_asc") {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }
      return 0;
    });
  };

  const listToRender = getVisibleList();

  // Selected file timing details & related receipts
  const activeTiming = selectedFileContract ? getContractTiming(selectedFileContract) : null;
  const activeReceipts = selectedFileContract
    ? receipts.filter((r) => r.installment_id === selectedFileContract.id || r.contract_no === selectedFileContract.no)
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Contract Addition Form Panel */}
      {((!editId && finalPerms?.installmentsAdd) || (editId && finalPerms?.installmentsEdit) || currentUser?.role === "admin") && (
        <form onSubmit={handleSubmit} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-850 pb-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">📝</span>
              {editId ? `تعديل عقد العميل — ${client}` : `إضافة عقد تقسيط ${installmentCycle} جديد`}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

            {/* Contract Direction Selector Panel */}
            <div className="sm:col-span-2 md:col-span-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <label className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <span>🧭</span> اتجاه العقد وطبيعة المعاملة المالية (Contract Direction & Flow)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setContractDirection("لنا")}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    contractDirection === "لنا"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-extrabold shadow-lg"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">🟢 لنا (إيراد / تحصيل من عميل)</div>
                    <div className="text-[10px] text-slate-400 font-normal">عقد مشروع/تقسيط للشركة وتوليد مقبوضات</div>
                  </div>
                  {contractDirection === "لنا" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setContractDirection("علينا")}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    contractDirection === "علينا"
                      ? "bg-rose-500/15 border-rose-500 text-rose-300 font-extrabold shadow-lg"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">🔴 علينا (مصروف / استحقاق لمقاول)</div>
                    <div className="text-[10px] text-slate-400 font-normal">عقد مقاولة باطن أو توريد وتوليد مدفوعات</div>
                  </div>
                  {contractDirection === "علينا" && <CheckCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setContractDirection("مصروفات عمالة")}
                  className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    contractDirection === "مصروفات عمالة"
                      ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 font-extrabold shadow-lg"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-black">💼 مصروفات عمالة (عقد تشغيل/رواتب)</div>
                    <div className="text-[10px] text-slate-400 font-normal">ربط مباشر بتكاليف عمالة مشروع محدد</div>
                  </div>
                  {contractDirection === "مصروفات عمالة" && <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              </div>
            </div>



            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">اسم العميل</label>
              <div className="relative">
                <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="text"
                  placeholder="اسم العميل الرباعي"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">رقم الهوية / الإقامة</label>
              <div className="relative">
                <Shield className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="text"
                  placeholder="10 أرقام"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">جنسية العميل</label>
              <div className="relative">
                <Globe className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">الجنسية</option>
                  <option value="سعودي">سعودي</option>
                  <option value="هندي">هندي</option>
                  <option value="باكستاني">باكستاني</option>
                  <option value="بنقالي">بنقالي</option>
                  <option value="مصري">مصري</option>
                  <option value="سوداني">سوداني</option>
                  <option value="يمني">يمني</option>
                  <option value="نيبالي">نيبالي</option>
                  <option value="فلبيني">فلبيني</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">إدارة الفرع</label>
              <select
                disabled={currentUser?.role !== "admin" && !!allowedRegion}
                value={region || (currentUser?.role !== "admin" ? allowedRegion : "")}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="">الإدارة المسؤولة</option>
                <option value="الوسطى">الوسطى</option>
                <option value="الشرقية">الشرقية</option>
                <option value="الغربية">الغربية</option>
                <option value="الجنوب">الجنوب</option>
                <option value="الشمال">الشمال</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">نوع العقد</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="تقسيط">تقسيط</option>
                <option value="المشروع">المشروع</option>
                <option value="عقد عمل">عقد عمل</option>
                <option value="عقد مقاولات">عقد مقاولات</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">تصنيف الحساب (مدين / دائن)</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="مدين">مدين (العميل عليه التزام مالي لنا)</option>
                <option value="دائن">دائن (العميل له مستحقات مالية لدينا)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">رقم جوال العميل</label>
              <div className="relative">
                <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  required
                  type="text"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400">رقم العقد</label>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">فريد تلقائي</span>
              </div>
              <input
                readOnly
                type="text"
                value={contractNo}
                title="رقم العقد التسلسلي المضمون عدم تكراره"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-850 rounded-xl text-xs font-mono font-bold text-emerald-400 focus:outline-none select-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">مبلغ العقد الكلي</label>
              <input
                required
                type="number"
                placeholder="المبلغ الإجمالي"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400">الدفعة المدفوعة مقدماً عند توقيع العقد</label>
                <span className="text-[9px] text-slate-500 font-bold">0 إذا لم توجد دفعة أولى</span>
              </div>
              <input
                type="number"
                placeholder="0 (تترك فارغة إذا كان السداد بسندات)"
                value={paid}
                onChange={(e) => setPaid(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">تاريخ البدء</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">دورية سداد القسط</label>
              <select
                value={installmentCycle}
                onChange={(e) => setInstallmentCycle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="يومي">يومي</option>
                <option value="اسبوعي">أسبوعي</option>
                <option value="نصف شهر">نصف شهري</option>
                <option value="شهري">شهري</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">
                {installmentCycle === "اسبوعي" ? "عدد أسابيع العقد" :
                 installmentCycle === "نصف شهر" ? "عدد الدفعات (كل 15 يوم)" :
                 installmentCycle === "شهري" ? "عدد أشهر العقد" : "عدد أيام العقد"}
              </label>
              <input
                required
                type="number"
                placeholder={
                  installmentCycle === "اسبوعي" ? "مثال: 4 أسابيع" :
                  installmentCycle === "نصف شهر" ? "مثال: 6 دفعات" :
                  installmentCycle === "شهري" ? "مثال: 12 شهر" : "مثال: 30 يوم"
                }
                value={periods}
                onChange={(e) => setPeriods(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">
                {installmentCycle === "اسبوعي" ? "القسط الأسبوعي المستحق" :
                 installmentCycle === "نصف شهر" ? "القسط نصف الشهري المستحق" :
                 installmentCycle === "شهري" ? "القسط الشهري المستحق" : "القسط اليومي المستحق"}
              </label>
              <input
                readOnly
                type="text"
                placeholder="تلقائي بقسمة المتبقي"
                value={installment ? `${installment} ريال / ${
                  installmentCycle === "اسبوعي" ? "أسبوع" :
                  installmentCycle === "نصف شهر" ? "نصف شهر" :
                  installmentCycle === "شهري" ? "شهر" : "يوم"
                }` : ""}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-850 rounded-xl text-xs font-bold text-emerald-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">خصم انتظام السداد</label>
              <input
                type="number"
                placeholder="خصم تسوية"
                value={discount}
                onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">تاريخ الانتهاء</label>
              <input
                readOnly
                type="date"
                value={endDate}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-850 rounded-xl text-xs font-bold text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">اسم المشروع المرتبط</label>
              <input
                type="text"
                list="projectsListForm"
                placeholder="ابحث وصنف المشروع"
                value={projectSug}
                onChange={(e) => setProjectSug(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <datalist id="projectsListForm">
                {projects.map((p, idx) => (
                  <option key={idx} value={p.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">مقر العمل</label>
              <input
                type="text"
                placeholder="الجهة أو الشركة المشغلة"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">الكفيل الغارم</label>
              <input
                type="text"
                placeholder="اسم الكفيل الضامن"
                value={guarantor}
                onChange={(e) => setGuarantor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">حالة السداد العامة</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="منتظم">منتظم</option>
                <option value="متأخر">متأخر</option>
                <option value="متعثر">متعثر</option>
                <option value="مكتمل">مكتمل</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400">الخزنة المستهدفة بالمعاملات</label>
              <select
                value={treasury}
                onChange={(e) => setTreasury(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {dynamicTreasuries.map((tName) => (
                  <option key={tName} value={tName} className="bg-slate-950 text-white">🏢 {tName}</option>
                ))}
              </select>
            </div>

             <div className="space-y-1">
              <label className="text-[10px] font-black text-amber-400">جهة تمويل رأس مال العقد</label>
              <select
                value={capitalSource}
                onChange={(e) => handleCapitalSourceChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition-colors bg-slate-950 cursor-pointer"
              >
                {dynamicTreasuries.map((tName) => (
                  <option key={tName} value={tName} className="bg-slate-950 text-white">💰 {tName}</option>
                ))}
                <option value="كلاهما" className="bg-slate-950 text-white">🤝 الاثنين معاً (تقسيم التمويل)</option>
              </select>
            </div>

            {capitalSource !== "كلاهما" ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-amber-400 flex items-center justify-between">
                  <span>قيمة رأس مال العقد (تمويل البداية)</span>
                  {isCapitalManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCapitalManuallyEdited(false);
                      }}
                      className="text-[8px] text-blue-400 underline font-sans hover:text-blue-300"
                    >
                      (تفعيل تلقائي متبقي)
                    </button>
                  )}
                </label>
                <input
                  type="number"
                  placeholder="رأس المال المدفوع لتأسيس العقد"
                  value={capital}
                  onChange={(e) => handleCapitalChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
                
                {/* Real-time interactive autofill helper badges */}
                {Number(amount || 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCapital(Number(amount || 0));
                        setIsCapitalManuallyEdited(true);
                      }}
                      className="text-[9px] px-2 py-0.5 bg-slate-950/60 text-slate-300 border border-slate-800 rounded hover:bg-slate-800 transition font-sans"
                    >
                      كامل العقد ({Number(amount).toLocaleString()})
                    </button>
                    {Number(paid || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCapital(Math.max(0, Number(amount || 0) - Number(paid || 0)));
                          setIsCapitalManuallyEdited(true);
                        }}
                        className="text-[9px] px-2 py-0.5 bg-slate-950/60 text-amber-400 border border-slate-800 rounded hover:bg-slate-800 transition font-sans"
                      >
                        المتبقي ({Math.max(0, Number(amount || 0) - Number(paid || 0)).toLocaleString()})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCapital(Math.round(Number(amount || 0) * 0.7));
                        setIsCapitalManuallyEdited(true);
                      }}
                      className="text-[9px] px-2 py-0.5 bg-slate-950/60 text-slate-300 border border-slate-800 rounded hover:bg-slate-800 transition font-sans"
                    >
                      70٪ عصف ({Math.round(Number(amount || 0) * 0.7).toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCapital(Math.round(Number(amount || 0) * 0.8));
                        setIsCapitalManuallyEdited(true);
                      }}
                      className="text-[9px] px-2 py-0.5 bg-slate-950/60 text-slate-300 border border-slate-800 rounded hover:bg-slate-800 transition font-sans"
                    >
                      80٪ عصف ({Math.round(Number(amount || 0) * 0.8).toLocaleString()})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20">
                {dynamicTreasuries.map((tName) => {
                  const val = capitalSplits[tName] !== undefined ? capitalSplits[tName] : "";
                  const totalRem = Math.max(0, Number(amount || 0) - Number(paid || 0)) || 1;
                  const ratio = Number(amount || 0) > 0 ? ((Number(val || 0) / totalRem) * 100).toFixed(0) : "";
                  return (
                    <div key={tName} className="space-y-1">
                      <span className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-amber-400">كم دفع {tName} من رأس المال؟</label>
                        {ratio !== "" && (
                          <span className="text-[9px] text-amber-500 font-mono font-bold">
                            {ratio}٪
                          </span>
                        )}
                      </span>
                      <input
                        type="number"
                        placeholder={`تمويل من ${tName}`}
                        value={val}
                        onChange={(e) => {
                          const updatedVal = e.target.value === "" ? "" : Number(e.target.value);
                          setCapitalSplits((prev) => ({
                            ...prev,
                            [tName]: updatedVal,
                          }));
                          setIsCapitalManuallyEdited(true);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-amber-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  );
                })}
                
                {/* Live division ratio buttons */}
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center border-t border-amber-500/10 pt-3 justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const total = Math.max(0, Number(amount || 0) - Number(paid || 0)) || Number(amount || 0);
                        if (total > 0) {
                          const newSplits: Record<string, number | ""> = {};
                          dynamicTreasuries.forEach(tName => {
                            if (tName === "خزنة الشركة") {
                              newSplits[tName] = Math.round(total * 0.5);
                            } else if (tName === "خزنة التحصيل") {
                              newSplits[tName] = total - Math.round(total * 0.5);
                            } else {
                              newSplits[tName] = 0;
                            }
                          });
                          setCapitalSplits(newSplits);
                          setIsCapitalManuallyEdited(true);
                        }
                      }}
                      className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded hover:bg-amber-500/20 transition font-sans"
                    >
                      ⚖️ مناصفة 50/50
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const total = Math.max(0, Number(amount || 0) - Number(paid || 0)) || Number(amount || 0);
                        if (total > 0) {
                          const newSplits: Record<string, number | ""> = {};
                          dynamicTreasuries.forEach(tName => {
                            if (tName === "خزنة الشركة") {
                              newSplits[tName] = Math.round(total * 0.7);
                            } else if (tName === "خزنة التحصيل") {
                              newSplits[tName] = total - Math.round(total * 0.7);
                            } else {
                              newSplits[tName] = 0;
                            }
                          });
                          setCapitalSplits(newSplits);
                          setIsCapitalManuallyEdited(true);
                        }
                      }}
                      className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded hover:bg-amber-500/20 transition font-sans"
                    >
                      🏢 الشركة 70٪ / التحصيل 30٪
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const total = Math.max(0, Number(amount || 0) - Number(paid || 0)) || Number(amount || 0);
                        if (total > 0) {
                          const newSplits: Record<string, number | ""> = {};
                          dynamicTreasuries.forEach(tName => {
                            if (tName === "خزنة الشركة") {
                              newSplits[tName] = Math.round(total * 0.8);
                            } else if (tName === "خزنة التحصيل") {
                              newSplits[tName] = total - Math.round(total * 0.8);
                            } else {
                              newSplits[tName] = 0;
                            }
                          });
                          setCapitalSplits(newSplits);
                          setIsCapitalManuallyEdited(true);
                        }
                      }}
                      className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded hover:bg-amber-500/20 transition font-sans"
                    >
                      🏢 الشركة 80٪ / التحصيل 20٪
                    </button>
                    {isCapitalManuallyEdited && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCapitalManuallyEdited(false);
                        }}
                        className="text-[9px] px-2 py-0.5 bg-blue-600/10 text-blue-300 border border-blue-500/20 rounded hover:bg-blue-600/20 transition font-sans"
                      >
                        🔄 إعادة التفعيل التلقائي
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-black text-amber-300">
                    💡 إجمالي رأس مال العقد المشترك: {Object.values(capitalSplits).reduce<number>((sum, val) => sum + Number(val || 0), 0).toLocaleString()} ريال
                  </span>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400">ملاحظات العقد</label>
              <textarea
                placeholder="تفاصيل إضافية أو شروط سداد"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 h-[46px] bg-slate-950/40 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-800 text-white hover:bg-slate-750 transition-all shadow-md"
            >
              إلغاء وتفريغ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md"
            >
              {editId ? "حفظ التعديلات" : "حفظ وتسجيل العقد"}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Tables Section */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Quick Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3 p-4 bg-slate-950/30 rounded-2xl border border-slate-850/80">
          <input
            type="text"
            placeholder="البحث باسم العميل أو العقد أو الجوال..."
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
          />
          <select
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
          >
            <option value="">جميع حالات السداد</option>
            <option value="منتظم">منتظم</option>
            <option value="متأخر">متأخر</option>
            <option value="متعثر">متعثر</option>
            <option value="مكتمل">مكتمل</option>
          </select>
          <select
            value={fType}
            onChange={(e) => setFType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
          >
            <option value="">كل أنواع العقود</option>
            <option value="تقسيط">تقسيط</option>
            <option value="المشروع">المشروع</option>
            <option value="عقد عمل">عقد عمل</option>
            <option value="عقد مقاولات">عقد مقاولات</option>
          </select>
          <select
            value={fClassification}
            onChange={(e) => setFClassification(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
          >
            <option value="">كل التصنيفات (مدين/دائن)</option>
            <option value="مدين">مدين</option>
            <option value="دائن">دائن</option>
          </select>
          <select
            value={fNationality}
            onChange={(e) => setFNationality(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none"
          >
            <option value="">كل الجنسيات</option>
            <option value="سعودي">سعودي</option>
            <option value="هندي">هندي</option>
            <option value="باكستاني">باكستاني</option>
            <option value="بنقالي">بنقالي</option>
            <option value="مصري">مصري</option>
            <option value="سوداني">سوداني</option>
            <option value="يمني">يمني</option>
            <option value="أخرى">أخرى</option>
          </select>
          <input
            type="text"
            placeholder="المشروع المرتبط..."
            value={fProject}
            onChange={(e) => setFProject(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-500"
          />
          <select
            value={fRegion}
            onChange={(e) => setFRegion(e.target.value)}
            disabled={currentUser?.role !== "admin" && !!allowedRegion}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none disabled:opacity-75"
          >
            <option value="">كل إدارات الفروع</option>
            <option value="الوسطى">الوسطى</option>
            <option value="الشرقية">الشرقية</option>
            <option value="الغربية">الغربية</option>
            <option value="الجنوب">الجنوب</option>
            <option value="الشمال">الشمال</option>
          </select>
          <select
            value={fSort}
            onChange={(e) => setFSort(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none font-sans"
          >
            <option value="date_desc">تاريخ العقد (الأحدث أولاً)</option>
            <option value="date_asc">تاريخ العقد (الأقدم أولاً)</option>
            <option value="client_asc">اسم العميل (أ - ي)</option>
            <option value="amount_desc">قيمة العقد (الأعلى ماليًا)</option>
            <option value="amount_asc">قيمة العقد (الأقل ماليًا)</option>
          </select>
        </div>

        {/* Contract log list table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-right text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-300">
                <th className="py-3 px-4 font-black">العميل والجنسية</th>
                <th className="py-3 px-4 font-black">رقم العقد والفرع</th>
                <th className="py-3 px-4 font-black">تاريخ العقد</th>
                <th className="py-3 px-4 font-black">آخر سداد</th>
                <th className="py-3 px-4 font-black text-center">التأخر</th>
                <th className="py-3 px-4 font-black">الإجمالي</th>
                <th className="py-3 px-4 font-black">المستلم</th>
                <th className="py-3 px-4 font-black">المتبقي</th>
                <th className="py-3 px-4 font-black">الحالة</th>
                <th className="py-3 px-4 font-black text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {listToRender.length > 0 ? (
                listToRender.map((item, idx) => {
                  const t = getContractTiming(item);
                  const computedStatus = t.overdueDays > 0 ? "متأخر" : item.status;
                  const itemRegion = awExtractRegion(item.notes || "");

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-800/10 transition-colors ${
                        computedStatus === "متأخر" ? "bg-rose-950/5" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="block font-black text-white">{item.client}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold">{item.nationality || "غير محدد"}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold font-sans">
                            {item.type === "daily" || !item.type ? "تقسيط" : item.type}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold font-sans">
                            {(() => {
                              const c = awExtractCycle(item.notes || "") || "يومي";
                              return c === "يومي" ? "يومي" :
                                     c === "اسبوعي" ? "أسبوعي" :
                                     c === "نصف شهر" ? "نصف شهري" : "شهري";
                            })()}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black font-sans ${
                            awExtractClassification(item.notes || "") === "دائن"
                              ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          }`}>
                            {awExtractClassification(item.notes || "")}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="block text-slate-200 font-bold">{item.no}</span>
                        {(() => {
                          const renewedFrom = awExtractRenewedFrom(item.notes || "");
                          return renewedFrom ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap" title={`مجدد من العقد: ${renewedFrom}`}>
                              🔄 مجدد من: {renewedFrom}
                            </span>
                          ) : null;
                        })()}
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <span className="block text-[10px] text-amber-500/80 font-sans font-bold">{itemRegion || "القرية الرئيسية"}</span>
                          <span className="block text-[9px] text-blue-400 font-sans font-black">🏢 {awExtractTreasury(item.notes || "") || "خزنة التحصيل"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{item.start_date}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{t.lastPaid}</td>
                      <td className="py-3.5 px-4 text-center">
                        {t.overdueDays > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black font-mono">
                            {t.overdueDays} {(() => {
                              const c = awExtractCycle(item.notes || "") || "يومي";
                              return c === "يومي" ? "يوم" :
                                     c === "اسبوعي" ? "أسبوع" :
                                     c === "نصف شهر" ? "نصف شهر" : "شهر";
                            })()}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold">0</span>
                        )}
                      </td>
                      <td className={`py-3.5 px-4 font-bold font-mono ${
                        awExtractClassification(item.notes || "") === "دائن"
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}>{Number(item.amount || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">{Number(item.paid || 0).toLocaleString()}</td>
                      <td className={`py-3.5 px-4 font-bold font-mono ${
                        awExtractClassification(item.notes || "") === "دائن"
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}>{Number(item.remaining || 0).toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            computedStatus === "منتظم" || computedStatus === "مكتمل"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : computedStatus === "متأخر"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          }`}
                        >
                          {computedStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {((finalPerms?.installmentsAdd) || currentUser?.role === "admin") && (
                            <button
                              onClick={() => openRenewModal(item)}
                              className="px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="تجديد العقد أو تمديد فترته"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>تجديد</span>
                            </button>
                          )}
                          {onCreateReceiptForContract && (
                            <button
                              onClick={() => onCreateReceiptForContract(item)}
                              className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="تحرير سند قبض لهذا العقد فوراً"
                            >
                              <span>💰</span>
                              <span>سند قبض</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedFileContract(item)}
                            className="px-3 py-1.5 bg-slate-950/40 border border-slate-800 text-xs font-bold text-blue-400 hover:text-white rounded-lg hover:bg-blue-600/25 transition-all cursor-pointer whitespace-nowrap"
                            title="فتح ملف العقد"
                          >
                            فتح الملف
                          </button>
                          {(currentUser?.role === "admin" || finalPerms?.installmentsDelete) && (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف العقد الخاص بـ (${item.client}) ورقم العقد (${item.no}) بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء!`)) {
                                  onDeleteInstallment(item.id);
                                }
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                              title="حذف العقد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-bold">
                    لا توجد أي عقود مسجلة ومطابقة للتصنيفات.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract File Details Sheet Modal overlay */}
      {selectedFileContract && activeTiming && (
        <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900 px-6 py-5 border-b border-slate-800 flex justify-between items-center z-10">
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">📂</span>
                  ملف العقد — {selectedFileContract.no}
                </h4>
                <p className="text-xs text-slate-400 font-bold mt-1">عرض عام لمستندات العميل وتحركات الدفوعات التابعة</p>
              </div>
              <button
                onClick={() => setSelectedFileContract(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Renewal Origin Banner if applicable */}
              {awExtractRenewedFrom(selectedFileContract.notes || "") && (
                <div className="p-4 bg-cyan-950/40 border border-cyan-500/40 rounded-2xl flex items-center justify-between gap-3 text-cyan-300 shadow-sm">
                  <div className="flex items-center gap-3 text-xs font-black">
                    <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">🔄</span>
                    <div>
                      <span className="block text-white text-sm font-bold">عقد مجدد وممدد</span>
                      <span className="text-slate-400 text-xs">تم إنشاء وتجديد هذا العقد استناداً للعقد السابق رقم: </span>
                      <span className="font-mono text-cyan-300 font-black underline mr-1">{awExtractRenewedFrom(selectedFileContract.notes || "")}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile details grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">العميل</span>
                  <span className="font-bold text-white text-sm">{selectedFileContract.client}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">رقم الهوية</span>
                  <span className="font-mono text-white font-bold text-xs">{selectedFileContract.identity}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">الجوال</span>
                  <span className="font-mono text-white font-bold text-xs">{selectedFileContract.phone}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">الجنسية</span>
                  <span className="font-bold text-white text-xs">{selectedFileContract.nationality || "سعودي"}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">نوع العقد</span>
                  <span className="font-bold text-blue-400 text-xs">
                    {selectedFileContract.type === "daily" || !selectedFileContract.type ? "تقسيط" : selectedFileContract.type}
                  </span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">تصنيف الحساب</span>
                  <span className={`font-black text-xs ${
                    awExtractClassification(selectedFileContract.notes || "") === "دائن"
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}>
                    {awExtractClassification(selectedFileContract.notes || "")} ({
                      awExtractClassification(selectedFileContract.notes || "") === "دائن"
                        ? "مستحقات للعميل علينا"
                        : "التزام على العميل لنا"
                    })
                  </span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">مبلغ العقد الكلي</span>
                  <span className={`font-mono font-black text-sm ${
                    awExtractClassification(selectedFileContract.notes || "") === "دائن"
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}>{Number(selectedFileContract.amount).toLocaleString()} ريال</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">المدفوع مقدماً</span>
                  <span className="font-mono text-emerald-400 font-extrabold text-xs">{Number(selectedFileContract.paid).toLocaleString()} ريال</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850 bg-amber-500/5">
                  <span className="block text-[10px] font-black text-amber-400 mb-1">رأس مال العقد</span>
                  <span className="font-mono text-amber-200 font-extrabold text-sm block">
                    {Number(awExtractCapital(selectedFileContract.notes || "")).toLocaleString()} ريال
                  </span>
                  {(() => {
                    const src = awExtractCapitalSource(selectedFileContract.notes || "");
                    const comp = awExtractCapitalCompany(selectedFileContract.notes || "");
                    const coll = awExtractCapitalCollection(selectedFileContract.notes || "");
                    
                    if (src === "كلاهما") {
                      return (
                        <span className="block text-[9px] text-amber-300/80 mt-1 leading-normal font-sans">
                          (الشركة: {comp.toLocaleString()} | التحصيل: {coll.toLocaleString()})
                        </span>
                      );
                    } else if (src === "شركة") {
                      return (
                        <span className="block text-[9px] text-amber-300/80 mt-1 leading-normal font-sans">
                          (الممول: خزنة الشركة)
                        </span>
                      );
                    } else {
                      return (
                        <span className="block text-[9px] text-amber-300/80 mt-1 leading-normal font-sans">
                          (الممول: خزنة التحصيل)
                        </span>
                      );
                    }
                  })()}
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">المتبقي الكلي</span>
                  <span className={`font-mono font-extrabold text-sm ${
                    awExtractClassification(selectedFileContract.notes || "") === "دائن"
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}>{Number(selectedFileContract.remaining).toLocaleString()} ريال</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">
                    {(() => {
                      const c = awExtractCycle(selectedFileContract.notes || "") || "يومي";
                      return c === "يومي" ? "القسط اليومي" :
                             c === "اسبوعي" ? "القسط الأسبوعي" :
                             c === "نصف شهر" ? "القسط نصف الشهري" : "القسط الشهري";
                    })()}
                  </span>
                  <span className="font-mono text-amber-500 font-extrabold text-xs">
                    {Number(selectedFileContract.installment).toLocaleString()} ريال / {(() => {
                      const c = awExtractCycle(selectedFileContract.notes || "") || "يومي";
                      return c === "يومي" ? "يوم" :
                             c === "اسبوعي" ? "أسبوع" :
                             c === "نصف شهر" ? "نصف شهر" : "شهر";
                    })()}
                  </span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ البدء والانتهاء</span>
                  <span className="font-mono text-white text-[11px] font-bold">{selectedFileContract.start_date} ← {selectedFileContract.end_date || "مستمر"}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">آخر سداد مدفوع</span>
                  <span className="font-mono text-white font-bold text-xs">{activeTiming.lastPaid}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">مبالغ وفترات التأخير</span>
                  <span className="font-bold text-rose-400 text-xs">
                    {activeTiming.overdueDays} {(() => {
                      const c = awExtractCycle(selectedFileContract.notes || "") || "يومي";
                      return c === "يومي" ? "يوم" :
                             c === "اسبوعي" ? "أسبوع" :
                             c === "نصف شهر" ? "نصف شهر" : "شهر";
                    })()} | {activeTiming.overdueAmount.toLocaleString()} ريال
                  </span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">المشروع المرتبط</span>
                  <span className="font-bold text-amber-500 text-xs">{selectedFileContract.project || "غير مرتبط بمشروع"}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">مقر العمل والكفيل</span>
                  <span className="font-bold text-white text-[11px] leading-relaxed">
                    مقر: {selectedFileContract.workplace || "لا يوجد"}<br />
                    كفيل: {selectedFileContract.guarantor || "لا يوجد"}
                  </span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850 col-span-2">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">ملاحظات وشهادات الفرع</span>
                  <span className="font-bold text-slate-350 text-xs">{awCleanNotes(selectedFileContract.notes || "") || "لا يوجد ملاحظات إدارية"}</span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">تفريغ الفرع</span>
                  <span className="inline-block px-3 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold text-xs">
                    {awExtractRegion(selectedFileContract.notes || "") || "غير مصنف"}
                  </span>
                </div>
                <div className="bg-slate-950/30 p-3.5 rounded-2xl border border-slate-850 text-center flex flex-col items-center justify-center">
                  <span className="block text-[10px] font-bold text-slate-400 mb-1">الخزنة النشطة</span>
                  <select
                    value={awExtractTreasury(selectedFileContract.notes || "") || "خزنة التحصيل"}
                    onChange={async (e) => {
                      const newTreasury = e.target.value;
                      const activeRegion = awExtractRegion(selectedFileContract.notes || "") || "";
                      const activeCap = awExtractCapital(selectedFileContract.notes || "");
                      const activeCapSource = awExtractCapitalSource(selectedFileContract.notes || "");
                      const activeCapCompany = awExtractCapitalCompany(selectedFileContract.notes || "");
                      const activeCapCollection = awExtractCapitalCollection(selectedFileContract.notes || "");
                      const row = {
                        client: selectedFileContract.client,
                        identity: selectedFileContract.identity,
                        nationality: selectedFileContract.nationality || "",
                        phone: selectedFileContract.phone,
                        no: selectedFileContract.no,
                        amount: Number(selectedFileContract.amount || 0),
                        paid: Number(selectedFileContract.paid || 0),
                        remaining: Number(selectedFileContract.remaining || 0),
                        type: "daily",
                        start_date: selectedFileContract.start_date,
                        end_date: selectedFileContract.end_date,
                        periods: Number(selectedFileContract.periods || 0),
                        installment: Number(selectedFileContract.installment || 0),
                        discount: Number(selectedFileContract.discount || 0),
                        after_discount: Number(selectedFileContract.after_discount || 0),
                        project: selectedFileContract.project,
                        workplace: selectedFileContract.workplace,
                        guarantor: selectedFileContract.guarantor,
                        status: selectedFileContract.status,
                        notes: awCleanNotes(selectedFileContract.notes || ""),
                        region_input: activeRegion,
                        treasury_input: newTreasury,
                        capital_input: activeCap,
                        capital_source_input: activeCapSource,
                        capital_company_input: activeCapCompany,
                        capital_collection_input: activeCapCollection
                      };
                      await onSaveInstallment(row, selectedFileContract.id);
                    }}
                    className="mt-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-extrabold text-xs rounded-xl px-2.5 py-1.5 text-center focus:outline-none cursor-pointer max-w-full transition-colors"
                  >
                    {dynamicTreasuries.map((tName) => (
                      <option key={tName} value={tName} className="bg-slate-950 text-white">💰 {tName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Related collections receipts section */}
              <div className="space-y-3">
                <h5 className="text-sm font-black text-slate-300 border-b border-slate-850 pb-2">💰 سندات المقبوضات المسجلة للعقد</h5>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400">
                        <th className="py-2.5 px-3 font-bold">رقم السند</th>
                        <th className="py-2.5 px-3 font-bold">تاريخ الدفعة</th>
                        <th className="py-2.5 px-3 font-bold">البيان</th>
                        <th className="py-2.5 px-3 font-bold">المستلم من</th>
                        <th className="py-2.5 px-3 font-bold">طريقة الدفع</th>
                        <th className="py-2.5 px-3 font-bold">المبلغ المدفوع</th>
                        <th className="py-2.5 px-3 font-bold">المتبقي الكلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/30">
                      {activeReceipts.length > 0 ? (
                        activeReceipts.map((rec, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/10">
                            <td className="py-2 px-3 font-mono text-slate-300 font-bold">{rec.no}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{rec.date}</td>
                            <td className="py-2 px-3 text-slate-300">
                              {rec.notes || (() => {
                                const contract = installments.find(inst => inst.id === rec.installment_id || inst.no === rec.contract_no);
                                const c = contract ? (awExtractCycle(contract.notes || "") || "يومي") : "يومي";
                                return "قبض دفعة قسط " + (c === "يومي" ? "يومي" : c === "اسبوعي" ? "أسبوعي" : c === "نصف شهر" ? "نصف شهري" : "شهري");
                              })()}
                            </td>
                            <td className="py-2 px-3 font-bold">{rec.from_name}</td>
                            <td className="py-2 px-3 text-slate-400">{rec.method}</td>
                            <td className="py-2 px-3 font-black text-emerald-400 font-mono">+{Number(rec.amount || 0).toLocaleString()} ريال</td>
                            <td className="py-2 px-3 font-black text-slate-300 font-mono">{Number(rec.remaining_after || 0).toLocaleString()} ريال</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500 font-bold">
                            لا توجد أي سندات مقبوضات على العقد الحالي حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ترحيل العقد بين الشركات */}
              {((finalPerms?.installmentsEdit) || currentUser?.role === "admin") && companies && companies.length > 1 && (
                <div className="border border-amber-500/15 bg-amber-500/5 p-5 rounded-2xl space-y-3.5 mt-2">
                  <h5 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                    <span>🔄</span> ترحيل العقد والمستندات لشركة أخرى
                  </h5>
                  <p className="text-[11px] font-bold text-amber-200/80 leading-relaxed font-sans">
                    سيؤدي هذا الإجراء لترحيل بطاقة العقد بكافة الأقساط والسجل، بالإضافة لنقل جميع سندات المقبوضات المرتبطة، وكافة المصروفات المسجلة تحت مشروع العقد الحالي إلى حسابات الشركة المستهدفة بشكل فوري وتحديث المركز المالي للشركتين.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">الشركة المستهدفة بالترحيل</label>
                      <select
                        id="migrate-target-company"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-extrabold focus:outline-none focus:border-amber-500 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled className="text-slate-500">اختر الشركة المستهدفة...</option>
                        {companies
                          .filter((c) => c.id !== selectedFileContract.company_id)
                          .map((c) => (
                            <option key={c.id} value={c.id} className="text-white font-bold">🏢 {c.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">السبب الرقابي والتدقيقي للترحيل</label>
                      <input
                        type="text"
                        id="migrate-reason-input"
                        placeholder="مثال: تسوية ميزانيات الفروع، تدوير عقود الحسابات..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const targetSelect = document.getElementById("migrate-target-company") as HTMLSelectElement;
                        const reasonInput = document.getElementById("migrate-reason-input") as HTMLInputElement;
                        
                        const targetId = targetSelect?.value;
                        const reason = reasonInput?.value || "";
                        
                        if (!targetId) {
                          alert("يرجى اختيار الشركة المستهدفة للترحيل أولاً!");
                          return;
                        }
                        
                        if (!reason.trim()) {
                          alert("يرجى كتابة سبب الترحيل للأغراض التدقيقية والرقابية!");
                          return;
                        }
                        
                        const targetCompName = companies.find(c => c.id === targetId)?.name || targetId;
                        if (confirm(`هل أنت متأكد من ترحيل العقد الحالي بكافة سنداته ومصروفاته إلى شركة "${targetCompName}"؟`)) {
                          if (onMigrateInstallment) {
                            const success = await onMigrateInstallment(selectedFileContract.id, targetId, reason);
                            if (success) {
                              setSelectedFileContract(null);
                            }
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      <span>🚀</span> ترحيل العقد بالكامل الآن
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-4 shrink-0 flex justify-end gap-3 z-10">
              {(currentUser?.role === "admin" || finalPerms?.installmentsDelete) && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("تأكيد حذف العقد بشكل نهائي؟ لا يمكن التراجع!")) {
                      onDeleteInstallment(selectedFileContract.id);
                      setSelectedFileContract(null);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl flex items-center gap-1 shadow transition-all mr-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف العقد
                </button>
              )}
              
              {((finalPerms?.installmentsAdd) || currentUser?.role === "admin") && (
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedFileContract;
                    openRenewModal(c);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="تجديد هذا العقد أو تمديد فترته"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  تجديد العقد
                </button>
              )}

              {onCreateReceiptForContract && (
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedFileContract;
                    setSelectedFileContract(null);
                    onCreateReceiptForContract(c);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="تحرير سند قبض جديد لهذا العقد"
                >
                  <span>💰</span>
                  تحرير سند قبض للعقد
                </button>
              )}

              {((finalPerms?.installmentsEdit) || currentUser?.role === "admin") && (
                <button
                  type="button"
                  onClick={() => {
                    handleEdit(selectedFileContract);
                    setSelectedFileContract(null);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center gap-1 shadow transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  تعديل الملف
                </button>
              )}

              <button
                type="button"
                onClick={() => onPrintContract(selectedFileContract.id)}
                className="px-5 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-xs rounded-xl flex items-center gap-1 shadow transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة العقد
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedFileContract(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-white font-black text-xs rounded-xl"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog before saving contract */}
      {showConfirmModal && pendingContractRow && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                  📝
                </div>
                <div className="text-right">
                  <h3 className="text-base font-black text-white">
                    تأكيد مراجعة وحفظ العقد
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    يرجى مراجعة كافة التفاصيل المالية والإدارية المدخلة قبل الحفظ النهائي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingContractRow(null);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-right font-sans">
              
              {/* Highlight Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                    {editId ? "تعديل عقد قائم" : "إنشاء عقد جديد"}
                  </span>
                  <div className="text-lg font-black text-white">
                    {pendingContractRow.client}
                  </div>
                  <div className="text-xs text-slate-400 font-bold mt-0.5">
                    رقم العقد: <span className="font-mono text-amber-300 font-bold">{pendingContractRow.no}</span>
                  </div>
                </div>

                <div className="text-right sm:text-left bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
                  <div className="text-[10px] text-slate-400 font-bold">اتجاه المعاملة</div>
                  <div className="text-xs font-black text-emerald-400">
                    {pendingContractRow.contract_direction_input === "علينا"
                      ? "🔴 علينا (مصروف / استحقاق)"
                      : pendingContractRow.contract_direction_input === "مصروفات عمالة"
                      ? "💼 مصروفات عمالة"
                      : "🟢 لنا (إيراد / تحصيل من عميل)"}
                  </div>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">رقم الهوية / الإقامة</span>
                  <span className="text-xs font-black text-white">{pendingContractRow.identity || "غير مدخل"}</span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">رقم الجوال</span>
                  <span className="text-xs font-black text-white" dir="ltr">{pendingContractRow.phone || "غير مدخل"}</span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">إجمالي مبلغ العقد</span>
                  <span className="text-sm font-black text-amber-400">
                    {Number(pendingContractRow.amount || 0).toLocaleString("ar-SA")} ريال
                  </span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">الدفعة المدفوعة مقدماً</span>
                  <span className="text-sm font-black text-emerald-400">
                    {Number(pendingContractRow.paid || 0).toLocaleString("ar-SA")} ريال
                  </span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">المبلغ المتبقي</span>
                  <span className="text-sm font-black text-rose-400">
                    {Number(pendingContractRow.remaining || 0).toLocaleString("ar-SA")} ريال
                  </span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">دورية السداد والقسط</span>
                  <span className="text-xs font-black text-cyan-300">
                    {pendingContractRow.cycle_input || "يومي"}
                    {pendingContractRow.installment ? ` — ${Number(pendingContractRow.installment).toLocaleString("ar-SA")} ريال` : ""}
                    {pendingContractRow.periods ? ` (${pendingContractRow.periods} فترة)` : ""}
                  </span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">الخزنة والمنطقة</span>
                  <span className="text-xs font-black text-white">
                    🏦 {pendingContractRow.treasury_input || "خزنة التحصيل"}
                    {pendingContractRow.region_input ? ` (${pendingContractRow.region_input})` : ""}
                  </span>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-[10px] font-bold text-slate-400 block">المشروع المرتبط</span>
                  <span className="text-xs font-black text-white">
                    🏗️ {pendingContractRow.project || "غير مرتبط بمشروع"}
                  </span>
                </div>

                {Number(pendingContractRow.capital_input || 0) > 0 && (
                  <div className="sm:col-span-2 bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-400 block">تمويل رأس المال المبدئي (تأسيس العقد)</span>
                    <span className="text-xs font-black text-amber-200">
                      💰 {Number(pendingContractRow.capital_input).toLocaleString("ar-SA")} ريال — المصدر: {pendingContractRow.capital_source_input}
                    </span>
                  </div>
                )}

                {pendingContractRow.notes && (
                  <div className="sm:col-span-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                    <span className="text-[10px] font-bold text-slate-400 block">ملاحظات العقد</span>
                    <span className="text-xs font-semibold text-slate-300">{pendingContractRow.notes}</span>
                  </div>
                )}

              </div>

              {/* Caution alert */}
              <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl text-xs text-blue-300 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>عند الضغط على "تأكيد وحفظ العقد"، سيتم حفظ بيانات العقد وتحديث السجلات والقيود المالية المرتبطة تلقائياً.</span>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingContractRow(null);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs rounded-xl transition-all cursor-pointer"
              >
                تعديل البيانات
              </button>

              <button
                type="button"
                disabled={isSavingContract}
                onClick={handleConfirmSave}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingContract ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    تأكيد وحفظ العقد النهائي
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dedicated Contract Renewal Modal */}
      {renewTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Renewal Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black text-lg">
                  <RotateCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    تجديد وتمديد العقد — {renewTarget.client}
                  </h3>
                  <p className="text-xs text-cyan-300/80 font-bold">
                    إنشاء دورة تجديد جديدة أو تمديد فترة العقد السابق رقم (<span className="font-mono text-white">{renewTarget.no}</span>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Renewal Modal Body */}
            <form onSubmit={handleExecuteRenewal} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 text-right">
                
                {/* Old Contract Snapshot Card */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-xs font-black text-slate-300">📋 بيانات العقد السابق المراد تجديده</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      الحالة: {renewTarget.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-400">رقم العقد:</span>
                      <span className="font-mono text-white font-black">{renewTarget.no}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">إجمالي المبلغ:</span>
                      <span className="font-mono text-amber-400 font-bold">{Number(renewTarget.amount || 0).toLocaleString()} ريال</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">المحصل سابقاً:</span>
                      <span className="font-mono text-emerald-400 font-bold">{Number(renewTarget.paid || 0).toLocaleString()} ريال</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">المتبقي السابق:</span>
                      <span className="font-mono text-rose-400 font-black">{Number(renewTarget.remaining || 0).toLocaleString()} ريال</span>
                    </div>
                  </div>
                </div>

                {/* Renewal Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-300">اختر آلية التجديد المطلوبة:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRenewMode("new_contract")}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                        renewMode === "new_contract"
                          ? "bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span className={`p-2 rounded-xl text-sm ${renewMode === "new_contract" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                        📄
                      </span>
                      <div>
                        <span className="block font-black text-xs">إنشاء عقد جديد مرتبط (موصى به)</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          توليد عقد مستقل برقم جديد مع ربطه بالعقد السابق وسجلاته المحاسبية
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRenewMode("extend_contract")}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                        renewMode === "extend_contract"
                          ? "bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span className={`p-2 rounded-xl text-sm ${renewMode === "extend_contract" ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                        ⏱️
                      </span>
                      <div>
                        <span className="block font-black text-xs">تمديد فترة وسداد نفس العقد</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          تحديث تاريخ الانتهاء وزيادة عدد الأقساط والقيمة لنفس العقد الحالي
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Form Fields for Renewal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {renewMode === "new_contract" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-300">رقم العقد الجديد (تلقائي)</label>
                      <input
                        type="text"
                        value={renewNewContractNo}
                        onChange={(e) => setRenewNewContractNo(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-300">تاريخ بدء التجديد</label>
                    <input
                      type="date"
                      value={renewStartDate}
                      onChange={(e) => setRenewStartDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-300">دورية السداد</label>
                    <select
                      value={renewCycle}
                      onChange={(e) => setRenewCycle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="يومي">يومي</option>
                      <option value="اسبوعي">أسبوعي</option>
                      <option value="نصف شهر">نصف شهري (كل 15 يوم)</option>
                      <option value="شهري">شهري</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-300">
                      {renewMode === "new_contract" ? "عدد فترات/أقساط العقد الجديد" : "إضافة فترات/أقساط إضافية"}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={renewPeriods}
                      onChange={(e) => setRenewPeriods(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-300">
                      {renewMode === "new_contract" ? "قيمة العقد الجديد الأساسية (ريال)" : "قيمة التمديد الإضافية (ريال)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={renewAmount}
                      onChange={(e) => setRenewAmount(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-black text-amber-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {renewMode === "new_contract" && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-300">الدفعة المقدمة المدفوعة فوراً (ريال)</label>
                      <input
                        type="number"
                        min={0}
                        value={renewDownPayment}
                        onChange={(e) => setRenewDownPayment(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-black text-emerald-400 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}
                </div>

                {/* Additional Options & Checkboxes */}
                <div className="space-y-2.5 pt-2">
                  {renewMode === "new_contract" && Number(renewTarget.remaining || 0) > 0 && (
                    <label className="flex items-center gap-3 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={renewIncludeRemaining}
                        onChange={(e) => setRenewIncludeRemaining(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      <span className="text-xs font-bold text-amber-300">
                        ترحيل وإضافة المتبقي من العقد السابق (<strong className="font-mono text-white">{Number(renewTarget.remaining).toLocaleString()} ريال</strong>) إلى إجمالي مبلغ العقد الجديد
                      </span>
                    </label>
                  )}

                  {renewMode === "new_contract" && (
                    <label className="flex items-center gap-3 p-3 bg-slate-950/40 border border-slate-800 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={renewCloseOld}
                        onChange={(e) => setRenewCloseOld(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-300">
                        إغلاق العقد القديم وتغيير حالته تلقائياً إلى (<span className="text-emerald-400">مكتمل</span>) عند إنشاء هذا التجديد
                      </span>
                    </label>
                  )}
                </div>

                {/* Notes Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-300">ملاحظات التجديد</label>
                  <input
                    type="text"
                    value={renewNotes}
                    onChange={(e) => setRenewNotes(e.target.value)}
                    placeholder="ملاحظات توثيق التجديد..."
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Computed Renewal Financial Summary */}
                {(() => {
                  const periodsNum = Number(renewPeriods || 0);
                  const baseAmount = Number(renewAmount || 0);
                  const remainingToAdd = renewIncludeRemaining ? Number(renewTarget.remaining || 0) : 0;
                  const totalAmount = baseAmount + remainingToAdd;
                  const downPaymentNum = Number(renewDownPayment || 0);
                  const discountNum = Number(renewDiscount || 0);
                  const finalRemaining = Math.max(0, totalAmount - downPaymentNum - discountNum);
                  const installmentVal = periodsNum > 0 ? Math.ceil(finalRemaining / periodsNum) : 0;

                  let calcEndDate = "";
                  if (periodsNum > 0 && renewStartDate) {
                    const d = new Date(renewStartDate);
                    if (renewCycle === "اسبوعي") {
                      d.setDate(d.getDate() + (periodsNum * 7) - 1);
                    } else if (renewCycle === "نصف شهر") {
                      d.setDate(d.getDate() + (periodsNum * 15) - 1);
                    } else if (renewCycle === "شهري") {
                      d.setMonth(d.getMonth() + periodsNum);
                      d.setDate(d.getDate() - 1);
                    } else {
                      d.setDate(d.getDate() + periodsNum - 1);
                    }
                    calcEndDate = d.toISOString().slice(0, 10);
                  }

                  return (
                    <div className="p-4 bg-gradient-to-br from-cyan-950/30 to-slate-950 border border-cyan-500/30 rounded-2xl space-y-2">
                      <span className="block text-[10px] font-black text-cyan-400 uppercase">
                        📊 المعاينة المالية للتجديد:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="block text-[10px] text-slate-400">إجمالي المبلغ:</span>
                          <span className="font-mono text-amber-400 font-black">{totalAmount.toLocaleString()} ريال</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="block text-[10px] text-slate-400">المتبقي للتحصيل:</span>
                          <span className="font-mono text-rose-400 font-black">{finalRemaining.toLocaleString()} ريال</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="block text-[10px] text-slate-400">قيمة القسط ({renewCycle}):</span>
                          <span className="font-mono text-emerald-400 font-black">{installmentVal.toLocaleString()} ريال</span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="block text-[10px] text-slate-400">تاريخ الانتهاء المتوقع:</span>
                          <span className="font-mono text-cyan-300 font-bold">{calcEndDate || "غير محدد"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* Renewal Modal Footer Actions */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setRenewTarget(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-black text-xs rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isRenewing}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRenewing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      جاري تنفيذ التجديد...
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-4 h-4" />
                      تأكيد وحفظ تجديد العقد
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
