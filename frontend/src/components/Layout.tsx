import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, LayoutDashboard, Mic, Palette, Send, Settings, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Profile, WeeklyCycle } from "../lib/types";
import { StreakBadge } from "./StreakBadge";
import { StepIndicator } from "./StepIndicator";
import { MotivationBanner } from "./MotivationBanner";
import { ToastStack } from "./Toast";
import { signOut } from "../lib/supabase";
import { useAuth } from "../store/auth";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/grabacion", label: "Grabación", icon: Mic },
  { to: "/captions", label: "Captions", icon: Type },
  { to: "/diseno", label: "Diseño", icon: Palette },
  { to: "/programar", label: "Programar", icon: Send },
  { to: "/analisis", label: "Análisis", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);

  useEffect(() => {
    api
      .get<{ cycle: WeeklyCycle }>("/api/cycles/current")
      .then((r) => {
        setCycle(r.cycle);
        return api.get<{ profile: Profile | null }>(`/api/cycles/${r.cycle.id}/summary`);
      })
      .then((r) => setProfile(r.profile))
      .catch(() => {
        setProfile(null);
        setCycle(null);
      });
    // Se re-consulta en cada cambio de ruta para que la racha y el paso
    // actual del flujo nunca queden desactualizados en el sidebar.
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <ToastStack />
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-base-light/50 p-5 md:flex">
        <div className="mb-8 flex items-center gap-2">
          <img src="/logo.svg" alt="CaninaMente" className="h-9 w-9 rounded-lg" />
          <span className="font-display text-lg">CaninaMente</span>
        </div>

        <div className="mb-4">
          <StepIndicator flowStep={cycle?.flow_step ?? 0} />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-cyan/15 text-brand-cyan shadow-glow"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
          <StreakBadge profile={profile} />
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="truncate">{user?.email}</span>
            <button onClick={() => signOut()} className="shrink-0 text-white/60 hover:text-white">
              Salir
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b border-white/10 bg-base/70 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="CaninaMente" className="h-8 w-8 rounded-lg" />
              <span className="font-display">CaninaMente</span>
            </div>
            <StreakBadge profile={profile} />
          </div>
          <StepIndicator flowStep={cycle?.flow_step ?? 0} />
        </header>

        <main className="flex-1 p-4 md:p-8">
          <MotivationBanner />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="sticky bottom-0 z-10 flex justify-around border-t border-white/10 bg-base/90 py-2 backdrop-blur md:hidden">
          {NAV.slice(0, 5).map(({ to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-full p-2.5 ${isActive ? "bg-brand-cyan/15 text-brand-cyan" : "text-white/50"}`
              }
            >
              <Icon size={20} />
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
