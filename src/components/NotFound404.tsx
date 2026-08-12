import React from "react";
import { Home, RotateCcw, HelpCircle } from "lucide-react";

interface NotFound404Props {
  onGoHome?: () => void;
}

export function NotFound404({ onGoHome }: NotFound404Props) {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = "/";
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-b from-[#f9f8fe] via-[#f2eefd] to-[#e9e3f9] text-[#1c1243] font-sans flex flex-col justify-between items-center relative overflow-hidden select-none"
      dir="rtl"
    >
      {/* Background Architectural & Construction SVG Vector Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
        {/* Blueprint Grid Lines */}
        <svg className="w-full h-full text-[#7c52f6]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern-404" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern-404)" />
        </svg>

        {/* Tower Crane Silhouette - Left Side */}
        <svg
          className="absolute left-2 sm:left-10 top-1/2 -translate-y-1/2 h-[340px] sm:h-[480px] w-auto text-[#6b38f6] opacity-25 hidden md:block"
          viewBox="0 0 200 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {/* Vertical Mast */}
          <line x1="60" y1="400" x2="60" y2="80" strokeWidth="3" />
          <line x1="75" y1="400" x2="75" y2="80" strokeWidth="3" />
          {/* Latticework */}
          <path d="M60 380 L75 360 M60 360 L75 340 M60 340 L75 320 M60 320 L75 300 M60 300 L75 280 M60 280 L75 260 M60 260 L75 240 M60 240 L75 220 M60 220 L75 200 M60 200 L75 180 M60 180 L75 160 M60 160 L75 140 M60 140 L75 120 M60 120 L75 100 M60 100 L75 80" />
          {/* Horizontal Jib / Arm */}
          <line x1="10" y1="80" x2="190" y2="80" strokeWidth="3" />
          <line x1="10" y1="95" x2="190" y2="95" />
          <path d="M10 80 L25 95 M25 80 L40 95 M40 80 L55 95 M75 80 L90 95 M90 80 L105 95 M105 80 L120 95 M120 80 L135 95 M135 80 L150 95 M150 80 L165 95 M165 80 L180 95" />
          {/* Tower Peak & Stay Cables */}
          <polygon points="67.5,30 60,80 75,80" strokeWidth="2" />
          <line x1="67.5" y1="30" x2="20" y2="80" />
          <line x1="67.5" y1="30" x2="180" y2="80" />
          {/* Trolley Cable & Hook */}
          <line x1="150" y1="95" x2="150" y2="200" strokeDasharray="3 3" />
          <rect x="145" y="200" width="10" height="12" rx="2" fill="currentColor" />
          <path d="M150 212 C150 225 142 225 142 218" fill="none" strokeWidth="2" />
        </svg>

        {/* Building Skyline Silhouettes - Right Side */}
        <svg
          className="absolute right-2 sm:right-8 bottom-12 h-[220px] sm:h-[320px] w-auto text-[#6b38f6] opacity-20 hidden md:block"
          viewBox="0 0 250 300"
          fill="currentColor"
        >
          <rect x="10" y="80" width="70" height="220" rx="4" />
          <rect x="90" y="40" width="85" height="260" rx="4" />
          <rect x="185" y="120" width="60" height="180" rx="4" />
        </svg>

        {/* Floating Geometric Elements (+, o, x) */}
        <div className="absolute top-28 left-[18%] text-purple-400/50 text-xl font-bold font-mono">x</div>
        <div className="absolute top-44 right-[22%] text-purple-500/50 text-lg font-bold font-mono">o</div>
        <div className="absolute bottom-36 left-[25%] text-purple-400/40 text-2xl font-bold font-mono">+</div>
        <div className="absolute bottom-48 right-[18%] text-purple-500/50 text-sm font-bold font-mono">o</div>
      </div>

      {/* Top Header: Arab World Logo & Brand Name */}
      <header className="w-full pt-8 sm:pt-12 pb-4 px-6 flex flex-col items-center justify-center z-10 space-y-2">
        <div className="flex flex-col items-center gap-2">
          {/* Custom AW Monogram Emblem */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#5a2beb] via-[#7950f8] to-[#926bfb] shadow-xl shadow-purple-500/30 flex items-center justify-center transform hover:scale-105 transition-transform cursor-pointer">
            <span className="text-white font-black text-2xl sm:text-3xl tracking-tighter font-mono drop-shadow-sm">
              AW
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-[#221551] tracking-tight leading-tight">
              عرب وورلد
            </h1>
            <span className="text-[11px] sm:text-xs font-extrabold text-[#7552f6] tracking-wider mt-0.5">
              للمقاولات والخدمات
            </span>
          </div>
        </div>
      </header>

      {/* Main Center Content Section */}
      <main className="w-full max-w-xl mx-auto px-6 py-6 flex flex-col items-center text-center z-10 space-y-6 sm:space-y-8 my-auto">
        {/* Giant 404 Display Number */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-56 h-28 bg-purple-500/20 blur-3xl rounded-full pointer-events-none"></div>

          <h2 className="text-8xl sm:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#6b38f6] via-[#5b28eb] to-[#8d62f8] drop-shadow-[0_12px_28px_rgba(91,40,235,0.28)] font-mono leading-none">
            404
          </h2>
        </div>

        {/* Heading & Paragraph Subtitle */}
        <div className="space-y-3 max-w-lg mx-auto">
          <h3 className="text-2xl sm:text-3xl font-black text-[#1e1448] tracking-tight">
            الصفحة غير موجودة
          </h3>
          <p className="text-sm sm:text-base font-medium text-[#5a4f7c] leading-relaxed">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
            <br className="hidden sm:inline" />
            يرجى التأكد من الرابط أو العودة إلى الصفحة الرئيسية.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md pt-2">
          {/* Main Home Button */}
          <button
            onClick={handleGoHome}
            type="button"
            className="w-full sm:w-auto min-w-[180px] px-6 py-3.5 bg-gradient-to-r from-[#6133f5] via-[#5222eb] to-[#4516de] hover:from-[#5225e3] hover:to-[#380ccf] text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/45 transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Home className="w-5 h-5" />
            <span>الصفحة الرئيسية</span>
          </button>

          {/* Go Back Button */}
          <button
            onClick={handleGoBack}
            type="button"
            className="w-full sm:w-auto min-w-[160px] px-6 py-3.5 bg-white/90 hover:bg-white text-[#5222eb] border-2 border-[#805cf8]/30 hover:border-[#6133f5] rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>العودة للخلف</span>
          </button>
        </div>

        {/* Help / Contact Section */}
        <div className="pt-4 flex items-center justify-center gap-1.5 text-xs text-[#6e6393] font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-[#7347f7]" />
          <span>تحتاج مساعدة؟</span>
          <button
            onClick={handleGoHome}
            type="button"
            className="text-[#592be9] hover:underline font-extrabold cursor-pointer"
          >
            تواصل معنا من خلال البوابة الرئيسية
          </button>
        </div>
      </main>

      {/* Decorative 3D Contracting Hardhat Graphic (Bottom Right) */}
      <div className="absolute right-4 sm:right-16 bottom-16 w-28 h-20 sm:w-36 sm:h-28 pointer-events-none opacity-85 hidden sm:block">
        <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
          <path
            d="M 15 50 C 15 20, 105 20, 105 50 Z"
            fill="url(#helmet-grad-404)"
          />
          <path
            d="M 5 50 C 5 45, 115 45, 115 50 C 115 55, 5 55, 5 50 Z"
            fill="#a78bfa"
          />
          <path
            d="M 50 22 C 55 18, 65 18, 70 22 L 72 48 L 48 48 Z"
            fill="#c4b5fd"
            opacity="0.75"
          />
          <rect x="52" y="34" width="16" height="10" rx="2" fill="#ffffff" />
          <text x="60" y="42" fontSize="6" fontWeight="bold" fill="#5b28eb" textAnchor="middle" fontFamily="sans-serif">
            AW
          </text>

          <defs>
            <linearGradient id="helmet-grad-404" x1="15" y1="20" x2="105" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b89bfb" />
              <stop offset="1" stopColor="#7c4df8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Footer Bar */}
      <footer className="w-full py-3.5 px-4 bg-[#1b1140] text-[#a499cd] text-[11px] sm:text-xs font-bold text-center z-10 border-t border-purple-900/30">
        <p>2026 © عرب وورلد للمقاولات والخدمات. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
