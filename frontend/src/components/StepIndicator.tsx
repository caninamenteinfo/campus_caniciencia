import { FLOW_STEPS } from "../lib/types";

/** Indicador "Paso X/4" siempre visible — para que nunca se pierda de vista dónde estás. */
export function StepIndicator({ flowStep }: { flowStep: number }) {
  if (flowStep >= 4) {
    return <span className="pill bg-brand-cyan/15 text-brand-cyan">✓ Flujo completo</span>;
  }

  const currentStep = flowStep + 1;
  const current = FLOW_STEPS.find((s) => s.step === currentStep);

  return (
    <div className="flex items-center gap-2 rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1.5">
      <span className="font-display text-xs text-brand-cyan">Paso {currentStep}/4</span>
      {current && <span className="text-[11px] text-white/50">{current.label}</span>}
    </div>
  );
}
