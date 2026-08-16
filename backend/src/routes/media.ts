import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { hasStoredVideo, openStoredVideo } from "../lib/storage.js";

export const mediaRouter = Router();

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Sirve el MP4 exportado de un reel (desde GCS o disco local, según
 * configuración). Requiere sesión — la fila del reel se busca con `req.db`
 * (respeta RLS), así que un video ajeno nunca resuelve, aunque se adivine
 * el UUID. Soporta `Range` para el scrubbing del <video> y
 * `?download=1` para forzar la descarga con nombre de archivo lindo.
 */
mediaRouter.get("/reels/:id", requireAuth, async (req, res) => {
  const { data: reel } = await req.db!
    .from("reels")
    .select("id, title, order_index, canva_export_url")
    .eq("id", req.params.id)
    .single();

  if (!reel || !reel.canva_export_url) {
    return res.status(404).json({ error: "Este reel todavía no tiene un video exportado." });
  }
  if (!(await hasStoredVideo(reel.id))) {
    return res.status(404).json({ error: "El archivo de video no está disponible en el servidor." });
  }

  const rangeHeader = req.headers.range;
  const range = rangeHeader ? parseRange(rangeHeader) : undefined;

  try {
    const media = await openStoredVideo(reel.id, range);

    if (req.query.download) {
      const filename = `Reel-${(reel.order_index ?? 0) + 1}-${slugify(reel.title)}.mp4`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    }

    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Accept-Ranges", "bytes");
    if (media.contentLength !== undefined) res.setHeader("Content-Length", media.contentLength);
    res.status(range ? 206 : 200);

    media.stream.pipe(res);
  } catch (err) {
    console.error("Error sirviendo media:", (err as Error).message);
    res.status(500).json({ error: "No se pudo leer el video." });
  }
});

function parseRange(header: string): { start: number; end?: number } | undefined {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  return { start, end };
}
