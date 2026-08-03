"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Pencil,
  FileText,
  Upload,
  Loader2,
  Calendar,
  Users,
  Copy,
  Trash2,
  Plus,
  Check,
  LogOut,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { parseModules } from "@/lib/modules";
import type { Course, CourseEdition } from "@/types";

type Tab = "material" | "ediciones";

function editionStatus(edition: CourseEdition): { label: string; className: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (today < edition.start_date) return { label: "Próxima", className: "bg-gray-100 text-gray-600" };
  if (today > edition.end_date) return { label: "Finalizada", className: "bg-gray-100 text-gray-500" };
  return { label: "Activa", className: "bg-green-100 text-green-700" };
}

export function InstructorPanel({
  course,
  editions,
  instructorEmail,
}: {
  course: Course;
  editions: CourseEdition[];
  instructorEmail: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("material");

  const handleLogout = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/instructor/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CaninaMente"
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover border border-gray-200"
            />
            <p className="text-blue-600 font-semibold text-sm tracking-wide">SOLO INSTRUCTOR</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 text-sm hover:text-black">
            <LogOut size={15} /> Salir ({instructorEmail})
          </button>
        </div>
        <h1 className="text-2xl md:text-3xl text-black font-semibold mb-6 font-heading">Panel del instructor</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("material")}
            className={`px-4 py-2 rounded-xl text-sm font-medium border ${
              tab === "material" ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-300"
            }`}
          >
            Material del curso
          </button>
          <button
            onClick={() => setTab("ediciones")}
            className={`px-4 py-2 rounded-xl text-sm font-medium border ${
              tab === "ediciones" ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-300"
            }`}
          >
            Ediciones y acceso
          </button>
        </div>

        {tab === "material" ? <MaterialTab course={course} /> : <EditionsTab initialEditions={editions} />}
      </div>
    </div>
  );
}

function MaterialTab({ course }: { course: Course }) {
  const [draft, setDraft] = useState(course.material_text);
  const [nameDraft, setNameDraft] = useState(course.name);
  const [savedName, setSavedName] = useState(false);
  const [savedMaterial, setSavedMaterial] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moduleCount = parseModules(draft).length;

  const saveName = async () => {
    if (!nameDraft.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/instructor/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      if (!res.ok) throw new Error();
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2500);
    } finally {
      setSavingName(false);
    }
  };

  const saveMaterial = async () => {
    setSavingMaterial(true);
    try {
      const res = await fetch("/api/instructor/material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialText: draft }),
      });
      if (!res.ok) throw new Error();
      setSavedMaterial(true);
      setTimeout(() => setSavedMaterial(false), 2500);
    } finally {
      setSavingMaterial(false);
    }
  };

  const processFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Ese archivo no parece un PDF.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/instructor/pdf-extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se ha podido leer el PDF.");
      setDraft(data.text);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se ha podido leer el PDF. Prueba a pegar el texto manualmente.");
    } finally {
      setUploading(false);
    }
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await processFile(e.dataTransfer.files?.[0]);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Pencil size={16} className="text-blue-600" />
          <p className="text-black font-semibold text-sm">Nombre del curso</p>
        </div>
        <div className="flex gap-2">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
          />
          <button
            onClick={saveName}
            disabled={savingName}
            className="px-4 py-2 rounded-xl text-white bg-blue-600 text-sm font-medium disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
        {savedName && <p className="text-green-600 text-xs mt-2">Nombre actualizado</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={16} className="text-blue-600" />
          <p className="text-black font-semibold text-sm">Cargar material desde PDF</p>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Sube el PDF completo del curso. Si el documento usa encabezados &quot;MÓDULO 1&quot;, &quot;MÓDULO
          2&quot;…, la app los detecta automáticamente y organiza el contenido en módulos independientes. El texto
          extraído aparecerá abajo para que lo revises antes de guardarlo.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
            dragOver ? "border-blue-600 bg-blue-50" : "border-gray-300"
          }`}
        >
          <Upload size={22} className="text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600 text-sm mb-3">Arrastra aquí el PDF, o selecciónalo abajo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handlePdfChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-700 mx-auto max-w-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-medium file:cursor-pointer cursor-pointer"
          />
          {uploading && (
            <p className="text-blue-600 text-sm mt-3 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Procesando PDF…
            </p>
          )}
        </div>
        {uploadError && <p className="text-red-600 text-sm mt-3">{uploadError}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-black font-semibold text-sm mb-2">O pega/edita el texto manualmente</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm text-gray-800 leading-relaxed outline-none focus:border-blue-600"
          placeholder="Pega aquí el temario, módulo o texto del curso…"
        />
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={saveMaterial}
            disabled={savingMaterial}
            className="px-5 py-3 rounded-xl text-white font-medium bg-blue-600 disabled:opacity-60"
          >
            Guardar material del curso
          </button>
          {savedMaterial && <span className="text-green-600 text-sm font-medium">Material actualizado</span>}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-gray-500 text-xs">Módulos detectados actualmente: {moduleCount}</p>
      </div>
    </>
  );
}

function EditionsTab({ initialEditions }: { initialEditions: CourseEdition[] }) {
  const [editions, setEditions] = useState(initialEditions);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxStudents, setMaxStudents] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch("/api/instructor/editions");
    const data = await res.json();
    if (res.ok) setEditions(data.editions);
  };

  const createEdition = async () => {
    if (!startDate || !endDate) {
      setError("Indica la fecha de inicio y de fin.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, startDate, endDate, maxStudents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se ha podido crear la edición.");
      setLabel("");
      setStartDate("");
      setEndDate("");
      setMaxStudents(10);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la edición.");
    } finally {
      setCreating(false);
    }
  };

  const removeEdition = async (id: string) => {
    if (!confirm("¿Eliminar esta edición? Los alumnos con ese código perderán el acceso.")) return;
    await fetch(`/api/instructor/editions/${id}`, { method: "DELETE" });
    await refresh();
  };

  const copyCode = async (edition: CourseEdition) => {
    await navigator.clipboard.writeText(edition.access_code);
    setCopiedId(edition.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={16} className="text-blue-600" />
          <p className="text-black font-semibold text-sm">Nueva edición del curso</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre de la edición (opcional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Edición Febrero 2026"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Aforo máximo</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha de fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          onClick={createEdition}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium bg-blue-600 disabled:opacity-60"
        >
          {creating && <Loader2 size={16} className="animate-spin" />}
          Crear edición y generar código
        </button>
      </div>

      <div className="space-y-3">
        {editions.length === 0 && (
          <p className="text-gray-500 text-sm">Todavía no has creado ninguna edición de este curso.</p>
        )}
        {editions.map((edition) => {
          const status = editionStatus(edition);
          return (
            <div key={edition.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-black font-semibold text-sm">{edition.label}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs flex items-center gap-1">
                    <Calendar size={12} /> {edition.start_date} → {edition.end_date}
                  </p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                    <Users size={12} /> {edition.student_count ?? 0} / {edition.max_students} alumnos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCode(edition)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 text-blue-700 text-sm font-mono font-semibold tracking-widest hover:bg-blue-50"
                  >
                    {copiedId === edition.id ? <Check size={14} /> : <Copy size={14} />}
                    {edition.access_code}
                  </button>
                  <button
                    onClick={() => removeEdition(edition.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Eliminar edición"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
