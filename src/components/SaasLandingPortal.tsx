import React, { useState } from "react";
import { Building, Sparkles, Shield, ArrowRight, Plus, CheckCircle, Smartphone, Lock, Award, Briefcase, Users, Landmark, AlertTriangle, Search, Globe, MapPin, User, Key } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Company } from "../types";

interface SaasLandingPortalProps {
  companies: Company[];
  onRegisterCompany: (companyData: {
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
  }) => Promise<boolean>;
  onRegisterPendingUser?: (data: {
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
  }) => Promise<boolean>;
  onNavigateToSlug: (slug: string) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;

  // Login parameters
  loginCode: string;
  setLoginCode: (v: string) => void;
  loginCompanyCode: string;
  setLoginCompanyCode: (v: string) => void;
  loginPass: string;
  setLoginPass: (v: string) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;

  handleGoogleSignIn?: () => Promise<void>;
  googleUser?: { email: string; uid: string; displayName?: string } | null;
  setGoogleUser?: (v: { email: string; uid: string; displayName?: string } | null) => void;
  handleLinkGoogle?: (e: React.FormEvent) => Promise<void>;
}

export function SaasLandingPortal({
  companies,
  onRegisterCompany,
  onRegisterPendingUser,
  onNavigateToSlug,
  showToast,
  loginCode,
  setLoginCode,
  loginCompanyCode,
  setLoginCompanyCode,
  loginPass,
  setLoginPass,
  handleLogin,
  isLoading,
  handleGoogleSignIn,
  googleUser,
  setGoogleUser,
  handleLinkGoogle,
}: SaasLandingPortalProps) {
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Flow Tab Mode: "new_reg" | "link"
  const [googleTab, setGoogleTab] = useState<"new_reg" | "link">("new_reg");

  // New Google Pending Registration States
  const [gRegName, setGRegName] = useState("");
  const [gRegPhone, setGRegPhone] = useState("");
  const [gReqMode, setGReqMode] = useState<"new_company" | "existing">("new_company");
  const [gSelectedCompId, setGSelectedCompId] = useState(companies[0]?.id || "arab_world");
  const [gReqCompName, setGReqCompName] = useState("");
  const [gReqCompSlug, setGReqCompSlug] = useState("");
  const [gReqCompManager, setGReqCompManager] = useState("");
  const [gReqCompPhone, setGReqCompPhone] = useState("");
  const [gReqCompCapital, setGReqCompCapital] = useState<number | "">("");

  const [savedEmpCode, setSavedEmpCode] = useState<string>("");
  const [savedEmpName, setSavedEmpName] = useState<string>("");

  React.useEffect(() => {
    try {
      const c = localStorage.getItem("aw_saved_employee_code");
      const n = localStorage.getItem("aw_saved_employee_name");
      if (c) setSavedEmpCode(c);
      if (n) setSavedEmpName(n);
    } catch {
      //
    }
  }, []);

  // Auto initialize Google display name if available
  React.useEffect(() => {
    if (googleUser?.displayName) {
      setGRegName(googleUser.displayName);
      setGReqCompManager(googleUser.displayName);
    }
  }, [googleUser]);

  const handleGoogleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;

    const nameToSubmit = gRegName.trim() || googleUser.displayName || "مستخدم قوقل";
    if (!gRegPhone.trim()) {
      showToast("يرجى إدخال رقم الجوال لمتابعة الطلب!", "error");
      return;
    }

    if (gReqMode === "new_company") {
      if (!gReqCompName.trim() || !gReqCompSlug.trim()) {
        showToast("يرجى تحديد اسم الشركة ورابطها المخصص للإنشاء!", "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const success = await onRegisterPendingUser?.({
        name: nameToSubmit,
        email: googleUser.email,
        google_id: googleUser.uid,
        phone: gRegPhone.trim(),
        company_id: gReqMode === "existing" ? gSelectedCompId : undefined,
        requested_company_name: gReqMode === "new_company" ? gReqCompName.trim() : undefined,
        requested_company_slug: gReqMode === "new_company" ? gReqCompSlug.trim() : undefined,
        requested_company_manager: gReqMode === "new_company" ? (gReqCompManager.trim() || nameToSubmit) : undefined,
        requested_company_phone: gReqMode === "new_company" ? (gReqCompPhone.trim() || gRegPhone.trim()) : undefined,
        requested_company_capital: gReqMode === "new_company" ? Number(gReqCompCapital || 0) : undefined,
      });

      if (success) {
        setGRegName("");
        setGRegPhone("");
        setGReqCompName("");
        setGReqCompSlug("");
        setGReqCompManager("");
        setGReqCompPhone("");
        setGReqCompCapital("");
      }
    } catch (err: any) {
      showToast("حدث خطأ أثناء إرسال طلب التسجيل: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Registration Form States
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [recordNo, setRecordNo] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [capital, setCapital] = useState<number | " text-right font-sans">("");
  const [adminCode, setAdminCode] = useState("");
  const [adminPass, setAdminPass] = useState("");

  const handleSlugChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(cleaned);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !adminCode.trim() || !adminPass.trim()) {
      showToast("يرجى ملء الحقول الإلزامية الاسم، الرابط، وكود السر للمشرف!", "error");
      return;
    }

    if (slug.length < 3) {
      showToast("رابط الشركة المخصص يجب أن يتكون من 3 رموز على الأقل!", "error");
      return;
    }

    const slugExists = companies.some(
      (c) => (c.slug || "").toLowerCase() === slug.toLowerCase() || c.id.toLowerCase() === slug.toLowerCase()
    );
    if (slugExists) {
      showToast("رابط الشركة هذا مستخدم بالفعل! يرجى اختيار رابط مخصص آخر.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onRegisterCompany({
        name: name.trim(),
        slug: slug.trim(),
        manager: manager.trim(),
        phone: phone.trim(),
        address: address.trim(),
        record_no: recordNo.trim(),
        tax_no: taxNo.trim(),
        capital: Number(capital || 0),
        adminCode: adminCode.trim(),
        adminPass: adminPass.trim(),
      });

      if (success) {
        setName("");
        setSlug("");
        setManager("");
        setPhone("");
        setAddress("");
        setRecordNo("");
        setTaxNo("");
        setCapital("");
        setAdminCode("");
        setAdminPass("");
        setShowRegisterForm(false);
      }
    } catch (err: any) {
      showToast("حدث خطأ أثناء تسجيل منشأتك: " + (err.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient text-right text-slate-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col justify-center items-center relative p-4 sm:p-6" dir="rtl">
      {/* Royal Background decorations - Vibrant Yellow & Royal Blue */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>

      {/* Main Login layout */}
      <div className="w-full max-w-md relative z-10 space-y-8 my-auto">
        
        {/* Unified Royal Header (هوية عرب وورلد للمقاولات والعقود) */}
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            {/* Elegant rotating external ring */}
            <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-[spin_16s_linear_infinite]"></div>
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-500/50"></div>
            <div className="absolute inset-4 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 rounded-full shadow-[0_0_35px_rgba(245,158,11,0.45)] flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-slate-950 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.3em] font-black text-amber-400 uppercase font-mono">ARAB WORLD CLOUD SERVICE</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              بوابة <span className="text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">عرب وورلد</span> الموحدة
            </h1>
            <p className="text-[11px] text-slate-300 font-medium max-w-sm mx-auto leading-relaxed">
              منظومة الـ ERP السحابية المتكاملة لإدارة المشاريع والمقاولات وعقود التقسيط والحسابات الموحدة
            </p>
          </div>
        </div>

        {/* The Beautiful Secure Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#0e172c]/95 backdrop-blur-2xl border border-amber-500/35 p-8 sm:p-10 rounded-[32px] shadow-[0_0_60px_rgba(11,19,43,0.9),0_0_30px_rgba(245,158,11,0.2)] relative overflow-hidden"
        >
          {/* Top/Bottom luxury accents */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/25 rounded-tr-[32px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/25 rounded-bl-[32px] pointer-events-none"></div>

          {googleUser ? (
            <>
              <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl text-blue-400 mb-2">
                  🔵
                </div>
                <h3 className="text-sm font-black text-white">
                  <span>المتابعة باستخدام Google</span>
                </h3>
                <p className="text-[10px] text-blue-300 mt-1 font-mono font-bold bg-blue-500/10 py-1 px-3 rounded-lg inline-block border border-blue-500/20">{googleUser.email}</p>
              </div>

              {/* Navigation Tabs between New Request & Link Account */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-5">
                <button
                  type="button"
                  onClick={() => setGoogleTab("new_reg")}
                  className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
                    googleTab === "new_reg"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🚀 تسجيل جديد وطلب شركة
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleTab("link")}
                  className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all cursor-pointer ${
                    googleTab === "link"
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🔗 ربط بكود موظف سابق
                </button>
              </div>

              {googleTab === "new_reg" ? (
                <form onSubmit={handleGoogleRegisterSubmit} className="space-y-4">
                  <p className="text-[10px] text-slate-400 leading-relaxed text-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    أكمل تسجيل بياناتك وطلب منشأتك ليصل مباشرة للأدمن العام للموافقة وتفعيل الصلاحيات.
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-300 block">الاسم الكامل <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="اسم المستخدم أو الموظف"
                      value={gRegName}
                      onChange={(e) => setGRegName(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-300 block">رقم الجوال للتواصل والاعتماد <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="05xxxxxxxx"
                      value={gRegPhone}
                      onChange={(e) => setGRegPhone(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                  </div>

                  {/* Company Request Selection */}
                  <div className="space-y-2 pt-1 border-t border-slate-800/80">
                    <label className="text-[10px] font-black text-amber-400 block">نوع الطلب والمنشأة</label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGReqMode("new_company")}
                        className={`p-2.5 rounded-xl border text-right text-[10px] font-bold transition-all cursor-pointer ${
                          gReqMode === "new_company"
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        🏢 طلب تأسيس شركة جديدة
                      </button>

                      <button
                        type="button"
                        onClick={() => setGReqMode("existing")}
                        className={`p-2.5 rounded-xl border text-right text-[10px] font-bold transition-all cursor-pointer ${
                          gReqMode === "existing"
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        🤝 انضمام لشركة قائمة
                      </button>
                    </div>

                    {gReqMode === "new_company" ? (
                      <div className="space-y-2.5 p-3 bg-slate-950/80 border border-amber-500/20 rounded-2xl mt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-300">اسم الشركة المطلوب تأسيسها <span className="text-rose-500">*</span></label>
                          <input
                            required
                            type="text"
                            placeholder="مثال: شركة الفنار للخدمات اللوجستية"
                            value={gReqCompName}
                            onChange={(e) => setGReqCompName(e.target.value)}
                            className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300">الرابط المخصص (Slug) <span className="text-rose-500">*</span></label>
                            <input
                              required
                              type="text"
                              placeholder="alfanar"
                              value={gReqCompSlug}
                              onChange={(e) => setGReqCompSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                              className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500 text-left"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300">اسم مدير المنشأة</label>
                            <input
                              type="text"
                              placeholder="المدير المسؤول"
                              value={gReqCompManager}
                              onChange={(e) => setGReqCompManager(e.target.value)}
                              className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300">هاتف الشركة</label>
                            <input
                              type="text"
                              placeholder="05xxxxxxxx"
                              value={gReqCompPhone}
                              onChange={(e) => setGReqCompPhone(e.target.value)}
                              className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500 text-left"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-300">رأس المال المقدر (ريال)</label>
                            <input
                              type="number"
                              placeholder="100000"
                              value={gReqCompCapital}
                              onChange={(e) => setGReqCompCapital(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full h-9 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-2">
                        <label className="text-[10px] font-bold text-slate-300">اختر الشركة المراد الانضمام لها</label>
                        <select
                          value={gSelectedCompId}
                          onChange={(e) => setGSelectedCompId(e.target.value)}
                          className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 focus:outline-none cursor-pointer text-slate-950 bg-white"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id} className="text-slate-950">
                              🏢 {c.name} ({c.slug})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-3">
                    <button
                      disabled={isSubmitting}
                      type="submit"
                      className="w-full h-11 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                          <span>جاري إرسال الطلب للأدمن...</span>
                        </>
                      ) : (
                        <>
                          <span>🚀 تقديم طلب التسجيل والشركة للأدمن</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setGoogleUser?.(null)}
                      className="w-full h-10 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      إلغاء والعودة للدخول المعتاد
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLinkGoogle} className="space-y-5">
                  <p className="text-[10px] text-slate-400 leading-relaxed text-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    أدخل كود الموظف وكلمة المرور المسجلة مسبقاً لربط حساب Google بحسابك الحالي فوراً.
                  </p>

                  {/* 2. Employee Code */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-300">كود الموظف / اسم المستخدم</label>
                      <span className="text-[9px] text-slate-500 font-mono">USER CODE</span>
                    </div>
                    <div className="relative h-11">
                      <User className="absolute right-4 top-3.5 w-4 h-4 text-amber-500/70" />
                      <input
                        required
                        type="text"
                        placeholder="أدخل كود الموظف أو اسم المستخدم..."
                        value={loginCode}
                        onChange={(e) => setLoginCode(e.target.value)}
                        className="w-full h-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                      />
                    </div>
                  </div>

                  {/* 3. Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-300">الرمز السري المالي / كلمة المرور</label>
                      <span className="text-[9px] text-slate-500 font-mono">SECURE PASSWORD</span>
                    </div>
                    <div className="relative h-11">
                      <Key className="absolute right-4 top-3.5 w-4 h-4 text-amber-500/70" />
                      <input
                        required
                        type="password"
                        placeholder="أدخل الرمز السري..."
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        className="w-full h-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Submit buttons for Google linkage */}
                  <div className="space-y-3 pt-2">
                    <button
                      disabled={isLoading}
                      type="submit"
                      className="w-full h-12 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                          <span>جاري التحقق وحفظ الارتباط...</span>
                        </>
                      ) : (
                        <>
                          <span>🔗 تأكيد ربط الحساب وتخويل الدخول</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setGoogleUser?.(null)}
                      className="w-full h-11 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      إلغاء والعودة للدخول المعتاد
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="text-sm font-black text-white flex items-center justify-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>تسجيل الدخول الآمن</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">أدخل معرّفات الدخول للمنشأة والمسؤول لمتابعة العمل</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Saved Quick Employee Login Banner */}
                {savedEmpCode && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 text-right animate-in fade-in duration-200">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-bold text-amber-400">⚡ دخول مباشر مفوّض محفوظ</span>
                      <span className="block text-xs font-black text-white">{savedEmpName || "موظف مسجل"} (كود: {savedEmpCode})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginCode(savedEmpCode);
                        showToast(`تم تعبئة كود الموظف (${savedEmpCode}) بنجاح! أدخل كلمة المرور للدخول.`, "info");
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded-xl transition-all cursor-pointer shrink-0 shadow-md"
                    >
                      استخدام الكود
                    </button>
                  </div>
                )}

                {/* 2. Employee Code */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-300">كود الموظف / اسم المستخدم</label>
                    <span className="text-[9px] text-slate-500 font-mono">USER CODE</span>
                  </div>
                  <div className="relative h-11">
                    <User className="absolute right-4 top-3.5 w-4 h-4 text-amber-500/70" />
                    <input
                      required
                      type="text"
                      placeholder="أدخل كود الموظف أو اسم المستخدم..."
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      className="w-full h-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium px-1 pt-0.5 leading-relaxed">
                    💡 <b className="text-amber-400">دخول مباشر للموظف:</b> عند التسجيل لأول مرة، أدخل كودك الوظيفي وكلمة المرور المرغوبة ليتم ربط حسابك اعتمادياً وتلقائياً.
                  </p>
                </div>

                {/* 3. Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-300">الرمز السري المالي / كلمة المرور</label>
                    <span className="text-[9px] text-slate-500 font-mono">SECURE PASSWORD</span>
                  </div>
                  <div className="relative h-11">
                    <Key className="absolute right-4 top-3.5 w-4 h-4 text-amber-500/70" />
                    <input
                      required
                      type="password"
                      placeholder="أدخل الرمز السري..."
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full h-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full h-12 bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                      <span>جاري التحقق والولوج للشركة...</span>
                    </>
                  ) : (
                    <>
                      <span>⚙️ دخول لوحة التحكم</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>

                {/* Google Sign-In Trigger button */}
                {handleGoogleSignIn && (
                  <>
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-800/80"></div>
                      <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-bold">أو الدخول السريع عبر</span>
                      <div className="flex-grow border-t border-slate-800/80"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full h-11 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>الدخول السريع بواسطة Google</span>
                    </button>
                  </>
                )}
              </form>
            </>
          )}
        </motion.div>

        {/* Elegant company creation action at bottom */}
        <div className="text-center pt-2 space-y-1">
          <p className="text-[10px] text-slate-400 font-medium">
            هل تمتلك منشأة وتريد ربطها؟{" "}
            <button
              onClick={() => setShowRegisterForm(true)}
              className="text-amber-500 hover:text-amber-400 font-black hover:underline cursor-pointer"
            >
              تأسيس شركة سحابية جديدة الآن 🚀
            </button>
          </p>
          <p className="text-[8.5px] text-slate-500 font-bold leading-relaxed max-w-sm mx-auto">
            جميع الخوادم مشفرة بنسبة 100% ومحمية ضد الهجمات الرقمية. يتم تشغيل وإدارة المنصة سحابيًا عبر بروتوكولات حماية متقدمة.
          </p>
        </div>

      </div>

      {/* Registration Modal Overlay */}
      <AnimatePresence>
        {showRegisterForm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowRegisterForm(false)}
                className="absolute left-6 top-6 w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer text-xs"
              >
                ✕
              </button>

              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>🚀</span>
                  <span>تأسيس منشأة سحابية جديدة ومساحة عمل SaaS مستقلة</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">تأسيس فوري للشركة وبناء كود مسؤول النظام مع فصل كامل وحصري لقاعدة البيانات.</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* 1. Basic Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">اسم الشركة / المنشأة <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="مثال: شركة عرب وورلد للتجارة"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">رابط الشركة المخصص (Slug) <span className="text-rose-500">*</span></label>
                    <input
                      required
                      type="text"
                      placeholder="مثال: dev-company"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">سيكون الرابط المباشر للشركة: arab1000.online/{slug || "your-slug"}</span>
                  </div>
                </div>

                {/* 2. Commercial / Financial Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">المدير المسؤول</label>
                    <input
                      type="text"
                      placeholder="اسم المدير للتعميدات والعقود"
                      value={manager}
                      onChange={(e) => setManager(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">رقم جوال الشركة</label>
                    <input
                      type="text"
                      placeholder="05xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">رقم السجل التجاري</label>
                    <input
                      type="text"
                      placeholder="1010xxxxxx"
                      value={recordNo}
                      onChange={(e) => setRecordNo(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">الرقم الضريبي الموحد</label>
                    <input
                      type="text"
                      placeholder="3000xxxxxxxxx"
                      value={taxNo}
                      onChange={(e) => setTaxNo(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300">رأس المال بالعقود (ريال)</label>
                    <input
                      type="number"
                      placeholder="1000000"
                      value={capital}
                      onChange={(e) => setCapital(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300">العنوان الوطني والفرعي للشركة</label>
                  <input
                    type="text"
                    placeholder="الرياض، المملكة العربية السعودية، شارع العليا"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>

                {/* 3. Tenant Admin Account Setup */}
                <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 space-y-3">
                  <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>تأسيس حساب مسؤول النظام (المدير العام للمنشأة)</span>
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal">هذه البيانات تستخدم فور تسجيل الشركة لتسجيل الدخول كمدير عام كامل الصلاحيات للمنشأة الجديدة.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300">كود / معرّف المدير العام <span className="text-rose-500">*</span></label>
                      <input
                        required
                        type="text"
                        placeholder="مثال: admin"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-300">الرمز السري المالي للمدير <span className="text-rose-500">*</span></label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRegisterForm(false)}
                    className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                        <span>جاري بناء وتدشين المنشأة...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-slate-950" />
                        <span>تأكيد وتسجيل الشركة الآن</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
