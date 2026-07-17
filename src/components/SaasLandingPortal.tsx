import React, { useState } from "react";
import { Building, Sparkles, Shield, ArrowRight, Plus, CheckCircle, Smartphone, Lock, Award, Briefcase, Users, Landmark, AlertTriangle } from "lucide-react";
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
}

export function SaasLandingPortal({
  companies,
  onRegisterCompany,
  onNavigateToSlug,
  showToast,
}: SaasLandingPortalProps) {
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manager, setManager] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [recordNo, setRecordNo] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [capital, setCapital] = useState<number | "">("");
  const [adminCode, setAdminCode] = useState("");
  const [adminPass, setAdminPass] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const handleSlugChange = (val: string) => {
    // Keep only lowercase alphanumeric and hyphens
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

    // Check if slug is already used
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
        // Reset form
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

  const filteredCompanies = companies.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.slug || "").toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-right text-slate-100 font-sans selection:bg-amber-500/30 overflow-x-hidden relative" dir="rtl">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-900 pb-6 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
              <Building className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">منصة <span className="text-amber-500">سحابي ERP</span> السحابية</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">الحل المتكامل لإدارة المقاولات، الحسابات والشركات المتعددة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRegisterForm(true)}
              className="px-4 py-2 bg-gradient-to-l from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl text-xs hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-1.5 shadow-[0_4px_20px_rgba(245,158,11,0.2)] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>تسجيل شركة جديدة</span>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto space-y-6 mb-16 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black text-amber-400">عصر جديد من أنظمة الـ SaaS والمقاولات السحابية</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl sm:text-5xl font-black text-white leading-tight font-sans"
          >
            منظومة مالية وإدارية ذكية <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 via-yellow-200 to-amber-500">
              لكل منشأة مسار ورابط مخصص
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            نظام سحابي مرن يتيح لكل شركة بناء مساحة عمل متكاملة ومعزولة كلياً. قم بإدارة عروض الأسعار، عقود التقسيط، سندات القبض والصرف، سجلات الحضور بالـ GPS للعمال، والخصومات الشهرية برابط ديناميكي آمن وخاص بك.
          </motion.p>
        </section>

        {/* Core SaaS Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: Lock,
              title: "عزل كامل للبيانات",
              desc: "ضمان حماية مطلقة للبيانات وفصل كامل للسجلات عبر مسارات Slug وقواعد بيانات مخصصة.",
              color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
            },
            {
              icon: Landmark,
              title: "الإدارة المالية المتكاملة",
              desc: "إصدار سندات القبض والصرف، إدارة الخزائن اليومية والمصروفات بدقة متناهية.",
              color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            },
            {
              icon: Smartphone,
              title: "حضور العمال بالـ GPS",
              desc: "تتبع جيو-مكاني فوري لبصمات العمال من مواقع المشاريع للتحقق من نطاق العمل.",
              color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
            },
            {
              icon: Award,
              title: "أتمتة الرواتب والسلف",
              desc: "احتساب ذكي لمعدلات التأخير، البدلات المعتمدة، السلف والخصومات وإصدار كشوفات الرواتب.",
              color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx + 0.3, duration: 0.5 }}
              className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-3"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </section>

        {/* Companies / Tenant Access Directory */}
        <section className="bg-slate-900/20 border border-slate-800 rounded-[32px] p-6 sm:p-10 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-800/60 pb-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>🏢</span>
                <span>دليل مساحات العمل النشطة للمنشآت</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">ابحث عن مساحة عمل شركتك المسجلة أو قم بزيارة النماذج المتاحة للبدء الفوري.</p>
            </div>

            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="ابحث عن اسم الشركة أو الرابط المخصص..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-10 pl-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-500 transition-all text-right"
              />
              <span className="absolute right-3.5 top-3 text-slate-500 text-xs">🔍</span>
            </div>
          </div>

          {filteredCompanies.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="text-4xl">🏜️</div>
              <p className="text-xs text-slate-400 font-bold">لم نجد أي شركات تطابق بحثك حالياً.</p>
              <button
                onClick={() => setShowRegisterForm(true)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 hover:bg-slate-800/80 transition-all cursor-pointer"
              >
                إنشاء وتسجيل منشأتك الأولى الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredCompanies.map((c) => {
                const companySlug = c.slug || c.id;
                return (
                  <motion.div
                    key={c.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between gap-4 group hover:border-amber-500/40 transition-all shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Building className="w-4 h-4 text-amber-400" />
                        </div>
                        <h4 className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">{c.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold font-mono">الرابط: <span className="text-slate-300">/ {companySlug}</span></p>
                      {c.address && (
                        <p className="text-[10px] text-slate-500 line-clamp-1">📍 {c.address}</p>
                      )}
                    </div>

                    <button
                      onClick={() => onNavigateToSlug(companySlug)}
                      className="w-full py-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl text-[11px] font-black text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>دخول مساحة العمل</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Registration Modal Overlay */}
      <AnimatePresence>
        {showRegisterForm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
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
                  <span>تسجيل منشأة جديدة وتأسيس مساحة عمل SaaS</span>
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
                      placeholder="مثال: شركة التطوير العقاري المحدودة"
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
                    <span className="text-[9px] text-slate-500 block mt-0.5">سيكون الرابط المباشر للشركة: domain.com/{slug || "your-slug"}</span>
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
