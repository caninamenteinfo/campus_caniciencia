import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { WeeklyCycle } from "../lib/types";
import { FLOW_STEPS } from "../lib/types";
import { toast } from "../store/toast";

/**
 * Bloquea un paso del flujo obligatorio de 4 horas hasta que el anterior
 * esté marcado como completo — sistema "anti-escape": no se puede saltear
 * pasos (grabación → captions → diseño → programación).
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
  const blocked = cycle.flow_step < requiredStep - 1;
  const previous = FLOW_STEPS.find((s) => s.step === requiredStep - 1);

  useEffect(() => {
    if (blocked) {
      toast(
        previous
          ? `Todavía no podés entrar acá — terminá "${previous.label}" primero.`
          : "Todavía no podés entrar acá — empezá desde el Dashboard.",
        "warning"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  if (!blocked) return <>{children}</>;

  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-4 border-brand-yellow/30 bg-brand-yellow/[0.04] p-10 text-center">
      <div className="rounded-full bg-brand-yellow/15 p-4">
        <AlertTriangle className="text-brand-yellow" size={28} />
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
