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
    <div className="min-h-screen bg-slate-950 text-right text-slate-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col justify-center items-center relative p-4 sm:p-6" dir="rtl">
      {/* Royal Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>

      {/* Main Login layout */}
      <div className="w-full max-w-md relative z-10 space-y-8 my-auto">
        
        {/* Unified Royal Header (هوية عرب وورلد للمقاولات والعقود) */}
        <div className="text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            {/* Elegant rotating external ring */}
            <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_16s_linear_infinite]"></div>
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-500/40"></div>
            <div className="absolute inset-4 bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.35)] flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-slate-950 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.3em] font-black text-amber-500/90 uppercase font-mono">ARAB WORLD CLOUD SERVICE</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              بوابة <span className="text-amber-500">عرب وورلد</span> الموحدة
            </h1>
            <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
              منظومة الـ ERP السحابية المتكاملة لإدارة المشاريع والمقاولات وعقود التقسيط والحسابات الموحدة
            </p>
          </div>
        </div>

        {/* The Beautiful Secure Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/60 backdrop-blur-2xl border border-amber-500/20 p-8 sm:p-10 rounded-[32px] shadow-[0_0_50px_rgba(245,158,11,0.08)] relative overflow-hidden"
        >
          {/* Top/Bottom luxury accents */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-500/25 rounded-tr-[32px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-amber-500/25 rounded-bl-[32px] pointer-events-none"></div>

          {googleUser ? (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-500 mb-2">
                  🔐
                </div>
                <h3 className="text-sm font-black text-white">
                  <span>ربط حساب Google الآمن</span>
                </h3>
                <p className="text-[10px] text-amber-400 mt-1 font-mono font-bold bg-amber-500/10 py-1 px-2.5 rounded-lg inline-block">{googleUser.email}</p>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  أدخل بيانات المنشأة وكود الموظف أدناه لتأكيد ربط هذا الحساب بالمنظومة السحابية لمرة واحدة فقط دون المساس بأي بيانات سابقة
                </p>
              </div>

              <form onSubmit={handleLinkGoogle} className="space-y-5">
                {/* 1. Company Code */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-300">رقم دخول الشركة / كود المنشأة</label>
                    <span className="text-[9px] text-slate-500 font-mono">COMPANY ID</span>
                  </div>
                  <div className="relative h-11">
                    <Building className="absolute right-4 top-3.5 w-4 h-4 text-amber-500/70" />
                    <input
                      type="text"
                      placeholder="أدخل رقم دخول المنشأة أو رابطها السحابي (اختياري للمدير العام)..."
                      value={loginCompanyCode}
                      onChange={(e) => setLoginCompanyCode(e.target.value)}
                      className="w-full h-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                    />
                  </div>
                  <span className="text-[8px] text-slate-500 block px-1">مثال لشركة التجربة: <b className="text-amber-400/70 font-mono">arab-world</b></span>
                </div>

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
                {/* 1. Company Code */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-300">رقم دخول الشركة / كود المنشأة</label>
                    <span className="text-[9px] text-slate-500 font-mono">COMPANY ID</span>
                  </div>
                  <div className="relative h-11">
                    <Building className="absolute right-4 top-3.5 w-4 h-4 text-amber-500/70" />
                    <input
                      type="text"
                      placeholder="أدخل رقم دخول المنشأة أو رابطها السحابي (اختياري للمدير العام)..."
                      value={loginCompanyCode}
                      onChange={(e) => setLoginCompanyCode(e.target.value)}
                      className="w-full h-full pl-4 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all text-right"
                    />
                  </div>
                  <span className="text-[8px] text-slate-500 block px-1">مثال لشركة التجربة: <b className="text-amber-400/70 font-mono">arab-world</b> أو <b className="text-amber-400/70 font-mono">demo-company</b></span>
                </div>

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
