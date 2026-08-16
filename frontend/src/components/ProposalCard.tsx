import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import type { Proposal } from "../lib/types";

const POTENTIAL_COLOR: Record<Proposal["potential"], string> = {
  Alto: "bg-brand-cyan/15 text-brand-cyan",
  "Muy Alto": "bg-brand-orange/15 text-brand-orange",
  Máximo: "bg-brand-yellow/15 text-brand-yellow",
};

export function ProposalCard({
  proposal,
  onDecide,
}: {
  proposal: Proposal;
  onDecide: (status: "accepted" | "rejected") => void;
}) {
  const [open, setOpen] = useState(false);
  const decided = proposal.status !== "pending";

  return (
    <div
      className={`card p-4 transition ${
        proposal.status === "accepted"
          ? "border-brand-cyan/40"
          : proposal.status === "rejected"
          ? "opacity-40"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="pill bg-white/10 text-white/70">{proposal.category}</span>
            <span className={`pill ${POTENTIAL_COLOR[proposal.potential]}`}>{proposal.potential}</span>
            {proposal.tiktok_adapt && <span className="pill bg-white/10 text-white/50">TikTok</span>}
          </div>
          <p className="font-display text-base leading-snug">{proposal.hook}</p>
          <p className="mt-1 text-xs text-white/50">
            {proposal.recommended_day ?? "Día flexible"} · {proposal.duration_seconds}s
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => onDecide("accepted")}
            className={`rounded-full p-2 transition ${
              proposal.status === "accepted" ? "bg-brand-cyan text-base" : "bg-white/5 hover:bg-brand-cyan/20"
            }`}
            aria-label="Aceptar"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => onDecide("rejected")}
            className={`rounded-full p-2 transition ${
              proposal.status === "rejected" ? "bg-white/20" : "bg-white/5 hover:bg-red-500/20"
            }`}
            aria-label="Rechazar"
          >
            <X size={16} />
          </button>
          <button onClick={() => setOpen((v) => !v)} className="rounded-full bg-white/5 p-2 hover:bg-white/10">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm text-white/70">
          <p>{proposal.description}</p>
          {proposal.canva_direction && (
            <p className="flex items-start gap-1.5 text-xs text-white/50">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-yellow" />
              {proposal.canva_direction}
            </p>
          )}
          {proposal.script && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-brand-cyan">Ver guión completo</summary>
              <p className="mt-2 whitespace-pre-wrap text-white/60">{proposal.script}</p>
            </details>
          )}
        </div>
      )}
      {decided && !open && (
        <p className="mt-2 text-[11px] text-white/40">
          {proposal.status === "accepted" ? "✓ Seleccionado para esta semana" : "Descartado"}
        </p>
      )}
    </div>
  );
}
