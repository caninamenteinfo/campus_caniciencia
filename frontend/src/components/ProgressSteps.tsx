import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { FLOW_STEPS } from "../lib/types";

export function ProgressSteps({ flowStep }: { flowStep: number }) {
  const nextStep = FLOW_STEPS.find((s) => s.step > flowStep) ?? FLOW_STEPS[FLOW_STEPS.length - 1];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {FLOW_STEPS.map((s) => {
          const done = flowStep >= s.step;
          const current = s.step === nextStep.step && flowStep < 4;
          return (
            <div key={s.step} className="flex flex-col items-center gap-1.5 text-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-display transition ${
                  done
                    ? "border-brand-cyan bg-brand-cyan/20 text-brand-cyan"
                    : current
                    ? "animate-pulseGlow border-brand-orange bg-brand-orange/20 text-brand-orange"
                    : "border-white/15 text-white/40"
                }`}
              >
                {done ? <Check size={16} /> : s.step}
              </div>
              <span className="text-[11px] leading-tight text-white/60">{s.label}</span>
              <span className="text-[10px] text-white/30">{s.window}</span>
            </div>
          );
        })}
      </div>

      {flowStep < 4 && (
        <Link to={nextStep.path} className="btn-primary w-full animate-pulseGlow">
          Siguiente paso: {nextStep.label}
        </Link>
      )}
      {flowStep >= 4 && (
        <p className="text-center text-sm text-brand-cyan">
          🎉 Flujo de producción completo. Ahora tocá monitorear resultados en Análisis.
        </p>
      )}
    </div>
  );
}
