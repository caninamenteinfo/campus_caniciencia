import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, FileText, Palette, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { signInWithGoogle } from "../lib/supabase";
import type { DriveFileRef } from "../lib/types";

export function Ajustes() {
  const [params] = useSearchParams();
  const [canva, setCanva] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [docs, setDocs] = useState<DriveFileRef[]>([]);
  const [pushStatus, setPushStatus] = useState<"idle" | "subscribed" | "unsupported" | "denied">("idle");

  useEffect(() => {
    api.get<{ configured: boolean; connected: boolean }>("/api/canva/status").then(setCanva);
    api.get<{ docs: DriveFileRef[] }>("/api/drive/docs").then((r) => setDocs(r.docs));
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    }
  }, []);

  async function connectCanva() {
    const r = await api.get<{ url: string }>("/api/canva/oauth/start");
    window.location.href = r.url;
  }

  async function enablePush() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setPushStatus("denied");

    const { publicKey } = await api.get<{ publicKey: string | null }>("/api/push/vapid-public-key");
    if (!publicKey) {
      alert("El servidor todavía no tiene configuradas las claves VAPID (backend/.env).");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
    await api.post("/api/push/subscribe", { subscription });
    setPushStatus("subscribed");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl">Ajustes</h1>

      {params.get("canva") === "conectado" && (
        <p className="rounded-lg bg-brand-cyan/10 p-3 text-sm text-brand-cyan">✓ Canva conectado correctamente.</p>
      )}
      {params.get("canva") === "error" && (
        <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
          No se pudo conectar Canva. Intentá de nuevo.
        </p>
      )}

      <section className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-brand-orange" />
          <h2 className="font-display text-base">Canva</h2>
        </div>
        {canva?.configured === false ? (
          <p className="text-sm text-white/50">
            El servidor no tiene configurado CANVA_CLIENT_ID / CANVA_CLIENT_SECRET todavía.
          </p>
        ) : (
          <>
            <p className="text-sm text-white/60">
              Estado: {canva?.connected ? <span className="text-brand-cyan">Conectado</span> : "No conectado"}
            </p>
            <button onClick={connectCanva} className="btn-secondary">
              {canva?.connected ? "Reconectar" : "Conectar con Canva"}
            </button>
          </>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-brand-yellow" />
          <h2 className="font-display text-base">Alarmas semanales</h2>
        </div>
        <p className="text-sm text-white/60">
          Notificaciones push: Lunes 8:30 (sesión de producción), Miércoles 12:00 (recordatorio), Jueves 18:00
          (monitoreo), Viernes 15:00 (feedback), Domingo 18:00 (preview).
        </p>
        {pushStatus === "subscribed" && <p className="text-sm text-brand-cyan">✓ Notificaciones activadas.</p>}
        {pushStatus === "unsupported" && <p className="text-sm text-white/40">Tu navegador no soporta notificaciones push.</p>}
        {pushStatus === "denied" && <p className="text-sm text-red-300">Permiso denegado — habilitalo desde el navegador.</p>}
        {(pushStatus === "idle") && (
          <button onClick={enablePush} className="btn-secondary">
            Activar notificaciones
          </button>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-brand-cyan" />
          <h2 className="font-display text-base">Documentos maestros (Google Drive)</h2>
        </div>
        <ul className="space-y-1.5 text-sm text-white/60">
          {docs.map((d) => (
            <li key={d.role} className="flex items-center justify-between">
              <span>{d.name}</span>
              {!d.fileId && <span className="pill bg-red-500/10 text-red-300">sin fileId</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-white/60" />
          <h2 className="font-display text-base">Sesión de Google</h2>
        </div>
        <p className="text-sm text-white/60">
          El permiso de Drive vence después de un tiempo. Si las propuestas dejan de leer el documento MAESTRO,
          volvé a iniciar sesión.
        </p>
        <button onClick={() => signInWithGoogle()} className="btn-secondary">
          Reconectar Google
        </button>
      </section>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
