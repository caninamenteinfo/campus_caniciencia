"use client";

import type { CourseModule } from "@/types";

export function MaterialView({
  modules,
  activeModuleId,
  setActiveModuleId,
}: {
  modules: CourseModule[];
  activeModuleId: number;
  setActiveModuleId: (id: number) => void;
}) {
  const activeModule = modules.find((m) => m.id === activeModuleId) || modules[0];
  const paragraphs = activeModule.content.split("\n").filter((p) => p.trim().length > 0);

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <p className="text-blue-600 font-semibold text-sm tracking-wide mb-1">
        MÓDULO {activeModuleId + 1} DE {modules.length}
      </p>

      {modules.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {modules.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActiveModuleId(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                m.id === activeModuleId
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              Módulo {i + 1}
            </button>
          ))}
        </div>
      )}

      <div
        className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-4 overflow-y-auto"
        style={{ maxHeight: "60vh" }}
      >
        {paragraphs.map((p, i) => {
          const isHeading = /^Cap[ií]tulo/i.test(p) || /^M[ÓO]DULO/i.test(p);
          return (
            <p
              key={i}
              className={
                isHeading
                  ? "text-blue-700 font-semibold text-lg pt-2 font-heading"
                  : "text-gray-800 text-base leading-relaxed"
              }
            >
              {p}
            </p>
          );
        })}
      </div>
    </div>
  );
}
