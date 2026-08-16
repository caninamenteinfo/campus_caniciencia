import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { MASTER_DOCS, readGoogleDocText } from "../lib/googleDrive.js";
import { cached } from "../lib/cache.js";

export const driveRouter = Router();

driveRouter.get("/docs", requireAuth, (_req, res) => {
  res.json({ docs: MASTER_DOCS });
});

/** Lee un documento maestro por rol (master | tone_guide | design_guide | ...). */
driveRouter.get("/docs/:role", requireAuth, async (req, res) => {
  const doc = MASTER_DOCS.find((d) => d.role === req.params.role);
  if (!doc || !doc.fileId) {
    return res.status(404).json({ error: "Documento no configurado." });
  }
  const googleToken = req.header("X-Google-Token");
  try {
    const text = await cached(`doc:${doc.fileId}`, 15 * 60 * 1000, () =>
      readGoogleDocText(doc.fileId, googleToken)
    );
    res.json({ ...doc, text });
  } catch (err) {
    res.status(502).json({
      error:
        "No se pudo leer el documento de Google Drive. Verificá el login con Google (scopes de Drive) o la service account.",
      detail: (err as Error).message,
    });
  }
});
