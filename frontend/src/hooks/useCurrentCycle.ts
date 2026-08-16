import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { WeeklyCycle } from "../lib/types";

export function useCurrentCycle() {
  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    return api
      .get<{ cycle: WeeklyCycle }>("/api/cycles/current")
      .then((r) => setCycle(r.cycle))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cycle, loading, error, reload };
}
