import React, { useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from "@vis.gl/react-google-maps";
import { Project } from "../types";
import { MapPin, Info, Globe, Settings, Key, Compass, List, Map as MapIcon } from "lucide-react";

// Retrieve the API Key safely
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

interface ProjectMapProps {
  projects: Project[];
  viewMode: "list" | "map";
  onViewModeChange: (mode: "list" | "map") => void;
}

const ProjectMarkerWithInfoWindow: React.FC<{ project: Project }> = ({ project }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const lat = Number(project.latitude);
  const lng = Number(project.longitude);

  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        onClick={() => setOpen(true)}
      >
        <Pin
          background={project.status === "نشط" ? "#10b981" : project.status === "متوقف" ? "#f43f5e" : "#64748b"}
          borderColor="#ffffff"
          glyphColor="#ffffff"
        />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-3 text-right text-slate-900 font-sans min-w-[220px]">
            <h4 className="font-black text-sm text-slate-950 mb-1 flex items-center justify-end gap-1.5">
              <span>{project.name}</span>
              <span className="text-base">🏗️</span>
            </h4>
            
            <p className="text-[11px] text-slate-500 mb-2 flex items-center justify-end gap-1">
              <span>{project.location || "غير مححدد"}</span>
              <MapPin className="w-3 h-3 text-amber-500" />
            </p>

            <div className="space-y-1.5 text-[11px] border-t border-slate-100 pt-2 mt-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">{project.engineer || "بإشراف فرقا المقاول"}</span>
                <span className="text-slate-400">المهندس المشرف:</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-slate-800">
                  {Number(project.budget || 0).toLocaleString()} ريال
                </span>
                <span className="text-slate-400">الميزانية:</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${project.progress}%` }} />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-amber-600">{project.progress}%</span>
                </div>
                <span className="text-slate-400">نسبة الإنجاز:</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  project.status === "نشط" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {project.status}
                </span>
                <span className="text-slate-400">حالة المشروع:</span>
              </div>
              {project.allowed_radius && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 font-mono">{project.allowed_radius} م</span>
                  <span className="text-slate-400 font-sans">مسافة الأمان:</span>
                </div>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function ProjectMap({ projects, viewMode, onViewModeChange }: ProjectMapProps) {
  // Filter projects with valid latitude and longitude
  const mappedProjects = projects.filter((p) => {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  // Calculate standard center
  let center = { lat: 24.7136, lng: 46.6753 }; // Default to Riyadh
  if (mappedProjects.length > 0) {
    const firstProj = mappedProjects[0];
    center = { lat: Number(firstProj.latitude), lng: Number(firstProj.longitude) };
  }

  if (!hasValidKey) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>🗺️</span> خريطة المشاريع الجغرافية والتتبع الموقعي
            </h4>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-white"
              >
                <List className="w-3.5 h-3.5" />
                <span>عرض كقائمة</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer bg-amber-500 text-slate-950 font-extrabold"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>خريطة المشاريع</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <div className="max-w-xl text-center space-y-6">
            <div className="inline-flex p-4 bg-amber-500/10 text-amber-500 rounded-full animate-pulse">
              <Key className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">مطلوب مفتاح Google Maps API لتفعيل الخريطة</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              الرجاء ربط مفتاح واجهة برمجة تطبيقات Google Maps Platform لعرض المواقع الجغرافية للمشاريع وتتبع نطاق الحضور والانصراف الجغرافي للموظفين.
            </p>
            
            <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-5 text-right space-y-4">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 justify-end">
                <span>⚙️</span> خطوات تفعيل المفتاح:
              </span>
              <ol className="text-[11px] text-slate-300 space-y-3 leading-relaxed list-decimal list-inside pr-1">
                <li>
                  قم بالحصول على مفتاح API من خلال الرابط:{" "}
                  <a
                    href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 underline font-semibold hover:text-amber-300 transition-colors"
                  >
                    منصة جوجل للخرائط (Google Maps API)
                  </a>
                </li>
                <li>
                  عند ظهور نافذة <b>"Enter your environment variable to continue"</b> المنبثقة، قم بلصق مفتاح الـ API والضغط على مفتاح <b>Enter</b>.
                </li>
                <li>
                  أو يدوياً: افتح <b>الإعدادات Settings</b> (أيقونة الترس ⚙️ في الزاوية العلوية اليسرى) ← اختر <b>Secrets</b> ← اكتب اسم المتغير <code>GOOGLE_MAPS_PLATFORM_KEY</code> ← اضغط <b>Enter</b> ← الصق قيمة المفتاح ← اضغط <b>Enter</b>.
                </li>
                <li>سيتكامل النظام ويعيد بناء التطبيق تلقائياً بمجرد إدخال المفتاح.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-4 px-2">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>🗺️</span> خريطة المشاريع الجغرافية والتتبع الموقعي
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              توضح هذه الخريطة الإحداثيات الفعلية لـ ({mappedProjects.length}) من المشاريع الجارية ذات الإحداثيات المحددة.
            </p>
          </div>
          
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className="px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer text-slate-400 hover:text-white"
            >
              <List className="w-3.5 h-3.5" />
              <span>عرض كقائمة</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer bg-amber-500 text-slate-950 font-extrabold"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>خريطة المشاريع</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>مشروع نشط ({projects.filter(p => p.status === "نشط").length})</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>متوقف ({projects.filter(p => p.status === "متوقف").length})</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-500/10 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>منتهي ({projects.filter(p => p.status === "منتهي").length})</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800" style={{ height: "480px" }}>
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={center}
            defaultZoom={mappedProjects.length > 1 ? 11 : 13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "100%" }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            {mappedProjects.map((p) => (
              <ProjectMarkerWithInfoWindow key={p.id} project={p} />
            ))}
          </Map>
        </APIProvider>
      </div>

      <div className="bg-slate-950/40 border border-slate-850/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black text-white block">تقييد البصمة الجغرافية</span>
            <span className="text-[10px] text-slate-400 font-bold block leading-normal mt-0.5">
              يعتمد نطاق القبول للبصمة على قيم خطوط العرض والطول المحددة في بطاقة كل مشروع. يمكنك تعديل أي مشروع لتحديث إحداثياته.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
