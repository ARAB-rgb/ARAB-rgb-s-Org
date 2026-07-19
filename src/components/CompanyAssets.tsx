/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Car, Building, Wrench, Package, Search, Plus, Trash2, Edit2, Calendar, Check, X,
  AlertCircle, Printer, Download, Coins, Briefcase, Eye, ClipboardList, Settings, TrendingUp
} from "lucide-react";
import { sb } from "../db";
import { User as AuthUser, Company, CompanyAsset, CompanyAssetMaintenanceLog } from "../types";

interface CompanyAssetsProps {
  currentUser: AuthUser | null;
  companies: Company[];
  selectedCompanyId: string;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function CompanyAssets({
  currentUser,
  companies,
  selectedCompanyId,
  showToast,
}: CompanyAssetsProps) {
  // State for assets list
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add / Edit asset modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CompanyAsset | null>(null);

  // Form states for asset
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [type, setType] = useState("vehicle");
  const [model, setModel] = useState("");
  const [plateNumberOrTitle, setPlateNumberOrTitle] = useState("");
  const [mileage, setMileage] = useState<number | "">("");
  const [status, setStatus] = useState("active");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Detailed View Drawer/Modal state
  const [selectedAsset, setSelectedAsset] = useState<CompanyAsset | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Maintenance Log Form state (inside detailed modal)
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [maintenanceDesc, setMaintenanceDesc] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState<number | "">("");
  const [maintenanceMileage, setMaintenanceMileage] = useState<number | "">("");
  const [maintenanceStatus, setMaintenanceStatus] = useState<"completed" | "pending">("completed");

  const logSession = async (user: AuthUser, action: string) => {
    try {
      const log = {
        id: Math.random().toString(36).substring(7),
        name: user.name,
        code: user.code,
        role: user.role,
        time: new Date().toLocaleTimeString("ar-SA"),
        action,
        created_at: new Date().toISOString(),
      };
      await sb.from("sessions").insert(log);
    } catch (e) {
      console.error("Session log error:", e);
    }
  };

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

  // Fetch Assets from DB
  const loadAssets = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await sb
        .from("company_assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not load company assets from DB:", error);
      } else {
        // Parse maintenance logs JSON string if stored as string
        const parsed: CompanyAsset[] = (data || []).map((item: any) => {
          let logs: CompanyAssetMaintenanceLog[] = [];
          if (item.maintenance_logs) {
            try {
              logs = typeof item.maintenance_logs === "string" 
                ? JSON.parse(item.maintenance_logs) 
                : item.maintenance_logs;
            } catch (e) {
              console.warn("Error parsing maintenance logs for", item.id, e);
            }
          }
          return {
            ...item,
            maintenance_logs: logs,
          };
        });
        setAssets(parsed);
      }
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [currentUser]);

  // Handle Save / Update Asset
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("يرجى إدخال اسم الأصل!", "error");
      return;
    }

    const targetCompany = companyId || getAuthorizedCompanies()[0]?.id || "arab_world";

    const payload: Partial<CompanyAsset> = {
      name: name.trim(),
      company_id: targetCompany,
      type,
      model: model.trim() || undefined,
      plate_number_or_title: plateNumberOrTitle.trim() || undefined,
      mileage: type === "vehicle" && mileage !== "" ? Number(mileage) : undefined,
      status,
      purchase_date: purchaseDate || undefined,
      purchase_value: purchaseValue !== "" ? Number(purchaseValue) : undefined,
      notes: notes.trim() || undefined,
    };

    setLoading(true);
    try {
      if (editingAsset) {
        // Keep current maintenance logs
        const { error } = await sb
          .from("company_assets")
          .update({
            ...payload,
            maintenance_logs: JSON.stringify(editingAsset.maintenance_logs || []),
          })
          .eq("id", editingAsset.id);

        if (error) throw error;
        showToast(`تم تحديث بيانات الأصل "${name}" بنجاح!`, "success");
        if (currentUser) {
          await logSession(currentUser, `تعديل بيانات الأصل: ${name} (${type})`);
        }
      } else {
        const newId = Math.random().toString(36).substring(7);
        const { error } = await sb
          .from("company_assets")
          .insert({
            id: newId,
            ...payload,
            maintenance_logs: JSON.stringify([]),
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        showToast(`تم إضافة الأصل الجديد "${name}" بنجاح!`, "success");
        if (currentUser) {
          await logSession(currentUser, `إضافة أصل جديد للشركة: ${name} (${type})`);
        }
      }

      setShowModal(false);
      clearForm();
      await loadAssets();
    } catch (err: any) {
      showToast(`فشلت العملية: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Asset
  const handleDeleteAsset = async (id: string, assetName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الأصل "${assetName}" نهائياً من النظام؟`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb.from("company_assets").delete().eq("id", id);
      if (error) throw error;

      showToast(`تم حذف الأصل "${assetName}" بنجاح.`, "success");
      if (currentUser) {
        await logSession(currentUser, `حذف أصل من النظام: ${assetName}`);
      }
      await loadAssets();
      if (selectedAsset?.id === id) {
        setShowDetailModal(false);
        setSelectedAsset(null);
      }
    } catch (err: any) {
      showToast(`فشل الحذف: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Maintenance Log
  const handleAddMaintenanceLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    if (!maintenanceDesc.trim()) {
      showToast("يرجى وصف أعمال الصيانة!", "error");
      return;
    }

    const logEntry: CompanyAssetMaintenanceLog = {
      id: Math.random().toString(36).substring(7),
      date: maintenanceDate,
      description: maintenanceDesc.trim(),
      cost: maintenanceCost !== "" ? Number(maintenanceCost) : 0,
      mileage_at_maintenance: selectedAsset.type === "vehicle" && maintenanceMileage !== "" ? Number(maintenanceMileage) : undefined,
      status: maintenanceStatus,
    };

    const currentLogs = selectedAsset.maintenance_logs || [];
    const updatedLogs = [logEntry, ...currentLogs];

    // Optional: if vehicle and mileage entered is higher than current mileage, update asset mileage automatically
    let updatedMileage = selectedAsset.mileage;
    if (
      selectedAsset.type === "vehicle" &&
      maintenanceMileage !== "" &&
      Number(maintenanceMileage) > Number(selectedAsset.mileage || 0)
    ) {
      updatedMileage = Number(maintenanceMileage);
    }

    // Also: if status of maintenance is pending, we can optionally switch asset status to maintenance
    let updatedStatus = selectedAsset.status;
    if (maintenanceStatus === "pending") {
      updatedStatus = "maintenance";
    }

    setLoading(true);
    try {
      const { error } = await sb
        .from("company_assets")
        .update({
          maintenance_logs: JSON.stringify(updatedLogs),
          mileage: updatedMileage,
          status: updatedStatus,
        })
        .eq("id", selectedAsset.id);

      if (error) throw error;

      showToast("تم تسجيل قيد الصيانة بنجاح وتحديث ملف الأصل المالي.", "success");
      if (currentUser) {
        await logSession(
          currentUser,
          `تسجيل أعمال صيانة على الأصل: ${selectedAsset.name} بقيمة ${logEntry.cost} ريال`
        );
      }

      // Refresh list and detail modal state
      const updatedAsset: CompanyAsset = {
        ...selectedAsset,
        maintenance_logs: updatedLogs,
        mileage: updatedMileage,
        status: updatedStatus,
      };
      setSelectedAsset(updatedAsset);
      
      // Clear log form
      setMaintenanceDesc("");
      setMaintenanceCost("");
      setMaintenanceMileage("");
      setMaintenanceStatus("completed");

      await loadAssets();
    } catch (err: any) {
      showToast(`فشل إضافة الصيانة: ${err.message || err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Asset Form
  const openEditModal = (asset: CompanyAsset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setCompanyId(asset.company_id);
    setType(asset.type);
    setModel(asset.model || "");
    setPlateNumberOrTitle(asset.plate_number_or_title || "");
    setMileage(asset.mileage || "");
    setStatus(asset.status);
    setPurchaseDate(asset.purchase_date || "");
    setPurchaseValue(asset.purchase_value || "");
    setNotes(asset.notes || "");
    setShowModal(true);
  };

  const clearForm = () => {
    setEditingAsset(null);
    setName("");
    setCompanyId(getAuthorizedCompanies()[0]?.id || "");
    setType("vehicle");
    setModel("");
    setPlateNumberOrTitle("");
    setMileage("");
    setStatus("active");
    setPurchaseDate("");
    setPurchaseValue("");
    setNotes("");
  };

  // Filter Logic
  const getVisibleAssets = () => {
    return assets.filter((item) => {
      // 1. Authorized company
      if (!isCompanyAuthorized(item.company_id)) return false;

      // 2. Global dropdown filter
      if (selectedCompanyId !== "all" && item.company_id !== selectedCompanyId) return false;

      // 3. Search query
      const query = searchTerm.toLowerCase().trim();
      const text = `${item.name} ${item.model || ""} ${item.plate_number_or_title || ""} ${item.notes || ""}`.toLowerCase();
      if (query && !text.includes(query)) return false;

      // 4. Type filter
      if (typeFilter !== "all" && item.type !== typeFilter) return false;

      // 5. Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      return true;
    });
  };

  const visibleAssets = getVisibleAssets();

  // Stats calculation
  const totalAssetsCount = visibleAssets.length;
  const activeAssetsCount = visibleAssets.filter(a => a.status === "active").length;
  const maintenanceCount = visibleAssets.filter(a => a.status === "maintenance").length;
  const totalPurchaseValue = visibleAssets.reduce((sum, a) => sum + (a.purchase_value || 0), 0);
  const totalMaintenanceValue = visibleAssets.reduce((sum, a) => {
    const logs = a.maintenance_logs || [];
    return sum + logs.reduce((subSum, l) => subSum + (l.cost || 0), 0);
  }, 0);

  // Asset type translating helper
  const getTypeLabel = (t: string) => {
    switch (t) {
      case "vehicle": return "سيارات ومركبات";
      case "real_estate": return "عقارات ومباني";
      case "equipment": return "معدات وأجهزة";
      default: return "أصول أخرى";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "active":
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">نشط</span>;
      case "maintenance":
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">تحت الصيانة</span>;
      case "sold":
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">مباع</span>;
      default:
        return <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20">غير نشط</span>;
    }
  };

  return (
    <div className="space-y-6 text-right selection:bg-amber-500/30" dir="rtl">
      {/* Header and Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500/20 to-yellow-500/5 border border-amber-500/30 rounded-xl text-amber-500">
              <Building className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            إدارة أصول وممتلكات الشركة
          </h1>
          <p className="text-[11px] text-slate-400 mt-1">
            تسجيل وتتبع الأصول الثابتة، العقارات، أسطول السيارات ومتابعة خطط وجداول الصيانة التلقائية ومستويات الاستهلاك المالي للأصل.
          </p>
        </div>
        <button
          onClick={() => {
            clearForm();
            setShowModal(true);
          }}
          className="px-5 py-2.5 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          تسجيل أصل جديد
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400">إجمالي الأصول المقيدة</span>
            <div className="p-2 bg-slate-800 text-amber-500 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white font-mono">{totalAssetsCount}</h3>
            <span className="text-[9px] text-slate-500">أصول مسجلة ومعتمدة تحت المتابعة</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400">الأصول التشغيلية النشطة</span>
            <div className="p-2 bg-slate-800 text-emerald-400 rounded-lg">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-400 font-mono">{activeAssetsCount}</h3>
            <span className="text-[9px] text-slate-500">أصول تعمل بكفاءة وبشكل نشط</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400">أصول قيد الصيانة والإصلاح</span>
            <div className="p-2 bg-slate-800 text-amber-400 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-400 font-mono">{maintenanceCount}</h3>
            <span className="text-[9px] text-slate-500">حالات صيانة جارية أو معلقة</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400">القيمة المالية الإجمالية للأصول</span>
            <div className="p-2 bg-slate-800 text-indigo-400 rounded-lg">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-black text-white font-mono">
              {totalPurchaseValue.toLocaleString()} <span className="text-[10px] text-slate-400">ريال</span>
            </h3>
            <span className="text-[9px] text-slate-500">إجمالي تكلفة الشراء التراكمية</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم الأصل، الموديل، اللوحة أو رقم الصك..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-slate-900/50 border border-white/5 text-xs text-white rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 transition-all font-medium text-right"
          />
        </div>

        {/* Dropdowns Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Asset Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden sm:inline">نوع الأصل:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-white/5 text-[11px] text-white py-2 px-3 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">كل الأنواع</option>
              <option value="vehicle">سيارات ومركبات</option>
              <option value="real_estate">عقارات ومباني</option>
              <option value="equipment">معدات وأجهزة</option>
              <option value="other">أصول أخرى</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden sm:inline">الحالة التشغيلية:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/5 text-[11px] text-white py-2 px-3 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="maintenance">تحت الصيانة</option>
              <option value="sold">مباع</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Assets Table/Grid */}
      {loading && assets.length === 0 ? (
        <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-10 h-10 border-2 border-dashed border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          جاري تحميل وتزامن قائمة الأصول السحابية...
        </div>
      ) : visibleAssets.length === 0 ? (
        <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-12 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white">لم يتم العثور على أصول مطابقة للمواصفات</h4>
          <p className="text-xs text-slate-500 mt-1">يرجى تعديل خيارات البحث أو تصفية العرض، أو إضافة أصل جديد للشركة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleAssets.map((asset) => {
            const companyName = companies.find(c => c.id === asset.company_id)?.name || "عرب وورلد";
            const logsCount = asset.maintenance_logs?.length || 0;
            const assetTotalMaintenance = (asset.maintenance_logs || []).reduce((sum, l) => sum + (l.cost || 0), 0);

            return (
              <div
                key={asset.id}
                className="bg-slate-900/30 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-lg hover:border-amber-500/20 transition-all group flex flex-col justify-between"
              >
                {/* Header Card */}
                <div className="p-5 border-b border-white/5 relative">
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    {getStatusBadge(asset.status)}
                  </div>
                  
                  {/* Type Icon */}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800 text-amber-500 rounded-xl group-hover:bg-amber-500/10 transition-colors">
                      {asset.type === "vehicle" && <Car className="w-5 h-5" />}
                      {asset.type === "real_estate" && <Building className="w-5 h-5" />}
                      {asset.type === "equipment" && <Wrench className="w-5 h-5" />}
                      {asset.type !== "vehicle" && asset.type !== "real_estate" && asset.type !== "equipment" && <Package className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">{asset.name}</h3>
                      <span className="text-[9px] text-slate-500 font-medium block mt-0.5">{companyName}</span>
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4 flex-grow">
                  {/* Grid Fields */}
                  <div className="grid grid-cols-2 gap-3 text-right">
                    {asset.type === "vehicle" && (
                      <>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">الموديل / سنة الصنع</span>
                          <b className="text-xs text-white block mt-0.5">{asset.model || "غير محدد"}</b>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">عداد المسافة (ماشية)</span>
                          <b className="text-xs text-amber-400 font-mono block mt-0.5">{(asset.mileage || 0).toLocaleString()} كم</b>
                        </div>
                        <div className="col-span-2 bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">رقم اللوحة / الترخيص</span>
                          <b className="text-xs text-white font-mono block mt-0.5">{asset.plate_number_or_title || "غير محدد"}</b>
                        </div>
                      </>
                    )}

                    {asset.type === "real_estate" && (
                      <>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 col-span-2">
                          <span className="text-[9px] text-slate-400 block">رقم الصك / سند الملكية</span>
                          <b className="text-xs text-white font-mono block mt-0.5">{asset.plate_number_or_title || "غير محدد"}</b>
                        </div>
                        <div className="col-span-2 bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">ملاحظات العقار</span>
                          <span className="text-[10px] text-slate-300 block mt-0.5 line-clamp-1">{asset.notes || "لا توجد تفاصيل"}</span>
                        </div>
                      </>
                    )}

                    {asset.type !== "vehicle" && asset.type !== "real_estate" && (
                      <>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">الرقم التسلسلي</span>
                          <b className="text-xs text-white font-mono block mt-0.5">{asset.plate_number_or_title || "غير محدد"}</b>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">سنة الصنع / الموديل</span>
                          <b className="text-xs text-white block mt-0.5">{asset.model || "غير محدد"}</b>
                        </div>
                        <div className="col-span-2 bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-slate-400 block">تفاصيل الأصل</span>
                          <span className="text-[10px] text-slate-300 block mt-0.5 line-clamp-1">{asset.notes || "لا توجد تفاصيل"}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Financial Quick Box */}
                  <div className="bg-gradient-to-tr from-slate-900 to-slate-950 p-3 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">قيمة الشراء:</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {asset.purchase_value ? `${asset.purchase_value.toLocaleString()} ريال` : "غير مقيد"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-1.5">
                      <span className="text-slate-400">مصاريف الصيانة التراكمية:</span>
                      <span className="text-amber-400 font-mono font-bold">
                        {assetTotalMaintenance > 0 ? `${assetTotalMaintenance.toLocaleString()} ريال` : "0 ريال"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-5 pt-0 border-t border-white/5 bg-slate-950/20 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowDetailModal(true);
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    عرض التفاصيل والصيانة ({logsCount})
                  </button>
                  <button
                    onClick={() => openEditModal(asset)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-500 rounded-xl transition-colors cursor-pointer"
                    title="تعديل الأصل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset.id, asset.name)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-500 rounded-xl transition-colors cursor-pointer"
                    title="مسح الأصل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add/Edit Asset */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 left-6 p-1.5 bg-slate-850 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                {editingAsset ? "تعديل بيانات الأصل الثابت" : "تسجيل أصل وممتلكات جديدة"}
              </h2>
              <p className="text-[10px] text-slate-400">أدخل المعلومات الأساسية للأصل لإدراجه في التقارير المالية والرقابية للشركة.</p>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-4 text-right">
              {/* Row 1: Name & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">اسم الأصل / المسمى الثبت *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: هايلوكس 2023 - مكتب فرع الرياض"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50 text-right"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">الشركة المالكة للأصل *</label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50"
                  >
                    {getAuthorizedCompanies().map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Type & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">تصنيف الأصل الثابت</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="vehicle">سيارة أو مركبة</option>
                    <option value="real_estate">عقارات ومباني / أراضي</option>
                    <option value="equipment">أجهزة، خوادم، معدات ثقيلة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">الحالة التشغيلية</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="active">نشط وبحالة ممتازة</option>
                    <option value="maintenance">تحت الصيانة والإصلاح</option>
                    <option value="sold">تم بيعه (خارج الأصول)</option>
                    <option value="inactive">معطل أو خارج الخدمة</option>
                  </select>
                </div>
              </div>

              {/* Conditional Row: Vehicles-only properties */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">
                    {type === "vehicle" ? "الموديل (سنة الصنع)" : "الموديل / المواصفة"}
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 2023 / V6"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50 text-right font-mono"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400">
                    {type === "vehicle" ? "رقم اللوحة المرورية" : type === "real_estate" ? "رقم الصك العقاري" : "الرقم التسلسلي / السيريال"}
                  </label>
                  <input
                    type="text"
                    placeholder={type === "vehicle" ? "مثال: أ ب ج 1234" : "مثال: صك رقم 1029384756"}
                    value={plateNumberOrTitle}
                    onChange={(e) => setPlateNumberOrTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50 text-right"
                  />
                </div>
              </div>

              {type === "vehicle" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">قراءة العداد الحالية (كم ماشية)</label>
                  <input
                    type="number"
                    placeholder="مثال: 45000"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50 text-right font-mono"
                  />
                </div>
              )}

              {/* Purchase Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">تاريخ الاستحواذ / الشراء</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400">قيمة الأصل المالية (عند الشراء)</label>
                  <input
                    type="number"
                    placeholder="مثال: 125000"
                    value={purchaseValue}
                    onChange={(e) => setPurchaseValue(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50 text-right font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">ملاحظات إدارية وتفاصيل إضافية</label>
                <textarea
                  placeholder="ملاحظات حول حالة الأصل، رقم التأمين، شروط الضمان..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-amber-500/50 text-right"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {loading ? "جاري التثبيت ماليًا..." : editingAsset ? "حفظ وتعديل الأصل الثابت" : "اعتماد وتسجيل الأصل الثابت"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Asset Detailed View & Maintenance Logs */}
      {showDetailModal && selectedAsset && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedAsset(null);
              }}
              className="absolute top-6 left-6 p-1.5 bg-slate-850 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="flex items-start gap-4 pb-4 border-b border-white/5">
              <div className="p-3 bg-gradient-to-tr from-amber-500/20 to-yellow-500/5 border border-amber-500/30 rounded-2xl text-amber-500">
                {selectedAsset.type === "vehicle" && <Car className="w-6 h-6" />}
                {selectedAsset.type === "real_estate" && <Building className="w-6 h-6" />}
                {selectedAsset.type === "equipment" && <Wrench className="w-6 h-6" />}
                {selectedAsset.type !== "vehicle" && selectedAsset.type !== "real_estate" && selectedAsset.type !== "equipment" && <Package className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{selectedAsset.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                  <span>تصنيف: <strong className="text-slate-200">{getTypeLabel(selectedAsset.type)}</strong></span>
                  <span>•</span>
                  <span>المالك: <strong className="text-amber-400">
                    {companies.find(c => c.id === selectedAsset.company_id)?.name || "عرب وورلد"}
                  </strong></span>
                </div>
              </div>
            </div>

            {/* Detailed Info Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-slate-400">تاريخ الشراء / الاستحواذ</span>
                <b className="text-xs text-white block mt-1 font-mono">{selectedAsset.purchase_date || "غير مقيد"}</b>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-slate-400">تكلفة الشراء</span>
                <b className="text-xs text-emerald-400 block mt-1 font-mono">
                  {selectedAsset.purchase_value ? `${selectedAsset.purchase_value.toLocaleString()} ريال` : "غير مقيد"}
                </b>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-slate-400">
                  {selectedAsset.type === "vehicle" ? "قراءة العداد الحالية" : "رقم التعريف/الصك"}
                </span>
                <b className="text-xs text-white block mt-1 font-mono">
                  {selectedAsset.type === "vehicle" 
                    ? `${(selectedAsset.mileage || 0).toLocaleString()} كم` 
                    : selectedAsset.plate_number_or_title || "غير محدد"}
                </b>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                <span className="text-[10px] text-slate-400">حالة الأصل الحالية</span>
                <div className="mt-1">{getStatusBadge(selectedAsset.status)}</div>
              </div>
            </div>

            {/* Asset Notes block */}
            {selectedAsset.notes && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl text-[11px] text-amber-200">
                <strong>وصف وملاحظات الأصل: </strong>
                {selectedAsset.notes}
              </div>
            )}

            {/* Middle Section: Split into Maintenance Logger Form & History Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              
              {/* Left Column: Maintenance logger form */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-500" />
                    تسجيل أعمال صيانة جديدة
                  </h3>
                  <p className="text-[10px] text-slate-400">تسجيل الفواتير والأعمال المنفذة على هذا الأصل لمراقبة تكلفة تشغيل الأصل بمرور الوقت.</p>
                </div>

                <form onSubmit={handleAddMaintenanceLog} className="space-y-3.5 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">تاريخ الصيانة</label>
                      <input
                        type="date"
                        required
                        value={maintenanceDate}
                        onChange={(e) => setMaintenanceDate(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 text-[11px] text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">الحالة التشغيلية للصيانة</label>
                      <select
                        value={maintenanceStatus}
                        onChange={(e) => setMaintenanceStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/5 text-[11px] text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="completed">تمت الصيانة ودفع القيمة</option>
                        <option value="pending">مجدولة / قيد التنفيذ والعمل</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400">وصف دقيق لأعمال الصيانة المنفذة *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تغيير إطارات وتغيير زيت السيرفو والفرامل"
                      value={maintenanceDesc}
                      onChange={(e) => setMaintenanceDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-white/5 text-[11px] text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/50 text-right"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">تكلفة أعمال الصيانة (ريال)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={maintenanceCost}
                        onChange={(e) => setMaintenanceCost(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/5 text-[11px] text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/50 text-right font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">
                        {selectedAsset.type === "vehicle" ? "قراءة العداد للسيارة (كم)" : "رقم فاتورة الصيانة / القيد"}
                      </label>
                      <input
                        type="number"
                        placeholder={selectedAsset.type === "vehicle" ? "مثال: 45200" : "مثال: 50401"}
                        value={maintenanceMileage}
                        onChange={(e) => setMaintenanceMileage(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/5 text-[11px] text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500/50 text-right font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-[11px] hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    تقييد قيد الصيانة ماليًا للأصل
                  </button>
                </form>
              </div>

              {/* Right Column: Maintenance history logs list */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-amber-500" />
                    تاريخ وسجل عمليات الصيانة المنفذة
                  </h3>
                  <p className="text-[10px] text-slate-400">سجل كامل بجميع الفواتير والإجراءات الفنية المسجلة للأصل.</p>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {!selectedAsset.maintenance_logs || selectedAsset.maintenance_logs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-white/5 border border-white/5 rounded-2xl text-[11px]">
                      لا يوجد أي عمليات صيانة مقيدة في سجل هذا الأصل حتى الآن.
                    </div>
                  ) : (
                    selectedAsset.maintenance_logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl space-y-1.5 text-right transition-all relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-slate-400 font-mono">{log.date}</span>
                          <span className={`px-2 py-0.5 text-[8px] font-bold rounded-lg ${
                            log.status === "completed" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {log.status === "completed" ? "منفذة" : "تحت التنفيذ"}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-white leading-relaxed">{log.description}</h4>
                        <div className="flex items-center gap-4 text-[9px] text-slate-400 pt-1 border-t border-white/5">
                          <span>تكلفة: <strong className="text-emerald-400 font-mono font-bold">{log.cost.toLocaleString()} ريال</strong></span>
                          {log.mileage_at_maintenance !== undefined && (
                            <span>
                              {selectedAsset.type === "vehicle" ? "قراءة العداد: " : "القيد/الفاتورة: "}
                              <strong className="text-slate-200 font-mono">{log.mileage_at_maintenance.toLocaleString()}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Detail Modal Footer */}
            <div className="pt-4 border-t border-white/5 flex justify-between items-center bg-slate-950/20 p-4 -mx-6 -mb-6 rounded-b-3xl">
              <span className="text-[10px] text-slate-500">
                رقم ملف الأصل الثابت: <strong className="font-mono text-slate-300">AW-ASSET-{selectedAsset.id.toUpperCase()}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAsset(null);
                }}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
