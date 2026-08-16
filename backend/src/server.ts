import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env, features } from "./lib/env.js";
import { startScheduler } from "./jobs/scheduler.js";
import { driveRouter } from "./routes/drive.js";
import { cyclesRouter } from "./routes/cycles.js";
import { proposalsRouter } from "./routes/proposals.js";
import { reelsRouter } from "./routes/reels.js";
import { metricsRouter } from "./routes/metrics.js";
import { feedbackRouter } from "./routes/feedback.js";
import { canvaRouter } from "./routes/canva.js";
import { pushRouter } from "./routes/push.js";
import { mediaRouter } from "./routes/media.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, features });
});

app.use("/api/drive", driveRouter);
app.use("/api/cycles", cyclesRouter);
app.use("/api/proposals", proposalsRouter);
app.use("/api/reels", reelsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/canva", canvaRouter);
app.use("/api/push", pushRouter);
app.use("/api/media", mediaRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(env.port, () => {
  console.log(`🐾 CaninaMente backend escuchando en http://localhost:${env.port}`);
  if (!features.claude) console.warn("⚠️  ANTHROPIC_API_KEY no configurada: propuestas/captions/insights con IA deshabilitados.");
  if (!features.canva) console.warn("⚠️  CANVA_CLIENT_ID/SECRET no configurados: integración con Canva deshabilitada.");
  if (!features.push) console.warn("⚠️  VAPID keys no configuradas: alarmas push deshabilitadas (solo log en consola).");
  console.log(
    features.gcs
      ? `☁️  Videos exportados se guardan en gs://${env.gcsBucket}`
      : `💾 Videos exportados se guardan en disco local (${env.mediaStorageDir}) — configurá GCS_BUCKET para producción.`
  );
  startScheduler();
});
