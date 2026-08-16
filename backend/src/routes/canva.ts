import { Router } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { encryptToken } from "../lib/crypto.js";
import { env, features } from "../lib/env.js";
import { buildCanvaAuthUrl, createPkcePair, exchangeCanvaCode } from "../lib/canva.js";
import { isCanvaConnected } from "../lib/canvaAuth.js";
import { exportAndPersistReel, generateDesignForReel } from "../lib/canvaDesign.js";
import { resolveTemplateDef } from "../lib/canvaTemplates.js";

export const canvaRouter = Router();

// state -> { verifier, userId }, en memoria (vida corta, un solo proceso).
const pendingOAuth = new Map<string, { verifier: string; userId: string }>();

canvaRouter.get("/status", requireAuth, async (req, res) => {
  if (!features.canva) return res.json({ configured: false, connected: false });
  res.json({ configured: true, connected: await isCanvaConnected(req.userId!) });
});

canvaRouter.get("/oauth/start", requireAuth, (req, res) => {
  if (!features.canva) return res.status(503).json({ error: "Canva no está configurado en el servidor." });
  const { verifier, challenge } = createPkcePair();
  const state = randomBytes(16).toString("hex");
  pendingOAuth.set(state, { verifier, userId: req.userId! });
  res.json({ url: buildCanvaAuthUrl(state, challenge) });
});

canvaRouter.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const pending = state ? pendingOAuth.get(state) : undefined;
  if (!code || !pending) {
    return res.redirect(`${env.frontendUrl}/ajustes?canva=error`);
  }
  pendingOAuth.delete(state!);

  try {
    const tokens = await exchangeCanvaCode(code, pending.verifier);
    await supabaseAdmin.from("integration_tokens").upsert(
      {
        user_id: pending.userId,
        provider: "canva",
        access_token: encryptToken(tokens.access_token),
        refresh_token: encryptToken(tokens.refresh_token),
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );
    res.redirect(`${env.frontendUrl}/ajustes?canva=conectado`);
  } catch (err) {
    console.error("Canva OAuth callback error:", err);
    res.redirect(`${env.frontendUrl}/ajustes?canva=error`);
  }
});

/** Devuelve qué template (de los 5 mapeados por categoría) le toca a un reel. */
canvaRouter.get("/template-for/:reelId", requireAuth, async (req, res) => {
  const { data: reel } = await req.db!.from("reels").select("category").eq("id", req.params.reelId).single();
  if (!reel) return res.status(404).json({ error: "Reel no encontrado." });
  res.json({ template: resolveTemplateDef(reel.category) });
});

/** Genera el diseño en Canva (autofill de la brand template mapeada por categoría) para un reel. */
canvaRouter.post("/design", requireAuth, async (req, res) => {
  const { reel_id } = req.body as { reel_id: string };
  const { data: reel } = await req.db!.from("reels").select("*").eq("id", reel_id).single();
  if (!reel) return res.status(404).json({ error: "Reel no encontrado." });

  try {
    const design = await generateDesignForReel(req.userId!, reel);
    const { data: updated, error } = await req.db!.from("reels").select("*").eq("id", reel_id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ reel: updated, editUrl: design.editUrl, viewUrl: design.viewUrl });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** Exporta el diseño ya generado a MP4 (o PNG), lo persiste y guarda la URL final. */
canvaRouter.post("/export", requireAuth, async (req, res) => {
  const { reel_id, format = "mp4" } = req.body as { reel_id: string; format?: "mp4" | "png" };
  const { data: reel } = await req.db!.from("reels").select("*").eq("id", reel_id).single();
  if (!reel) return res.status(404).json({ error: "Reel no encontrado." });

  try {
    await exportAndPersistReel(req.userId!, reel, format);
    const { data: updated, error } = await req.db!.from("reels").select("*").eq("id", reel_id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ reel: updated });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
