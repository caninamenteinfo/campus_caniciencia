"use client";

import Image from "next/image";
import { MessageCircle, ClipboardCheck, ChevronRight } from "lucide-react";
import type { CourseModule } from "@/types";
import type { ActiveView } from "@/components/Sidebar";

export function DashboardHome({
  modules,
  activeModuleId,
  setActiveModuleId,
  setActive,
  courseName,
}: {
  modules: CourseModule[];
  activeModuleId: number;
  setActiveModuleId: (id: number) => void;
  setActive: (v: ActiveView) => void;
  courseName: string;
}) {
  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <div className="rounded-3xl mb-8 px-6 md:px-10 py-8 md:py-10 flex items-center gap-6 bg-white border-2 border-blue-100">
        <Image
          src="/logo.png"
          alt="CaninaMente"
          width={112}
          height={112}
          className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover shrink-0 border-4 border-blue-100"
        />
        <div>
          <p className="text-blue-600 font-semibold text-sm tracking-wide mb-1">BIENVENIDO A</p>
          <h1 className="text-2xl md:text-4xl text-black font-semibold leading-tight font-heading">
            CaninaMente Campus
          </h1>
          <p className="text-black font-bold mt-2 max-w-md text-lg md:text-xl leading-snug font-heading">
            {courseName}
          </p>
        </div>
      </div>

      <p className="text-blue-600 font-semibold text-sm tracking-wide mb-3">MÓDULOS DEL CURSO</p>
      <div className="space-y-3 mb-8">
        {modules.map((m, i) => {
          const isActive = activeModuleId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setActiveModuleId(m.id);
                setActive("material");
              }}
              className={`w-full text-left flex items-center justify-between gap-4 rounded-2xl p-5 border transition-colors ${
                isActive ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                    isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="text-black font-semibold text-sm leading-snug">
                    {m.title.replace(/^M[ÓO]DULO\s+\d+\s*[—-]?\s*/i, "") || m.title}
                  </p>
                  {isActive && <p className="text-blue-600 text-xs mt-0.5">Módulo activo ahora</p>}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => setActive("asistente")}
          className="text-left bg-white border-2 border-blue-600 rounded-2xl p-6 hover:bg-blue-50 transition-colors"
        >
          <MessageCircle size={22} className="text-blue-600" />
          <p className="text-black font-semibold mt-3 font-heading">Pregúntale al asistente</p>
          <p className="text-gray-600 text-sm mt-1">Resuelve dudas sobre el módulo activo, al instante.</p>
        </button>
        <button
          onClick={() => setActive("tests")}
          className="text-left bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-600 transition-colors"
        >
          <ClipboardCheck size={22} className="text-blue-600" />
          <p className="text-black font-semibold mt-3 font-heading">Ponte a prueba</p>
          <p className="text-gray-600 text-sm mt-1">Genera un test sobre el módulo que estás estudiando.</p>
        </button>
      </div>
    </div>
  );
}
