import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/**
 * Trae un video protegido (requiere el Bearer token de Supabase, así que no
 * puede ir directo en un <video src>) como blob autenticado y expone una
 * object URL. `refreshKey` fuerza un re-fetch (ej. al re-exportar después
 * de editar en Canva).
 */
export function useMediaUrl(path: string | null, refreshKey: unknown = 0) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getBlob(path)
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = objectUrl;
        setUrl(objectUrl);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar el video.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, refreshKey]);

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    []
  );

  return { url, loading, error };
}
