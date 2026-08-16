import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import type { WeeklyCycle } from "../lib/types";
import { FLOW_STEPS } from "../lib/types";

/**
 * Bloquea un paso del flujo obligatorio de 4 horas hasta que el anterior
 * esté marcado como completo. Evita saltarse pasos (grabación → captions →
 * diseño → programación).
 */
export function FlowGuard({
  cycle,
  requiredStep,
  children,
}: {
  cycle: WeeklyCycle;
  requiredStep: number;
  children: React.ReactNode;
}) {
  if (cycle.flow_step >= requiredStep - 1) return <>{children}</>;

  const previous = FLOW_STEPS.find((s) => s.step === requiredStep - 1);

  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <div className="rounded-full bg-brand-orange/15 p-4">
        <Lock className="text-brand-orange" size={28} />
      </div>
      <h2 className="font-display text-xl">Todavía no llegamos hasta acá</h2>
      <p className="text-sm text-white/60">
        {previous
          ? `Primero terminá "${previous.label}" — así el flujo se mantiene ordenado y nada se pierde en el camino.`
          : "Empezá por el Dashboard para iniciar la sesión de producción de la semana."}
      </p>
      <Link to={previous?.path ?? "/"} className="btn-primary">
        Ir a {previous?.label ?? "Dashboard"}
      </Link>
    </div>
  );
}
