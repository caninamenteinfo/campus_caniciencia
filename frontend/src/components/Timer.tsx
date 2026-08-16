import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Square } from "lucide-react";

export function Timer() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now() - ms;
    const id = setInterval(() => setMs(Date.now() - startRef.current), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const total = Math.floor(ms / 1000);
  const label = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
      <span className="font-display text-2xl tabular-nums text-brand-cyan">{label}</span>
      <button
        onClick={() => setRunning((v) => !v)}
        className="rounded-full bg-brand-orange p-2 text-base"
        aria-label={running ? "Pausar" : "Iniciar"}
      >
        {running ? <Square size={14} /> : <Play size={14} />}
      </button>
      <button
        onClick={() => {
          setRunning(false);
          setMs(0);
        }}
        className="rounded-full bg-white/10 p-2"
        aria-label="Reiniciar"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
