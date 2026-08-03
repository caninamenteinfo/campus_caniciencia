"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sidebar, TopBar, type ActiveView } from "@/components/Sidebar";
import { DashboardHome } from "@/components/DashboardHome";
import { MaterialView } from "@/components/MaterialView";
import { AsistenteView } from "@/components/AsistenteView";
import { TestsView } from "@/components/TestsView";
import type { CourseModule } from "@/types";

const TITLES: Record<ActiveView, string> = {
  dashboard: "Inicio",
  material: "Material",
  asistente: "Asistente",
  tests: "Tests",
};

export function CampusApp({
  modules,
  courseName,
  studentName,
}: {
  modules: CourseModule[];
  courseName: string;
  studentName: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveView>("dashboard");
  const [activeModuleId, setActiveModuleId] = useState(modules[0]?.id ?? 0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      <Sidebar
        active={active}
        setActive={setActive}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        courseName={courseName}
        studentName={studentName}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <TopBar onMenu={() => setMobileOpen(true)} title={TITLES[active]} />
        <div className="flex-1 overflow-y-auto">
          {active === "dashboard" && (
            <DashboardHome
              modules={modules}
              activeModuleId={activeModuleId}
              setActiveModuleId={setActiveModuleId}
              setActive={setActive}
              courseName={courseName}
            />
          )}
          {active === "material" && (
            <MaterialView modules={modules} activeModuleId={activeModuleId} setActiveModuleId={setActiveModuleId} />
          )}
          {active === "asistente" && (
            <div className="h-full">
              <AsistenteView key={activeModuleId} activeModuleId={activeModuleId} />
            </div>
          )}
          {active === "tests" && <TestsView activeModuleId={activeModuleId} />}
        </div>
      </div>
    </div>
  );
}
