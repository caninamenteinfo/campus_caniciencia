import { useEffect, useState } from "react";
import { CheckCircle2, Lightbulb, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import type { Reel, WeeklyMetric } from "../lib/types";
import { Loader } from "../components/Loader";
import { celebrate } from "../lib/celebrate";

interface Feedback {
  notes: string | null;
  insights_good: string | null;
  insights_bad: string | null;
  recommendation: string | null;
}

interface MetricDraft {
  views: number;
  shares: number;
  comments: number;
  saves: number;
}

const EMPTY_DRAFT: MetricDraft = { views: 0, shares: 0, comments: 0, saves: 0 };

export function Analisis() {
  const { cycle, loading, reload } = useCurrentCycle();
  const [reels, setReels] = useState<Reel[]>([]);
  const [metrics, setMetrics] = useState<Record<string, MetricDraft>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [notes, setNotes] = useState("");
  const [savingMetric, setSavingMetric] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!cycle) return;
    api.get<{ reels: Reel[] }>(`/api/reels?cycleId=${cycle.id}`).then((r) => setReels(r.reels));
    api.get<{ feedback: Feedback | null }>(`/api/feedback/${cycle.id}`).then((r) => {
      setFeedback(r.feedback);
      setNotes(r.feedback?.notes ?? "");
    });
  }, [cycle]);

  if (loading || !cycle) return <Loader />;

  function updateDraft(reelId: string, field: keyof MetricDraft, value: number) {
    setMetrics((prev) => {
      const current = prev[reelId] ?? EMPTY_DRAFT;
      return { ...prev, [reelId]: { ...current, [field]: value } };
    });
  }

  async function saveMetric(reelId: string) {
    const draft = metrics[reelId];
    if (!draft) return;
    setSavingMetric(reelId);
    try {
      await api.post<{ metric: WeeklyMetric }>("/api/metrics", { reel_id: reelId, ...draft });
    } finally {
      setSavingMetric(null);
    }
  }

  async function submitFeedback() {
    if (!cycle) return;
    const r = await api.post<{ feedback: Feedback }>("/api/feedback", { cycle_id: cycle.id, notes });
    setFeedback(r.feedback);
  }

  async function closeWeek() {
    if (!cycle) return;
    setClosing(true);
    try {
      await api.patch(`/api/cycles/${cycle.id}`, { flow_step: 5, status: "closed" });
      celebrate("week");
      await reload();
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="font-display text-2xl">Análisis semanal</h1>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-display text-base">Resultados por reel</h2>
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-white/40">
              <th className="pb-2">Reel</th>
              <th className="pb-2">Views</th>
              <th className="pb-2">Shares</th>
              <th className="pb-2">Comentarios</th>
              <th className="pb-2">Saves</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {reels.map((reel) => {
              const draft = metrics[reel.id] ?? EMPTY_DRAFT;
              return (
                <tr key={reel.id} className="border-t border-white/5">
                  <td className="max-w-[140px] truncate py-2 pr-2">{reel.title}</td>
                  {(["views", "shares", "comments", "saves"] as const).map((field) => (
                    <td key={field} className="py-2 pr-2">
                      <input
                        type="number"
                        min={0}
                        value={draft[field] || ""}
                        onChange={(e) => updateDraft(reel.id, field, Number(e.target.value))}
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none focus:border-brand-cyan/50"
                      />
                    </td>
                  ))}
                  <td className="py-2">
                    <button
                      onClick={() => saveMetric(reel.id)}
                      disabled={savingMetric === reel.id}
                      className="rounded-full bg-white/10 p-1.5 hover:bg-brand-cyan/20"
                    >
                      <CheckCircle2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-base">¿Qué te pareció esta semana?</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notas personales, lo que sentiste al grabar, ideas para la próxima…"
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-brand-cyan/50"
        />
        <button onClick={submitFeedback} className="btn-secondary w-full">
          Guardar y generar insights
        </button>
      </section>

      {feedback?.insights_good && (
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-base">Insights automáticos</h2>
          <Insight icon={ThumbsUp} color="text-brand-cyan" label="Lo que funcionó" text={feedback.insights_good} />
          <Insight icon={ThumbsDown} color="text-brand-orange" label="Lo que no funcionó" text={feedback.insights_bad} />
          <Insight icon={Lightbulb} color="text-brand-yellow" label="Recomendación" text={feedback.recommendation} />
        </section>
      )}

      {cycle.flow_step >= 4 && cycle.status !== "closed" && (
        <button onClick={closeWeek} disabled={closing} className="btn-primary w-full animate-pulseGlow">
          {closing ? "Cerrando…" : "🏁 Cerrar semana y sumar racha"}
        </button>
      )}
      {cycle.status === "closed" && (
        <p className="text-center text-sm text-brand-cyan">
          ✓ Semana cerrada. Nos vemos el lunes con propuestas nuevas.
        </p>
      )}
    </div>
  );
}

function Insight({
  icon: Icon,
  color,
  label,
  text,
}: {
  icon: typeof Lightbulb;
  color: string;
  label: string;
  text: string | null;
}) {
  if (!text) return null;
  return (
    <div className="flex gap-2 text-sm">
      <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
      <p>
        <span className="font-semibold">{label}:</span> <span className="text-white/70">{text}</span>
      </p>
    </div>
  );
}
