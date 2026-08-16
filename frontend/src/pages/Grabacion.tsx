import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Mic2, Volume2, Wind } from "lucide-react";
import { api } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import type { Reel } from "../lib/types";
import { Loader } from "../components/Loader";
import { FlowGuard } from "../components/FlowGuard";
import { Timer } from "../components/Timer";
import { celebrate } from "../lib/celebrate";

const CHECKLIST = [
  { icon: Camera, label: "Cámara en trípode" },
  { icon: Volume2, label: "Luz suave de frente" },
  { icon: Mic2, label: "Micrófono cercano" },
  { icon: Wind, label: "Respirá 3 veces antes de arrancar" },
];

export function Grabacion() {
  const { cycle, loading: cycleLoading } = useCurrentCycle();
  const [reels, setReels] = useState<Reel[]>([]);
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cycle) return;
    api.get<{ reels: Reel[] }>(`/api/reels?cycleId=${cycle.id}`).then((r) => setReels(r.reels));
  }, [cycle]);

  if (cycleLoading || !cycle) return <Loader />;

  return (
    <FlowGuard cycle={cycle} requiredStep={1}>
      <GrabacionBody
        cycle={cycle}
        reels={reels}
        setReels={setReels}
        index={index}
        setIndex={setIndex}
        checked={checked}
        setChecked={setChecked}
        saving={saving}
        setSaving={setSaving}
        navigate={navigate}
      />
    </FlowGuard>
  );
}

function GrabacionBody({
  cycle,
  reels,
  setReels,
  index,
  setIndex,
  checked,
  setChecked,
  saving,
  setSaving,
  navigate,
}: {
  cycle: NonNullable<ReturnType<typeof useCurrentCycle>["cycle"]>;
  reels: Reel[];
  setReels: React.Dispatch<React.SetStateAction<Reel[]>>;
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  checked: Record<number, boolean>;
  setChecked: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (reels.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-white/60">
          No hay reels para grabar todavía. Volvé al Dashboard y aceptá propuestas primero.
        </p>
      </div>
    );
  }

  const reel = reels[index];
  const allRecorded = reels.every((r) => r.recorded);
  const allChecked = CHECKLIST.every((_, i) => checked[i]);

  async function markRecorded() {
    setSaving(true);
    try {
      const updated = await api.patch<{ reel: Reel }>(`/api/reels/${reel.id}`, {
        recorded: true,
        status: "recorded",
      });
      setReels((prev) => prev.map((r) => (r.id === updated.reel.id ? updated.reel : r)));
      celebrate("step");
      if (index < reels.length - 1) {
        setIndex(index + 1);
        setChecked({});
      }
    } finally {
      setSaving(false);
    }
  }

  async function finishStep() {
    await api.patch(`/api/cycles/${cycle.id}`, { flow_step: 1 });
    celebrate("step");
    navigate("/captions");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Grabación</h1>
        <span className="text-sm text-white/50">
          Reel {index + 1} de {reels.length}
        </span>
      </div>

      <div className="flex gap-1.5">
        {reels.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setIndex(i)}
            className={`h-1.5 flex-1 rounded-full transition ${
              r.recorded ? "bg-brand-cyan" : i === index ? "bg-brand-orange" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="font-display text-lg">{reel.title}</h2>
        <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm leading-relaxed text-white/80">
          {reel.script || "Sin guión — escribilo libremente antes de grabar."}
        </div>
        <p className="text-xs text-white/40">
          Leé el guión 3 veces antes de grabar. Hablá natural, no memorizado. Si te equivocás: parás,
          respirás, repetís.
        </p>
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-display text-sm text-white/70">Setup técnico</h3>
        <div className="grid grid-cols-2 gap-2">
          {CHECKLIST.map((item, i) => (
            <button
              key={item.label}
              onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition ${
                checked[i] ? "border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan" : "border-white/10 bg-white/5 text-white/60"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-center gap-4 p-5">
        <Timer />
        <button
          onClick={markRecorded}
          disabled={!allChecked || saving || reel.recorded}
          className="btn-primary w-full"
        >
          {reel.recorded ? "✓ Ya grabado" : saving ? "Guardando…" : "Marcar como grabado"}
        </button>
        {!allChecked && !reel.recorded && (
          <p className="text-xs text-white/40">Completá el checklist para habilitar el botón.</p>
        )}
      </section>

      {allRecorded && (
        <button onClick={finishStep} className="btn-primary w-full animate-pulseGlow">
          Los {reels.length} reels están grabados — continuar a Captions
        </button>
      )}
    </div>
  );
}
