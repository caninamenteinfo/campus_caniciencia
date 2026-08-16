import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ExternalLink, Palette, Video } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import type { Reel } from "../lib/types";
import { Loader } from "../components/Loader";
import { FlowGuard } from "../components/FlowGuard";
import { celebrate } from "../lib/celebrate";

export function Diseno() {
  const { cycle, loading } = useCurrentCycle();
  const [reels, setReels] = useState<Reel[]>([]);
  const [canvaConnected, setCanvaConnected] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cycle) return;
    api.get<{ reels: Reel[] }>(`/api/reels?cycleId=${cycle.id}`).then((r) => setReels(r.reels));
    api.get<{ configured: boolean; connected: boolean }>("/api/canva/status").then((r) =>
      setCanvaConnected(r.configured && r.connected)
    );
  }, [cycle]);

  if (loading || !cycle) return <Loader />;

  const ready = reels.length > 0 && reels.every((r) => r.canva_export_url);

  async function finishStep() {
    await api.patch(`/api/cycles/${cycle!.id}`, { flow_step: 3 });
    celebrate("step");
    navigate("/programar");
  }

  return (
    <FlowGuard cycle={cycle} requiredStep={3}>
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="font-display text-2xl">Diseño en Canva</h1>

        {canvaConnected === false && (
          <div className="card flex items-center justify-between p-4 text-sm">
            <span className="text-white/70">Conectá tu cuenta de Canva para generar los diseños automáticamente.</span>
            <Link to="/ajustes" className="btn-secondary text-xs">
              Conectar
            </Link>
          </div>
        )}

        {reels.map((reel) => (
          <DesignCard key={reel.id} reel={reel} onUpdate={(u) => setReels((prev) => prev.map((r) => (r.id === u.id ? u : r)))} />
        ))}

        {ready && (
          <button onClick={finishStep} className="btn-primary w-full animate-pulseGlow">
            Diseños listos — continuar a Programación
          </button>
        )}
      </div>
    </FlowGuard>
  );
}

function DesignCard({ reel, onUpdate }: { reel: Reel; onUpdate: (r: Reel) => void }) {
  const [designing, setDesigning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editUrl, setEditUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateDesign() {
    setDesigning(true);
    setError(null);
    try {
      const r = await api.post<{ reel: Reel; editUrl: string }>("/api/canva/design", { reel_id: reel.id });
      onUpdate(r.reel);
      setEditUrl(r.editUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo generar el diseño.");
    } finally {
      setDesigning(false);
    }
  }

  async function exportVideo() {
    setExporting(true);
    setError(null);
    try {
      const r = await api.post<{ reel: Reel }>("/api/canva/export", { reel_id: reel.id, format: "mp4" });
      onUpdate(r.reel);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo exportar el video.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-display text-base">{reel.title}</h2>
      {error && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}

      {reel.canva_export_url ? (
        <video controls className="w-full rounded-xl bg-black" src={reel.canva_export_url} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/15 text-white/30">
          <Video size={28} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={generateDesign} disabled={designing} className="btn-secondary text-xs">
          <Palette size={13} /> {reel.canva_design_id ? "Regenerar diseño" : designing ? "Generando…" : "Generar diseño"}
        </button>
        {editUrl && (
          <a href={editUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
            <ExternalLink size={13} /> Editar en Canva
          </a>
        )}
        {reel.canva_design_id && (
          <button onClick={exportVideo} disabled={exporting} className="btn-secondary text-xs">
            <Video size={13} /> {exporting ? "Exportando…" : "Exportar video"}
          </button>
        )}
      </div>
    </section>
  );
}
