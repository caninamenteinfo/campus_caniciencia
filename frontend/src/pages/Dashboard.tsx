import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import type { CycleSummary, Proposal } from "../lib/types";
import { Loader } from "../components/Loader";
import { ProposalCard } from "../components/ProposalCard";
import { ProgressSteps } from "../components/ProgressSteps";
import { Countdown } from "../components/Countdown";
import { StreakHero } from "../components/StreakHero";
import { celebrate } from "../lib/celebrate";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const { cycle, loading } = useCurrentCycle();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState<CycleSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cycle) return;
    api.get<{ proposals: Proposal[] }>(`/api/proposals?cycleId=${cycle.id}`).then((r) => setProposals(r.proposals));
    api.get<CycleSummary>(`/api/cycles/${cycle.id}/summary`).then(setSummary);
  }, [cycle]);

  if (loading || !cycle) return <Loader label="Preparando tu semana…" />;

  const accepted = proposals.filter((p) => p.status === "accepted");

  async function generateProposals() {
    setGenerating(true);
    setError(null);
    try {
      const r = await api.post<{ proposals: Proposal[] }>("/api/proposals/generate", { cycleId: cycle!.id });
      setProposals(r.proposals);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message}${e.detail ? ` — ${e.detail}` : ""}` : "Error inesperado.");
    } finally {
      setGenerating(false);
    }
  }

  async function decide(id: string, status: "accepted" | "rejected") {
    const updated = await api.patch<{ proposal: Proposal }>(`/api/proposals/${id}`, { status });
    setProposals((prev) => prev.map((p) => (p.id === updated.proposal.id ? updated.proposal : p)));
  }

  async function startRecording() {
    setStarting(true);
    try {
      await api.post("/api/reels/from-proposals", { cycleId: cycle!.id });
      await api.patch(`/api/cycles/${cycle!.id}`, { flow_step: 0, status: "recording", start_flow: true });
      celebrate("step");
      navigate("/grabacion");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <StreakHero profile={summary?.profile ?? null} flowStep={cycle.flow_step} />

      <div>
        <p className="text-sm text-white/50">
          Semana {new Date(cycle.week_start).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} –{" "}
          {new Date(cycle.week_end).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}
        </p>
        <h1 className="font-display text-2xl md:text-3xl">
          Esta semana: <span className="text-brand-cyan capitalize">{statusLabel(cycle.status)}</span>
        </h1>
      </div>

      {/* Panel 1 — Propuestas */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">5 Propuestas de la semana</h2>
          {proposals.length > 0 && (
            <button onClick={generateProposals} disabled={generating} className="btn-secondary text-xs">
              <Sparkles size={14} /> {generating ? "Generando…" : "Regenerar"}
            </button>
          )}
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        {proposals.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="max-w-sm text-sm text-white/60">
              Todavía no hay propuestas para esta semana. Las genero a partir del documento MAESTRO de
              estrategia y de lo que mejor funcionó las últimas semanas.
            </p>
            <button onClick={generateProposals} disabled={generating} className="btn-primary">
              <Sparkles size={16} /> {generating ? "Generando…" : "Generar 5 propuestas"}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {proposals.map((p) => (
                <ProposalCard key={p.id} proposal={p} onDecide={(status) => decide(p.id, status)} />
              ))}
            </div>
            {cycle.flow_step === 0 && (
              <motion.button
                onClick={startRecording}
                disabled={accepted.length === 0 || starting}
                whileTap={{ scale: 0.97 }}
                className="btn-primary mt-4 w-full"
              >
                {starting
                  ? "Preparando…"
                  : accepted.length === 0
                  ? "Seleccioná al menos 1 propuesta"
                  : `Iniciar Grabación (${accepted.length} reels)`}
              </motion.button>
            )}
          </>
        )}
      </section>

      {/* Panel 2 — Flujo de 4 horas */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Flujo de 4 horas</h2>
          <Countdown startedAt={cycle.flow_started_at} />
        </div>
        <ProgressSteps flowStep={cycle.flow_step} />
      </section>

      {/* Panel 3 — Tracking 7 días */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-cyan" />
          <h2 className="font-display text-lg">Tracking últimos 7 días</h2>
        </div>
        {summary ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Views" value={summary.totals.views} />
            <Stat label="Shares" value={summary.totals.shares} />
            <Stat label="Comentarios" value={summary.totals.comments} />
            <Stat label="Saves" value={summary.totals.saves} />
          </div>
        ) : (
          <p className="text-sm text-white/50">Sin métricas cargadas todavía — se cargan desde Análisis.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 text-center">
      <p className="font-display text-2xl text-brand-yellow">{value.toLocaleString("es-AR")}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

function statusLabel(status: string) {
  return (
    { planning: "En planificación", recording: "En grabación", designing: "En diseño", scheduled: "Programado", live: "En vivo", closed: "Cerrada" }[
      status
    ] ?? status
  );
}
