import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Cuenta regresiva de las 4 horas de producción a partir de flow_started_at. */
export function Countdown({ startedAt, hours = 4 }: { startedAt: string | null; hours?: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) {
    return <span className="font-display text-3xl text-white/30">--:--:--</span>;
  }

  const deadline = new Date(startedAt).getTime() + hours * 60 * 60 * 1000;
  const remaining = deadline - now;
  const urgent = remaining < 30 * 60 * 1000;

  return (
    <span className={`font-display text-3xl tabular-nums ${urgent ? "text-brand-orange" : "text-brand-cyan"}`}>
      {format(remaining)}
    </span>
  );
}
