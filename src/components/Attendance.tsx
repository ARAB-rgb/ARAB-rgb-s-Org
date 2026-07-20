/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  MapPin, Clock, User, CheckCircle, XCircle, AlertCircle, Search, Trash2, Calendar,
  ArrowUpRight, ArrowDownRight, Sparkles, Navigation, ShieldCheck, ClipboardList, Plus,
  Info, Shield, Settings, HelpCircle, Laptop, Users, Check, ExternalLink, HelpCircle as HelpIcon
} from "lucide-react";
import { Worker, Project, AttendanceRecord, Company, User as AuthUser } from "../types";
import { sb } from "../db";

interface AttendanceProps {
  currentUser: AuthUser | null;
  workers: Worker[];
  projects: Project[];
  attendances: AttendanceRecord[];
  companies: Company[];
  selectedCompanyId?: string;
  onUpdate?: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  onAutoLogout?: () => void;
  isAttendanceOnly?: boolean;
}

// Haversine formula to compute distance in meters between two coordinates
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Helper to parse "HH:MM:SS" or "HH:MM" into minutes
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const hrs = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  return hrs * 60 + mins;
}

// Helper to format minutes into "Xس Yد"
function formatMinutesToHoursMins(totalMins: number): string {
  if (totalMins <= 0) return "0د";
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}د`;
  if (mins === 0) return `${hrs}س`;
  return `${hrs}س ${mins}د`;
}

export const Attendance: React.FC<AttendanceProps> = ({
  currentUser,
  workers,
  projects,
  attendances,
  companies,
  selectedCompanyId = "all",
  onUpdate,
  showToast,
  onAutoLogout,
  isAttendanceOnly = false
}) => {
  // Live Clock states
  const [liveTime, setLiveTime] = useState<string>("");
  const [liveDate, setLiveDate] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString("ar-EG", { hour12: true }));
      setLiveDate(now.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // UI Active Navigation/View inside Attendance Tab
  const [activeTab, setActiveTab] = useState<"records" | "guide">("records");

  // Filter & Form states
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [bypassGpsRange, setBypassGpsRange] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters for history logs
  const [filterWorker, setFilterWorker] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Live Captured Geolocation Info
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [capturedLat, setCapturedLat] = useState<number | null>(null);
  const [capturedLng, setCapturedLng] = useState<number | null>(null);
  const [computedDistance, setComputedDistance] = useState<number | null>(null);

  // Manual Punch dialog / states for Admins
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [mWorkerId, setMWorkerId] = useState<string>("");
  const [mProjectId, setMProjectId] = useState<string>("");
  const [mDate, setMDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [mCheckIn, setMCheckIn] = useState<string>("08:00");
  const [mCheckOut, setMCheckOut] = useState<string>("17:00");
  const [mNotes, setMNotes] = useState<string>("");

  // Dynamic state for Custom Permission Controls
  const [reqGpsBiometrics, setReqGpsBiometrics] = useState<boolean>(() => {
    const val = localStorage.getItem("att_reqGpsBiometrics");
    return val !== null ? val === "true" : true;
  });
  const [allowEmployeeSelfPunch, setAllowEmployeeSelfPunch] = useState<boolean>(() => {
    const val = localStorage.getItem("att_allowEmployeeSelfPunch");
    return val !== null ? val === "true" : true;
  });
  const [allowSupervisorBypass, setAllowSupervisorBypass] = useState<boolean>(() => {
    const val = localStorage.getItem("att_allowSupervisorBypass");
    return val !== null ? val === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("att_reqGpsBiometrics", String(reqGpsBiometrics));
  }, [reqGpsBiometrics]);

  useEffect(() => {
    localStorage.setItem("att_allowEmployeeSelfPunch", String(allowEmployeeSelfPunch));
  }, [allowEmployeeSelfPunch]);

  useEffect(() => {
    localStorage.setItem("att_allowSupervisorBypass", String(allowSupervisorBypass));
  }, [allowSupervisorBypass]);

  // Check if current user role matches
  const isAdmin = currentUser?.role === "admin";
  const isSupervisor = currentUser?.role === "supervisor";
  const isEmployee = currentUser?.role === "employee";
  const isAuthorizedToBypass = isAdmin || (isSupervisor && allowSupervisorBypass);

  // Robust Arabic normalizer to avoid mismatches due to minor spelling/orthography differences
  const normalizeArabic = (str: string): string => {
    if (!str) return "";
    return str
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u0652]/g, "") // Remove harakat (diacritics)
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ");
  };

  // Automatically match logged in user to their Worker Profile using multi-tier fallback (ID, Code, Normalized Name)
  const matchedWorker = workers.find((w) => {
    if (!currentUser) return false;
    
    // 1. Match by primary key id (UUID)
    if (currentUser.worker_id && w.id === currentUser.worker_id) return true;
    
    // 2. Match by string-based worker_id code (e.g. employee card / ID)
    if (currentUser.worker_id && w.worker_id === currentUser.worker_id) return true;
    
    // 3. Match by robust normalized name comparison
    if (normalizeArabic(w.name) === normalizeArabic(currentUser.name)) return true;
    
    return false;
  });

  useEffect(() => {
    if (isEmployee && matchedWorker) {
      setSelectedWorkerId(matchedWorker.id);
      // Auto-set the project assigned to this worker if it exists
      if (matchedWorker.project) {
        const p = projects.find((proj) => proj.name === matchedWorker.project);
        if (p) {
          setSelectedProjectId(p.id);
        }
      }
    }
  }, [currentUser, matchedWorker, workers, projects, isEmployee]);

  // Handle worker dropdown change
  const handleWorkerChange = (workerId: string) => {
    if (isEmployee) return; // Prevent changing if simple worker role
    setSelectedWorkerId(workerId);
    if (!workerId) return;

    const worker = workers.find((w) => w.id === workerId);
    if (worker && worker.project) {
      const matchedProj = projects.find((p) => p.name === worker.project);
      if (matchedProj) {
        setSelectedProjectId(matchedProj.id);
      } else {
        setSelectedProjectId("");
      }
    } else {
      setSelectedProjectId("");
    }
  };

  const handleCreateAndLinkWorker = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const newWorkerId = Math.random().toString(36).substring(7);
      const codeId = currentUser.worker_id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const row = {
        id: newWorkerId,
        name: currentUser.name,
        worker_id: codeId,
        phone: currentUser.email || "",
        job: "عامل" as const,
        project: "",
        daily: 0,
        days: 0,
        advance: 0,
        total: 0,
        balance: 0,
        status: "على رأس العمل" as const,
        company_id: currentUser.company_id || (selectedCompanyId !== "all" ? selectedCompanyId : null),
        created_at: new Date().toISOString()
      };
      
      const { error } = await sb.from("workers").insert(row);
      if (error) {
        showToast(error.message, "error");
        return;
      }
      
      // Update the user's worker_id field so it is permanently linked
      const { error: userError } = await sb.from("users").update({ worker_id: newWorkerId }).eq("id", currentUser.id);
      if (userError) {
        console.error("Error updating user worker_id", userError);
      }
      
      showToast("تم إنشاء وربط ملف الموظف بنجاح! يمكنك الآن تسجيل الحضور والانصراف.", "success");
      if (onUpdate) await onUpdate();
    } catch (err) {
      showToast("حدث خطأ أثناء إنشاء ملف الموظف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Capture current Geolocation Coordinates
  const triggerGpsCapture = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        showToast("عذراً، المتصفح أو بيئة التشغيل الحالية لا تدعم تحديد الموقع الجغرافي!", "error");
        resolve(null);
        return;
      }

      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCapturedLat(Number(lat.toFixed(7)));
          setCapturedLng(Number(lng.toFixed(7)));
          setGpsLoading(false);
          resolve({ lat, lng });
        },
        (error) => {
          console.error("GPS error:", error);
          setGpsLoading(false);
          showToast("فشل التقاط موقعك الجغرافي. يرجى تفعيل إذن الـ GPS وإتاحة الموقع للمتصفح.", "error");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  };

  // Compute live distance to selected project on coordinate capture
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    if (capturedLat !== null && capturedLng !== null && selectedProject?.latitude && selectedProject?.longitude) {
      const dist = getDistanceInMeters(capturedLat, capturedLng, selectedProject.latitude, selectedProject.longitude);
      setComputedDistance(dist);
    } else {
      setComputedDistance(null);
    }
  }, [capturedLat, capturedLng, selectedProjectId, selectedProject]);

  // Filter logs according to permissions & choices
  const getFilteredLogs = () => {
    return attendances.filter((a) => {
      // Company level restriction
      if (selectedCompanyId && selectedCompanyId !== "all") {
        if (a.company_id && a.company_id !== selectedCompanyId) return false;
      }

      // Worker permission level: Employees can ONLY view their own records!
      if (isEmployee) {
        if (matchedWorker) {
          if (a.worker_id !== matchedWorker.id) return false;
        } else {
          // If employee user doesn't have an associated profile in the workers list, they only see matching name
          if (a.worker_name !== currentUser?.name) return false;
        }
      } else {
        // Admins and supervisors can filter by worker
        if (filterWorker && a.worker_id !== filterWorker) return false;
      }

      if (filterProject && a.project_id !== filterProject) return false;
      if (filterDate && a.date !== filterDate) return false;

      return true;
    });
  };

  const filteredLogs = getFilteredLogs();

  // Dynamic calculations for stats (replicates Mawqout's metrics cards)
  let totalWorkMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalBreakMinutes = 0;
  let incompleteRecordsCount = 0;

  filteredLogs.forEach((log) => {
    if (log.check_in_time && log.check_out_time) {
      const minsIn = parseTimeToMinutes(log.check_in_time);
      const minsOut = parseTimeToMinutes(log.check_out_time);
      let diff = minsOut - minsIn;
      if (diff < 0) diff += 1440; // support overnight shift wrap

      totalWorkMinutes += diff;

      // Overtime > 8 hours (480 minutes)
      if (diff > 480) {
        totalOvertimeMinutes += diff - 480;
      }

      // Simulated Break: 45 mins break for completed 8h shifts, otherwise 20 mins
      totalBreakMinutes += diff > 360 ? 45 : 20;
    } else if (log.check_in_time && !log.check_out_time) {
      incompleteRecordsCount++;
    }
  });

  // Calculate Absences and Leaves for the stats section
  const leavesCount = workers.filter((w) => {
    if (selectedCompanyId && selectedCompanyId !== "all" && w.company_id !== selectedCompanyId) return false;
    if (isEmployee && matchedWorker && w.id !== matchedWorker.id) return false;
    return w.status === "إجازة";
  }).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const clockedInTodayIds = attendances
    .filter((a) => a.date === todayStr)
    .map((a) => a.worker_id);

  const activeOnDutyWorkers = workers.filter((w) => {
    if (selectedCompanyId && selectedCompanyId !== "all" && w.company_id !== selectedCompanyId) return false;
    if (isEmployee && matchedWorker && w.id !== matchedWorker.id) return false;
    return w.status === "على رأس العمل";
  });

  const absencesCount = activeOnDutyWorkers.filter(
    (w) => !clockedInTodayIds.includes(w.id)
  ).length;

  // Perform Check-In (Biometric GPS Trigger)
  const handleCheckIn = async () => {
    if (isEmployee && !allowEmployeeSelfPunch) {
      showToast("عذراً، تم تعطيل التسجيل المباشر للموظفين من قبل الإدارة حالياً!", "error");
      return;
    }

    const workerIdToUse = isEmployee && matchedWorker ? matchedWorker.id : selectedWorkerId;
    if (!workerIdToUse) {
      showToast("يرجى اختيار الموظف أو العامل أولاً!", "warning");
      return;
    }

    if (!selectedProjectId) {
      showToast("يرجى تحديد المشروع أو موقع العمل الحالي لمطابقة الإحداثيات!", "warning");
      return;
    }

    setIsLoading(true);
    try {
      let coords: { lat: number; lng: number } | null = null;
      let distance: number | null = null;
      const proj = projects.find((p) => p.id === selectedProjectId);
      const isGpsRestricted = proj?.latitude && proj?.longitude;

      if (reqGpsBiometrics && isGpsRestricted) {
        coords = await triggerGpsCapture();
        if (!coords) {
          setIsLoading(false);
          return;
        }

        distance = getDistanceInMeters(coords.lat, coords.lng, proj.latitude!, proj.longitude!);
        const allowedRadius = proj.allowed_radius || 200;

        if (distance > allowedRadius && !bypassGpsRange) {
          showToast(
            `بصمة مرفوضة! أنت متواجد على بعد ${distance} متر خارج النطاق المعتمد للمشروع (${allowedRadius} م).`,
            "error"
          );
          setIsLoading(false);
          return;
        }
      }

      // Prevent duplicate check-in today
      const today = new Date().toISOString().slice(0, 10);
      const hasCheckedIn = attendances.some(
        (a) => a.worker_id === workerIdToUse && a.date === today && a.check_in_time
      );

      if (hasCheckedIn) {
        showToast("مسجل حضور بالفعل لهذا الموظف اليوم!", "warning");
        setIsLoading(false);
        return;
      }

      const targetWorker = workers.find((w) => w.id === workerIdToUse);
      const row: AttendanceRecord = {
        id: Math.random().toString(36).substring(7),
        worker_id: workerIdToUse,
        worker_name: targetWorker?.name || "عامل غير معروف",
        project_id: selectedProjectId,
        project_name: proj?.name || "مشروع غير معروف",
        date: today,
        check_in_time: new Date().toLocaleTimeString("ar-EG", { hour12: false }),
        check_in_lat: coords?.lat ?? undefined,
        check_in_lng: coords?.lng ?? undefined,
        distance_in_meters: distance ?? undefined,
        status: distance !== null && distance > (proj?.allowed_radius || 200) ? "حاضر (تجاوز النطاق)" : "حاضر (GPS)",
        company_id: proj?.company_id || targetWorker?.company_id,
        created_at: new Date().toISOString()
      };

      const { error } = await sb.from("attendance").insert(row);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast(`تم تسجيل بصمة حضور الموظف ${targetWorker?.name} بنجاح!`, "success");
      if (onUpdate) await onUpdate();
    } catch (err) {
      showToast("حدث خطأ أثناء الاتصال بالخادم لتسجيل البصمة", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Perform Check-Out (Biometric GPS Trigger)
  const handleCheckOut = async () => {
    if (isEmployee && !allowEmployeeSelfPunch) {
      showToast("عذراً، تم تعطيل تسجيل الحضور للموظفين حالياً!", "error");
      return;
    }

    const workerIdToUse = isEmployee && matchedWorker ? matchedWorker.id : selectedWorkerId;
    if (!workerIdToUse) {
      showToast("يرجى اختيار الموظف أو العامل أولاً!", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const activeRecord = attendances.find(
        (a) => a.worker_id === workerIdToUse && a.date === today && !a.check_out_time
      );

      if (!activeRecord) {
        showToast("لا توجد بصمة حضور نشطة ومفتوحة اليوم لتسجيل الانصراف عليها!", "warning");
        setIsLoading(false);
        return;
      }

      let coords: { lat: number; lng: number } | null = null;
      let distance: number | null = null;
      const proj = projects.find((p) => p.id === activeRecord.project_id);
      const isGpsRestricted = proj?.latitude && proj?.longitude;

      if (reqGpsBiometrics && isGpsRestricted) {
        coords = await triggerGpsCapture();
        if (!coords) {
          setIsLoading(false);
          return;
        }

        distance = getDistanceInMeters(coords.lat, coords.lng, proj.latitude!, proj.longitude!);
        const allowedRadius = proj.allowed_radius || 200;

        if (distance > allowedRadius && !bypassGpsRange) {
          showToast(
            `بصمة انصراف مرفوضة! أنت متواجد على بعد ${distance} متر خارج النطاق الجغرافي للمشروع.`,
            "error"
          );
          setIsLoading(false);
          return;
        }
      }

      const updatedRow = {
        ...activeRecord,
        check_out_time: new Date().toLocaleTimeString("ar-EG", { hour12: false }),
        check_out_lat: coords?.lat ?? undefined,
        check_out_lng: coords?.lng ?? undefined,
        status: activeRecord.status.includes("تجاوز") ? "حاضر (تجاوز النطاق)" : "حاضر تكميلي"
      };

      const { error } = await sb.from("attendance").update(updatedRow).eq("id", activeRecord.id);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast(`تم تسجيل بصمة انصراف الموظف وتأكيد نهاية شيفت اليوم!`, "success");
      if (onUpdate) await onUpdate();

      if (isAttendanceOnly && onAutoLogout) {
        showToast("جاري تسجيل الخروج التلقائي وتأمين الوردية...", "info");
        setTimeout(() => {
          onAutoLogout();
        }, 2000);
      }
    } catch (err) {
      showToast("حدث خطأ أثناء معالجة بصمة الانصراف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Save manual punch (from modal)
  const handleSaveManualPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mWorkerId || !mProjectId || !mDate) {
      showToast("يرجى ملء كافة الحقول الإلزامية لقيد الحضور!", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const targetWorker = workers.find((w) => w.id === mWorkerId);
      const proj = projects.find((p) => p.id === mProjectId);

      const row: AttendanceRecord = {
        id: Math.random().toString(36).substring(7),
        worker_id: mWorkerId,
        worker_name: targetWorker?.name || "عامل غير معروف",
        project_id: mProjectId,
        project_name: proj?.name || "مشروع غير معروف",
        date: mDate,
        check_in_time: mCheckIn ? `${mCheckIn}:00` : undefined,
        check_out_time: mCheckOut ? `${mCheckOut}:00` : undefined,
        status: "إدخال يدوي (إداري)",
        notes: mNotes.trim(),
        company_id: proj?.company_id || targetWorker?.company_id,
        created_at: new Date().toISOString()
      };

      const { error } = await sb.from("attendance").insert(row);
      if (error) {
        showToast(error.message, "error");
        return;
      }

      showToast(`تم تدوين وحفظ قيد حركة الحضور اليدوية بنجاح!`, "success");
      setShowManualModal(false);
      setMWorkerId("");
      setMProjectId("");
      setMNotes("");
      if (onUpdate) await onUpdate();
    } catch (err) {
      showToast("حدث خطأ أثناء حفظ السجل اليدوي", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Attendance Log
  const handleDeleteLog = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من مسح قيد الحضور المسجل للموظف "${name}" نهائياً؟`)) return;

    setIsLoading(true);
    try {
      const { error } = await sb.from("attendance").delete().eq("id", id);
      if (error) {
        showToast(error.message, "error");
        return;
      }
      showToast("تم حذف قيد الحضور من قاعدة البيانات بنجاح.", "success");
      if (onUpdate) await onUpdate();
    } catch (err) {
      showToast("حدث خطأ أثناء محاولة الحذف", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* SaaS Promo / Top Marketing Section like Mawqout App */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-4">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] text-amber-300 font-black tracking-wide">
              <Sparkles className="w-3.5 h-3.5" /> نظام موقوت للحضور الذكي
            </div>
            <h1 className="text-xl lg:text-3xl font-black text-white leading-tight">
              واكب التقنية في إدارة شؤون الموظفين!
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 font-medium leading-relaxed">
              موقوت هو نظام متكامل يمكّن الموظفين من تسجيل الحضور والانصراف عبر تطبيقات الويب والجوال مع التحقق اللحظي من البصمة والموقع الجغرافي الفعلي <strong className="text-amber-400">GPS</strong> دون الحاجة لأجهزة البصمة التقليدية المكلفة والمقيدة.
            </p>
          </div>

          <div className="bg-slate-950/75 border border-slate-800 px-6 py-5 rounded-2xl flex flex-col items-center justify-center min-w-[220px] text-center shadow-lg">
            <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> الساعة واليوم الحالي
            </span>
            <span className="text-white font-black text-2xl tracking-tight font-mono">{liveTime}</span>
            <span className="text-xs font-bold text-slate-400 mt-1">{liveDate}</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 border-t border-slate-800/60 pt-4 mt-2">
          <button
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "records"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-950 text-slate-400 border border-slate-850 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>لوحة التحكم وبوابة البصمة</span>
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "guide"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-950 text-slate-400 border border-slate-850 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>كيف أبدأ؟ والصلاحيات</span>
          </button>
        </div>
      </div>

      {activeTab === "records" ? (
        <>
          {/* Top Analytical Cards (Exact Replica of Mawqout's Metrics Panel in the Mockup) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>📊</span> سجلات وملخص حضور الموظفين
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  إحصائيات ذكية مجمّعة وفردية بناءً على خيارات التصفية النشطة
                </p>
              </div>
              <div className="text-xs font-bold text-slate-400">
                المستهدف:{" "}
                <span className="text-amber-400 font-black">
                  {isEmployee ? currentUser?.name : filterWorker ? workers.find((w) => w.id === filterWorker)?.name : "كل الموظفين"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Card 1: Total Work Duration */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  إجمالي مدة العمل <Info className="w-3 h-3 text-slate-500" title="مجموع ساعات العمل المسجلة" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-lg lg:text-xl font-black text-white font-sans">
                    {formatMinutesToHoursMins(totalWorkMinutes)}
                  </span>
                  <p className="text-[9px] text-emerald-400 font-bold">شيفتات مكتملة</p>
                </div>
              </div>

              {/* Card 2: Total Breaks */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  إجمالي الاستراحة <Info className="w-3 h-3 text-slate-500" title="وقت الاستراحة التقريبي المستقطع" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-lg lg:text-xl font-black text-slate-300 font-sans">
                    {formatMinutesToHoursMins(totalBreakMinutes)}
                  </span>
                  <p className="text-[9px] text-slate-500 font-bold">45د/شيفت افتراضي</p>
                </div>
              </div>

              {/* Card 3: Overtime */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  ساعات العمل الإضافي <Info className="w-3 h-3 text-slate-500" title="الوقت المنجز فوق 8 ساعات عمل يومياً" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-lg lg:text-xl font-black text-amber-400 font-sans">
                    {formatMinutesToHoursMins(totalOvertimeMinutes)}
                  </span>
                  <p className="text-[9px] text-amber-400/80 font-bold">محتسب تلقائياً</p>
                </div>
              </div>

              {/* Card 4: Incomplete logs */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  سجلات غير مكتملة <Info className="w-3 h-3 text-slate-500" title="بصمات حضور لم تسجل انصراف بعد" />
                </span>
                <div className="space-y-0.5">
                  <span className={`text-lg lg:text-xl font-black font-sans ${incompleteRecordsCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
                    {incompleteRecordsCount}
                  </span>
                  <p className="text-[9px] text-slate-500 font-bold">معلقة</p>
                </div>
              </div>

              {/* Card 5: Leaves */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  الإجازات <Info className="w-3 h-3 text-slate-500" title="عدد الموظفين المجازين حالياً" />
                </span>
                <div className="space-y-0.5">
                  <span className="text-lg lg:text-xl font-black text-blue-400 font-sans">
                    {leavesCount}
                  </span>
                  <p className="text-[9px] text-slate-500 font-bold">حسب ملفات شؤون الموظفين</p>
                </div>
              </div>

              {/* Card 6: Absences */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-slate-800 transition-all">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  غيابات اليوم <Info className="w-3 h-3 text-slate-500" title="الموظفون المداومون الذين لم يسجلوا حضور بعد" />
                </span>
                <div className="space-y-0.5">
                  <span className={`text-lg lg:text-xl font-black font-sans ${absencesCount > 0 ? "text-amber-500" : "text-emerald-400"}`}>
                    {absencesCount}
                  </span>
                  <p className="text-[9px] text-slate-500 font-bold">مطلوب تدقيقها</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gate Box: Left column to perform real-time check-in and GPS verification */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h3 className="text-xs font-black text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  <span>تأكيد البصمة الرقمية والتموضع</span>
                </h3>
              </div>

              {isEmployee && !allowEmployeeSelfPunch && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] text-rose-300 font-bold flex gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>عذراً، تدوين البصمة الذاتي للموظفين مغلق من قبل المشرف العام. يرجى مراجعة إداري المشروع لتسجيل حضورك.</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Worker lock-down based on role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">الموظف / العامل المستهدف *</label>
                  {isEmployee ? (
                    <div className="space-y-2">
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-extrabold flex items-center justify-between font-sans">
                        <span>👷 {matchedWorker ? matchedWorker.name : currentUser?.name}</span>
                        {matchedWorker ? (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-black">حسابك المقترن</span>
                        ) : (
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-md font-black">غير مقترن بملف موظف!</span>
                        )}
                      </div>
                      
                      {!matchedWorker && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                          <p className="text-[10px] text-amber-300 font-bold leading-relaxed font-sans">
                            ⚠️ لم يتم العثور على ملف موظف مطابق لاسمك أو رقمك الوظيفي في النظام لتسجيل بصمتك عليه.
                          </p>
                          <button
                            type="button"
                            onClick={handleCreateAndLinkWorker}
                            disabled={isLoading}
                            className="w-full py-2 px-3 text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-md cursor-pointer font-sans"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>إنشاء وربط ملف موظف جديد لحسابك فوراً</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => handleWorkerChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-extrabold focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="" className="text-slate-500">اختر الموظف المستهدف...</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>👷 {w.name} ({w.job || "عامل"})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Project selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">مشروع وموقع العمل الحالي *</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-extrabold focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="" className="text-slate-500">تحديد موقع العمل والمشروع...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>🏗️ {p.name} {p.latitude ? "📍 [GPS مقيد]" : ""}</option>
                    ))}
                  </select>
                </div>

                {/* GPS coordinate panel */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                    <span className="text-[10px] font-black text-white flex items-center gap-1.5">
                      <span>🧭</span> إحداثيات GPS الجهاز الذكي
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerGpsCapture()}
                      disabled={gpsLoading}
                      className="px-2.5 py-1 text-[9px] font-black bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                    >
                      {gpsLoading ? "جاري التقاط..." : "التقاط الآن"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-900/40 p-2 rounded-xl">
                      <span className="block text-slate-500 font-bold mb-0.5">خط العرض</span>
                      <strong className="text-white font-mono">{capturedLat ?? "—"}</strong>
                    </div>
                    <div className="bg-slate-900/40 p-2 rounded-xl">
                      <span className="block text-slate-500 font-bold mb-0.5">خط الطول</span>
                      <strong className="text-white font-mono">{capturedLng ?? "—"}</strong>
                    </div>
                  </div>

                  {selectedProject?.latitude && selectedProject?.longitude ? (
                    <div className="text-[10px] border-t border-slate-900 pt-2 space-y-1">
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>إحداثيات المشروع المعتمدة:</span>
                        <span className="text-slate-300 font-mono">
                          {selectedProject.latitude}, {selectedProject.longitude}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>المسافة الفعلية للجهاز:</span>
                        <strong className={`font-mono font-black ${computedDistance !== null && computedDistance <= (selectedProject.allowed_radius || 200) ? "text-emerald-400" : "text-rose-400"}`}>
                          {computedDistance !== null ? `${computedDistance} متر` : "—"}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>النطاق الأقصى المسموح:</span>
                        <strong className="text-slate-200 font-mono">
                          {selectedProject.allowed_radius || 200} م
                        </strong>
                      </div>
                    </div>
                  ) : selectedProjectId ? (
                    <div className="text-[10px] text-slate-500 font-bold leading-normal text-center bg-slate-900/20 p-2 rounded-xl">
                      ⚠️ المشروع المستهدف لا يحتوي على قيود موقع جغرافية (GPS مفتوح). البصمة مقبولة من أي تموضع.
                    </div>
                  ) : null}
                </div>

                {/* Supervisor/Admin Overrides */}
                {isAuthorizedToBypass && selectedProject?.latitude && (
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-amber-500/10 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="block text-[11px] font-black text-amber-400">تخطي قيود المسافة بالـ GPS</span>
                      <p className="text-[9px] text-slate-400 font-bold">بصفتك مديراً، يمكنك قبول البصمة خارج نطاق الموقع.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={bypassGpsRange}
                      onChange={(e) => setBypassGpsRange(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer accent-amber-500 shrink-0"
                    />
                  </div>
                )}

                {/* Actions Trigger Group */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isLoading || (isEmployee && !allowEmployeeSelfPunch)}
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/15 disabled:opacity-50"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>حضور (Check-In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={isLoading || (isEmployee && !allowEmployeeSelfPunch)}
                    className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/15 disabled:opacity-50"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>انصراف (Check-Out)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Logs Table Area */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-black text-white flex items-center gap-2">
                    <span>📋</span> سجل حضور وانصراف مواقع العمل المعتمدة
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    البصمات المسجلة من الأجهزة المحمولة ومواقع العمل الإنشائية
                  </p>
                </div>
                {(isAdmin || isSupervisor) && (
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/35 rounded-xl text-xs font-black text-amber-400 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> قيد حركة حضور يدوية
                  </button>
                )}
              </div>

              {/* Table Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-850">
                {!isEmployee && (
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 mb-1">تصفية الموظف</label>
                    <select
                      value={filterWorker}
                      onChange={(e) => setFilterWorker(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">كل الموظفين...</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={isEmployee ? "md:col-span-2" : ""}>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">تصفية حسب المشروع</label>
                  <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">كل المشاريع...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Attendance Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold">
                      <th className="py-3 px-3">اليوم والتاريخ</th>
                      <th className="py-3 px-3">الموظف</th>
                      <th className="py-3 px-3">المشروع / الموقع</th>
                      <th className="py-3 px-3">حضور</th>
                      <th className="py-3 px-3">انصراف</th>
                      <th className="py-3 px-3">مدة العمل</th>
                      <th className="py-3 px-3">التواجد بالعمل</th>
                      <th className="py-3 px-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-bold">
                          لا توجد سجلات حضور مسجلة تطابق معايير البحث والفلترة المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        // Calculate shift work duration dynamically
                        let durationStr = "—";
                        let presencePct = "100%";
                        if (log.check_in_time && log.check_out_time) {
                          const diff = parseTimeToMinutes(log.check_out_time) - parseTimeToMinutes(log.check_in_time);
                          durationStr = formatMinutesToHoursMins(diff >= 0 ? diff : diff + 1440);

                          // Simulated Presence compliance based on distance
                          if (log.distance_in_meters !== undefined) {
                            if (log.distance_in_meters <= 20) presencePct = "100%";
                            else if (log.distance_in_meters <= 50) presencePct = "99%";
                            else if (log.distance_in_meters <= 120) presencePct = "96%";
                            else if (log.distance_in_meters <= 200) presencePct = "93%";
                            else presencePct = "85% (تجاوز)";
                          }
                        }

                        return (
                          <tr key={log.id} className="border-b border-slate-850 hover:bg-slate-800/15 transition-colors">
                            <td className="py-3.5 px-3 font-bold text-slate-300">
                              <span className="block">{log.date}</span>
                            </td>
                            <td className="py-3.5 px-3 font-black text-white">{log.worker_name}</td>
                            <td className="py-3.5 px-3 text-slate-300 font-medium">{log.project_name}</td>
                            <td className="py-3.5 px-3 font-mono text-emerald-400 font-black">{log.check_in_time || "—"}</td>
                            <td className="py-3.5 px-3 font-mono text-amber-400 font-black">{log.check_out_time || "—"}</td>
                            <td className="py-3.5 px-3 font-sans font-black text-slate-100">{durationStr}</td>
                            <td className="py-3.5 px-3 font-mono">
                              <span className={`inline-flex items-center gap-1 font-black ${presencePct.includes("تجاوز") ? "text-rose-400" : "text-emerald-400"}`}>
                                <span>{presencePct}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteLog(log.id, log.worker_name)}
                                    className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="حذف القيد نهائياً"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!isAdmin && (
                                  <span className="text-[10px] text-slate-600 font-bold">لا توجد صلاحيات</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Setup Guide & Interactive Permissions Tab (Exactly replica of Mawqout's step-by-step layout) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Guide steps card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="text-center space-y-2 max-w-lg mx-auto pb-4 border-b border-slate-800">
              <h2 className="text-lg font-black text-white">كيف يعمل نظام البصمة الإلكترونية؟</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-bold">
                يمكنك تجهيز حضور مواقعك ومشاريعك الإنشائية وضبط القيود في أقل من ساعة عبر 3 خطوات بسيطة ومباشرة:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Step 1 */}
              <div className="space-y-3 text-center relative p-4 bg-slate-950/30 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl font-black font-sans shadow-lg shadow-amber-500/5">
                  1
                </div>
                <h3 className="text-sm font-black text-white">إنشاء وضبط المشاريع</h3>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                  أنشئ بطاقات المشاريع وأدخل إحداثيات خط العرض والطول الجغرافي الفعلي للموقع الإنشائي وحدد مسافة الأمان بالمتر.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3 text-center relative p-4 bg-slate-950/30 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl font-black font-sans shadow-lg shadow-amber-500/5">
                  2
                </div>
                <h3 className="text-sm font-black text-white">ربط وتسكين العمالة</h3>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                  قم بتعيين العمال والمهندسين في مشاريعهم المعتمدة. سيقوم حساب الموظف بالتقاط موقع العمل التابع له تلقائياً وتوجيهه.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3 text-center relative p-4 bg-slate-950/30 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl font-black font-sans shadow-lg shadow-amber-500/5">
                  3
                </div>
                <h3 className="text-sm font-black text-white">البدء بتسجيل الحضور!</h3>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                  ببساطة يفتح الموظف جهازه، ويتأكد النظام من مطابقة تموضعه الجغرافي مع إحداثيات الموقع ويسجل البصمة فورياً وبأمان كامل.
                </p>
              </div>
            </div>

            {/* Feature list from screenshot */}
            <div className="border-t border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-850/80">
                <h4 className="font-black text-amber-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> مزايا الحضور للموظفين:
                </h4>
                <ul className="space-y-2 font-bold text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>تسجيل الحضور والانصراف عبر الهواتف والأجهزة الذكية بسهولة.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>التحقق الفوري والذكي من البصمة والتموضع الجغرافي الـ GPS.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>إمكانية استعراض سجلات الحضور الشهرية واليومية الشخصية كاملة.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>تأكيد التواجد داخل حدود المشروع الإنشائية بأمان تام.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-850/80">
                <h4 className="font-black text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> مزايا الحضور للإداريين والمشرفين:
                </h4>
                <ul className="space-y-2 font-bold text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>عرض سجلات حضور كافة الموظفين والمشرفين والعمال في الوقت الفعلي.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>عرض تقرير الحضور المباشر (المتواجدون بالمواقع والمنشآت الآن).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>تعديل السجلات في حال نسيان البصمة من خلال قيد الحضور اليدوي.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0"></span>
                    <span>تحديد وإلزام عمال كل مشروع جغرافي بموقع وسياج المشروع.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Role Permissions & General Attendance Settings card (As requested "والصلاحيات") */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-xs font-black text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>ضبط صلاحيات وقيود البصمة</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                تخصيص قواعد النظام والصلاحيات الممنوحة للأدوار المختلفة
              </p>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-300">
              {/* Permission Item 1 */}
              <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-100">إلزام التحقق بالـ GPS</span>
                  <input
                    type="checkbox"
                    checked={reqGpsBiometrics}
                    onChange={(e) => {
                      if (!isAdmin) {
                        showToast("عذراً، هذه الصلاحية تتطلب حساب مدير النظام!", "error");
                        return;
                      }
                      setReqGpsBiometrics(e.target.checked);
                      showToast(`تم ${e.target.checked ? "تفعيل" : "تعطيل"} إلزام التحقق الجغرافي بنجاح.`, "info");
                    }}
                    className="w-4 h-4 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  في حال تفعيله، لن يتمكن الموظفون العاديون من تسجيل البصمة إلا في حال مطابقة إحداثيات موقع المشروع المحدد مع موقع الجهاز الجغرافي.
                </p>
              </div>

              {/* Permission Item 2 */}
              <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-100">بصمة الموظفين الذاتية</span>
                  <input
                    type="checkbox"
                    checked={allowEmployeeSelfPunch}
                    onChange={(e) => {
                      if (!isAdmin) {
                        showToast("عذراً، هذه الصلاحية تتطلب حساب مدير النظام!", "error");
                        return;
                      }
                      setAllowEmployeeSelfPunch(e.target.checked);
                      showToast(`تم ${e.target.checked ? "تفعيل" : "تعطيل"} بصمة الموظفين الذاتية بنجاح.`, "info");
                    }}
                    className="w-4 h-4 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  في حال تعطيله، لن يتمكن الموظفون (ذوو الصلاحيات العادية) من تدوين الحضور/الانصراف بأنفسهم، وسيتطلب الأمر من المشرف تسجيل حضورهم يدوياً.
                </p>
              </div>

              {/* Permission Item 3 */}
              <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-850 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-100">تخطي المشرفين للـ GPS</span>
                  <input
                    type="checkbox"
                    checked={allowSupervisorBypass}
                    onChange={(e) => {
                      if (!isAdmin) {
                        showToast("عذراً، هذه الصلاحية تتطلب حساب مدير النظام!", "error");
                        return;
                      }
                      setAllowSupervisorBypass(e.target.checked);
                      showToast(`تم ${e.target.checked ? "تفعيل" : "تعطيل"} تخطي المشرفين للـ GPS بنجاح.`, "info");
                    }}
                    className="w-4 h-4 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  يسمح لمشرفي المواقع والمهندسين (دور Supervisor) بتخطي حظر تباعد المسافات في حال تواجد العمال خارج النطاق الفعلي للمشروع وتسجيلهم.
                </p>
              </div>

              {/* Roles matrix info box */}
              <div className="bg-slate-950/30 p-3 rounded-2xl border border-slate-850 text-[10px] space-y-2 font-bold leading-normal text-slate-400">
                <span className="text-amber-400 block font-black">📋 جدول مصفوفة الصلاحيات الافتراضية:</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span>المدراء (Admin)</span>
                    <span className="text-emerald-400 font-black">تحكم كامل + تعديل وحذف + تخطي GPS</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span>المشرفون (Supervisor)</span>
                    <span className="text-emerald-400/80">عرض الكل + تسجيل الحضور + تدوين يدوي</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الموظفون (Employee)</span>
                    <span className="text-amber-400">بصمة شخصية فقط + عرض سجلاتهم فقط</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal Dialog */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-right" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>➕</span> قيد حركة حضور يدوية (تصحيح وتدقيق إداري)
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualPunch} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">العامل أو الموظف المستهدف *</label>
                <select
                  required
                  value={mWorkerId}
                  onChange={(e) => setMWorkerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" disabled>اختر الموظف...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">مشروع أو موقع العمل التابع *</label>
                <select
                  required
                  value={mProjectId}
                  onChange={(e) => setMProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="" disabled>اختر المشروع...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">وقت الحضور</label>
                  <input
                    type="time"
                    value={mCheckIn}
                    onChange={(e) => setMCheckIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">وقت الانصراف</label>
                  <input
                    type="time"
                    value={mCheckOut}
                    onChange={(e) => setMCheckOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">السبب أو الملاحظات التدقيقية</label>
                <input
                  type="text"
                  placeholder="مثال: تصحيح نسيان البصمة، مأمورية عمل خارجية..."
                  value={mNotes}
                  onChange={(e) => setMNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  قيد السجل اليدوي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
