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
  UserPlus,
  Share2,
  Download,
  RotateCw,
  XCircle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { extractPdfTextInBrowser } from "@/lib/pdf-extract-client";
import { parseModules } from "@/lib/modules";
import { MaterialParagraphs } from "@/components/MaterialParagraphs";
import type { Course, CourseEdition, EditionStudent } from "@/types";

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

        {tab === "material" ? (
          <MaterialTab course={course} />
        ) : (
          <EditionsTab initialEditions={editions} courseName={course.name} />
        )}
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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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
    setUploadProgress(null);
    try {
      const text = await extractPdfTextInBrowser(file, (current, total) =>
        setUploadProgress(`Leyendo página ${current} de ${total}…`)
      );
      if (!text.trim()) {
        throw new Error("No se ha podido extraer texto de este PDF. Prueba a pegarlo manualmente.");
      }
      setDraft(text);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "No se ha podido leer el PDF. Prueba a pegar el texto manualmente."
      );
    } finally {
      setUploading(false);
      setUploadProgress(null);
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
          Sube el PDF completo del curso. Si el documento usa encabezados de nivel superior como &quot;MÓDULO
          1&quot;, &quot;CAPÍTULO 1&quot;, &quot;TEMA 1&quot; o &quot;UNIDAD 1&quot; (seguidos de un número), la
          app los detecta automáticamente y organiza el contenido en módulos independientes. El texto extraído
          aparecerá abajo para que lo revises antes de guardarlo.
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
              <Loader2 size={14} className="animate-spin" /> {uploadProgress || "Procesando PDF…"}
            </p>
          )}
        </div>
        {uploadError && <p className="text-red-600 text-sm mt-3">{uploadError}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-black font-semibold text-sm">O pega/edita el texto manualmente</p>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1.5 text-blue-600 text-xs font-medium"
          >
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPreview ? "Ver texto sin formato" : "Vista previa (cómo lo verá el alumno)"}
          </button>
        </div>

        {showPreview ? (
          <div
            className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 space-y-3 overflow-y-auto"
            style={{ maxHeight: "50vh" }}
          >
            <MaterialParagraphs content={draft} />
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm text-gray-800 leading-relaxed outline-none focus:border-blue-600"
            placeholder="Pega aquí el temario, módulo o texto del curso…"
          />
        )}

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

function formatLastLogin(iso: string | null): string {
  if (!iso) return "Todavía no ha entrado";
  const date = new Date(iso);
  return `Última entrada: ${date.toLocaleDateString("es-ES")} ${date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function downloadCsv(edition: CourseEdition) {
  const rows = [["Nombre", "Código"], ...edition.students.map((s) => [s.display_name, s.access_code])];
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${edition.label || "sesion"}-alumnos.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function shareCode(student: EditionStudent, courseName: string) {
  const url = window.location.origin;
  const text = `Hola ${student.display_name}, aquí tienes tu código de acceso a CaninaMente Campus (${courseName}):\n\n${student.access_code}\n\nEntra en: ${url}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch {
      // el usuario ha cancelado el diálogo de compartir, no hacemos nada
    }
  } else {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      "Tu acceso a CaninaMente Campus"
    )}&body=${encodeURIComponent(text)}`;
  }
}

function EditionsTab({
  initialEditions,
  courseName,
}: {
  initialEditions: CourseEdition[];
  courseName: string;
}) {
  const [editions, setEditions] = useState(initialEditions);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxStudents, setMaxStudents] = useState(10);

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
      if (!res.ok) throw new Error(data.error || "No se ha podido crear la sesión.");
      setLabel("");
      setStartDate("");
      setEndDate("");
      setMaxStudents(10);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la sesión.");
    } finally {
      setCreating(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("¿Eliminar esta sesión? Todos sus alumnos perderán el acceso.")) return;
    await fetch(`/api/instructor/editions/${id}`, { method: "DELETE" });
    await refresh();
  };

  const closeNow = async (edition: CourseEdition) => {
    if (!confirm(`¿Cerrar "${edition.label}" ahora mismo? Los alumnos perderán el acceso al instante.`)) return;
    const today = new Date().toISOString().slice(0, 10);
    await fetch(`/api/instructor/editions/${edition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: today }),
    });
    await refresh();
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={16} className="text-blue-600" />
          <p className="text-black font-semibold text-sm">Nueva sesión de curso</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre de la sesión (opcional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Grupo Febrero 2026"
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
            <label className="text-xs text-gray-500 mb-1 block">Fecha de inicio (aprox.)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fecha de fin (aprox.)</label>
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
          Crear sesión
        </button>
      </div>

      <div className="space-y-4">
        {editions.length === 0 && (
          <p className="text-gray-500 text-sm">Todavía no has creado ninguna sesión de este curso.</p>
        )}
        {editions.map((edition) => {
          const status = editionStatus(edition);
          return (
            <div key={edition.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
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
                    <Users size={12} /> {edition.students.length} / {edition.max_students} alumnos
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {edition.students.length > 0 && (
                    <button
                      onClick={() => downloadCsv(edition)}
                      className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Exportar lista (CSV)"
                    >
                      <Download size={16} />
                    </button>
                  )}
                  {status.label !== "Finalizada" && (
                    <button
                      onClick={() => closeNow(edition)}
                      className="p-2 rounded-xl text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                      title="Cerrar sesión ahora"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteSession(edition.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Eliminar sesión"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <StudentList edition={edition} courseName={courseName} onChanged={refresh} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function StudentList({
  edition,
  courseName,
  onChanged,
}: {
  edition: CourseEdition;
  courseName: string;
  onChanged: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const atCapacity = edition.students.length >= edition.max_students;

  const addStudent = async () => {
    if (!newName.trim() || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/instructor/editions/${edition.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se ha podido dar de alta al alumno.");
      setNewName("");
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al dar de alta al alumno.");
    } finally {
      setAdding(false);
    }
  };

  const copyCode = async (student: EditionStudent) => {
    await navigator.clipboard.writeText(student.access_code);
    setCopiedId(student.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const regenerate = async (student: EditionStudent) => {
    if (!confirm(`¿Generar un código nuevo para ${student.display_name}? El anterior dejará de funcionar.`)) return;
    setBusyId(student.id);
    try {
      await fetch(`/api/instructor/students/${student.id}/regenerate`, { method: "POST" });
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (student: EditionStudent) => {
    if (!confirm(`¿Dar de baja a ${student.display_name}? Perderá el acceso al instante.`)) return;
    setBusyId(student.id);
    try {
      await fetch(`/api/instructor/students/${student.id}`, { method: "DELETE" });
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="space-y-2 mb-3">
        {edition.students.length === 0 && (
          <p className="text-gray-400 text-xs">Todavía no has dado de alta a ningún alumno en esta sesión.</p>
        )}
        {edition.students.map((student) => (
          <div
            key={student.id}
            className="flex items-center justify-between gap-2 flex-wrap border border-gray-100 rounded-xl px-3 py-2"
          >
            <div>
              <p className="text-black text-sm font-medium">{student.display_name}</p>
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <Clock size={11} /> {formatLastLogin(student.last_login_at)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyCode(student)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-mono font-semibold tracking-widest hover:bg-blue-50"
                title="Copiar código"
              >
                {copiedId === student.id ? <Check size={13} /> : <Copy size={13} />}
                {student.access_code}
              </button>
              <button
                onClick={() => shareCode(student, courseName)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                title="Compartir código"
              >
                <Share2 size={15} />
              </button>
              <button
                onClick={() => regenerate(student)}
                disabled={busyId === student.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                title="Regenerar código"
              >
                <RotateCw size={15} />
              </button>
              <button
                onClick={() => remove(student)}
                disabled={busyId === student.id}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                title="Dar de baja"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      {atCapacity ? (
        <p className="text-orange-600 text-xs">Aforo máximo alcanzado para esta sesión.</p>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStudent()}
            placeholder="Nombre del alumno"
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-black outline-none focus:border-blue-600"
          />
          <button
            onClick={addStudent}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium bg-blue-600 disabled:opacity-60 shrink-0"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}
