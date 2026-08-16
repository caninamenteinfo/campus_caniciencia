import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { api } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import type { Reel } from "../lib/types";
import { Loader } from "../components/Loader";
import { FlowGuard } from "../components/FlowGuard";
import { celebrate } from "../lib/celebrate";
import { toast } from "../store/toast";

const STEPS = [
  "Descargá el MP4 exportado desde Canva de cada reel.",
  "Abrí Metricool y creá una nueva publicación por reel.",
  "Pegá el caption largo + hashtags que guardaste en Captions.",
  "Programá el día recomendado por la propuesta (o el que prefieras).",
];

export function Programar() {
  const { cycle, loading } = useCurrentCycle();
  const [reels, setReels] = useState<Reel[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cycle) return;
    api.get<{ reels: Reel[] }>(`/api/reels?cycleId=${cycle.id}`).then((r) => setReels(r.reels));
  }, [cycle]);

  if (loading || !cycle) return <Loader />;

  const allScheduled = reels.length > 0 && reels.every((r) => r.status === "scheduled" || r.status === "published");

  async function toggleScheduled(reel: Reel) {
    const nextStatus = reel.status === "scheduled" ? "designed" : "scheduled";
    const updated = await api.patch<{ reel: Reel }>(`/api/reels/${reel.id}`, { status: nextStatus });
    setReels((prev) => prev.map((r) => (r.id === updated.reel.id ? updated.reel : r)));
  }

  async function finishWeek() {
    await api.patch(`/api/cycles/${cycle!.id}`, { flow_step: 4, status: "scheduled" });
    celebrate("week");
    toast("🚀 La semana está en vivo!", "success");
    navigate("/analisis");
  }

  return (
    <FlowGuard cycle={cycle} requiredStep={4}>
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="font-display text-2xl">Programación en Metricool</h1>

        <section className="card p-5">
          <ol className="space-y-2 text-sm text-white/70">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-display text-brand-yellow">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
          <a
            href="https://app.metricool.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary mt-4 w-full text-xs"
          >
            <ExternalLink size={13} /> Abrir Metricool
          </a>
        </section>

        <section className="card space-y-2 p-5">
          <h2 className="mb-2 font-display text-base">Marcá cada reel al programarlo</h2>
          {reels.map((reel) => {
            const done = reel.status === "scheduled" || reel.status === "published";
            return (
              <button
                key={reel.id}
                onClick={() => toggleScheduled(reel)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${
                  done ? "border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan" : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {done ? <CheckCircle2 size={18} /> : <Circle size={18} className="text-white/30" />}
                {reel.title}
              </button>
            );
          })}
        </section>

        {allScheduled && (
          <button onClick={finishWeek} className="btn-primary w-full animate-pulseGlow">
            🎉 Semana programada — cerrar sesión de producción
          </button>
        )}
      </div>
    </FlowGuard>
  );
}
