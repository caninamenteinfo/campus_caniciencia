import { useEffect, useRef } from "react";

/** Ejecuta `effect` `delayMs` después del último cambio en `deps` — para auto-guardado. */
export function useDebouncedEffect(effect: () => void, deps: unknown[], delayMs = 900) {
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(effect, delayMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
