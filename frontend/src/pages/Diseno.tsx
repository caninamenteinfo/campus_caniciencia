import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Download, ExternalLink, Loader2, Palette, RefreshCw, Sparkles } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import { useMediaUrl } from "../hooks/useMediaUrl";
import { resolveTemplateDef } from "../lib/canvaTemplates";
import { reelFilename } from "../lib/slug";
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

  // Los diseños se generan automáticamente en background apenas se
  // completan los captions (Refinamiento #2) — mientras alguno esté
  // pendiente, refrescamos la lista para que el preview aparezca solo.
  useEffect(() => {
    if (!cycle || canvaConnected === false) return;
    const pending = reels.some((r) => r.caption_short && r.caption_long && !r.canva_export_url);
    if (!pending) return;
    const id = setInterval(() => {
      api.get<{ reels: Reel[] }>(`/api/reels?cycleId=${cycle.id}`).then((r) => setReels(r.reels));
    }, 4000);
    return () => clearInterval(id);
  }, [cycle, reels, canvaConnected]);

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
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const awaitingCanvaEdit = useRef(false);

  const { url: videoUrl, loading: videoLoading } = useMediaUrl(reel.canva_export_url, refreshKey);
  const template = resolveTemplateDef(reel.category);
  const captionsReady = Boolean(reel.caption_short && reel.caption_long);
  const editUrl = reel.canva_design_id ? `https://www.canva.com/design/${reel.canva_design_id}/edit` : null;

  async function generateDesign() {
    setDesigning(true);
    setError(null);
    try {
      const r = await api.post<{ reel: Reel }>("/api/canva/design", { reel_id: reel.id });
      onUpdate(r.reel);
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
      setRefreshKey((k) => k + 1);
      celebrate("step");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo exportar el video.");
    } finally {
      setExporting(false);
    }
  }

  // "Auto-refresh": si el usuario se fue a editar el diseño en Canva y
  // vuelve a la pestaña, re-exportamos solos para traer los cambios.
  useEffect(() => {
    function onFocus() {
      if (awaitingCanvaEdit.current) {
        awaitingCanvaEdit.current = false;
        exportVideo();
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel.canva_design_id]);

  return (
    <section className="card grid gap-4 p-5 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base">{reel.title}</h2>
          {template && <span className="pill bg-brand-yellow/10 text-brand-yellow">{template.label}</span>}
        </div>
        {template && <p className="text-xs text-white/40">{template.style}</p>}
        {error && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}

        {!captionsReady && (
          <p className="mt-2 text-xs text-white/40">Completá los captions primero — el diseño se genera solo apenas los guardes.</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={generateDesign} disabled={designing || !captionsReady} className="btn-secondary text-xs">
            <Palette size={13} /> {reel.canva_design_id ? "Regenerar diseño" : designing ? "Generando…" : "Generar diseño"}
          </button>
          {editUrl && (
            <a
              href={editUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => (awaitingCanvaEdit.current = true)}
              className="btn-secondary text-xs"
            >
              <ExternalLink size={13} /> Editar en Canva
            </a>
          )}
          {reel.canva_design_id && (
            <button onClick={exportVideo} disabled={exporting} className="btn-secondary text-xs">
              <RefreshCw size={13} /> {exporting ? "Actualizando…" : reel.canva_export_url ? "Actualizar preview" : "Exportar video"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
        {reel.canva_export_url ? (
          videoLoading ? (
            <PreviewState icon={Loader2} spinning label="Cargando preview…" />
          ) : videoUrl ? (
            <>
              <video controls className="w-full rounded-lg bg-black" style={{ aspectRatio: "9 / 16" }} src={videoUrl} />
              <a
                href={videoUrl}
                download={reelFilename(reel)}
                className="btn-primary mt-1 w-full text-xs"
              >
                <Download size={13} /> Descargar MP4
              </a>
            </>
          ) : (
            <PreviewState icon={Loader2} spinning label="No se pudo cargar el preview." />
          )
        ) : reel.canva_design_id ? (
          <PreviewState icon={Loader2} spinning label="🎬 Exportando video…" />
        ) : captionsReady ? (
          <PreviewState icon={Sparkles} spinning label="🎨 Generando diseño…" />
        ) : (
          <PreviewState icon={Palette} label="El preview aparece acá" />
        )}
      </div>
    </section>
  );
}

function PreviewState({
  icon: Icon,
  label,
  spinning,
}: {
  icon: typeof Loader2;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center text-white/40">
      <Icon size={26} className={spinning ? "animate-spin" : ""} />
      <p className="text-xs">{label}</p>
    </div>
  );
}
