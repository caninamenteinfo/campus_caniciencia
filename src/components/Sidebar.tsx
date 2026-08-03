"use client";

import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  Menu as MenuIcon,
  X,
  Lock,
  LogOut,
} from "lucide-react";

export type ActiveView = "dashboard" | "material" | "asistente" | "tests";

const NAV_ITEMS: { id: ActiveView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
  { id: "material", label: "Material del curso", icon: BookOpen },
  { id: "asistente", label: "Asistente de estudio", icon: MessageCircle },
  { id: "tests", label: "Autoevaluación", icon: ClipboardCheck },
];

export function Sidebar({
  active,
  setActive,
  mobileOpen,
  setMobileOpen,
  courseName,
  studentName,
  onLogout,
}: {
  active: ActiveView;
  setActive: (v: ActiveView) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  courseName: string;
  studentName?: string;
  onLogout?: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-72 flex flex-col bg-white border-r border-gray-200 transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CaninaMente"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200"
            />
            <div>
              <p className="text-black font-semibold leading-tight text-base font-heading">
                CaninaMente
              </p>
              <p className="text-blue-600 text-xs font-semibold tracking-wide">CAMPUS</p>
            </div>
          </div>
          <button className="md:hidden text-gray-500" onClick={() => setMobileOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 mt-3 space-y-1">
          {NAV_ITEMS.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  setActive(it.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors border-l-4 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-blue-600"
                    : "text-gray-700 border-transparent hover:bg-gray-50"
                }`}
              >
                <Icon size={18} strokeWidth={2} className={isActive ? "text-blue-600" : "text-gray-500"} />
                <span>{it.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-3 space-y-1">
          <Link
            href="/instructor"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <Lock size={16} />
            <span>Acceso instructor</span>
          </Link>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            >
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          )}
        </div>

        <div className="px-6 py-5 border-t border-gray-100">
          {studentName && <p className="text-gray-400 text-xs mb-0.5">{studentName}</p>}
          <p className="text-black text-sm font-bold leading-snug">{courseName}</p>
        </div>
      </aside>
    </>
  );
}

export function TopBar({ onMenu, title }: { onMenu: () => void; title: string }) {
  return (
    <div className="md:hidden flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200">
      <button onClick={onMenu} className="text-black">
        <MenuIcon size={22} />
      </button>
      <Image src="/logo.png" alt="CaninaMente" width={28} height={28} className="w-7 h-7 rounded-full" />
      <span className="font-semibold text-black font-heading">{title}</span>
    </div>
  );
}
