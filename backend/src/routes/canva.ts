import { Router } from "express";
import { randomBytes } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { encryptToken, decryptToken } from "../lib/crypto.js";
import { env, features } from "../lib/env.js";
import {
  buildCanvaAuthUrl,
  createDesignFromReel,
  createPkcePair,
  exchangeCanvaCode,
  exportCanvaDesign,
  refreshCanvaToken,
} from "../lib/canva.js";

export const canvaRouter = Router();

// state -> { verifier, userId }, en memoria (vida corta, un solo proceso).
const pendingOAuth = new Map<string, { verifier: string; userId: string }>();

canvaRouter.get("/status", requireAuth, async (req, res) => {
  if (!features.canva) return res.json({ configured: false, connected: false });
  const { data } = await supabaseAdmin
    .from("integration_tokens")
    .select("id")
    .eq("user_id", req.userId)
    .eq("provider", "canva")
    .maybeSingle();
  res.json({ configured: true, connected: Boolean(data) });
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

async function getValidCanvaAccessToken(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("integration_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "canva")
    .single();

  if (!data) throw new Error("Canva no está conectado. Andá a Ajustes y conectá tu cuenta.");

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now() + 60_000) {
    const refreshed = await refreshCanvaToken(decryptToken(data.refresh_token));
    await supabaseAdmin
      .from("integration_tokens")
      .update({
        access_token: encryptToken(refreshed.access_token),
        refresh_token: encryptToken(refreshed.refresh_token),
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "canva");
    return refreshed.access_token;
  }

  return decryptToken(data.access_token);
}

/** Genera el diseño en Canva (autofill de la brand template) para un reel. */
canvaRouter.post("/design", requireAuth, async (req, res) => {
  const { reel_id } = req.body as { reel_id: string };
  if (!env.canvaBrandTemplateId) {
    return res.status(503).json({ error: "Falta CANVA_BRAND_TEMPLATE_ID en el servidor." });
  }
  const { data: reel } = await req.db!.from("reels").select("*").eq("id", reel_id).single();
  if (!reel) return res.status(404).json({ error: "Reel no encontrado." });

  try {
    const accessToken = await getValidCanvaAccessToken(req.userId!);
    const design = await createDesignFromReel(accessToken, env.canvaBrandTemplateId, {
      title: { type: "text", text: reel.title },
      hook: { type: "text", text: reel.caption_short ?? reel.title },
    });
    const { data: updated, error } = await req.db!
      .from("reels")
      .update({ canva_design_id: design.designId, status: "designed" })
      .eq("id", reel_id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ reel: updated, editUrl: design.editUrl, viewUrl: design.viewUrl });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** Exporta el diseño ya generado a MP4 (o PNG) y guarda la URL final. */
canvaRouter.post("/export", requireAuth, async (req, res) => {
  const { reel_id, format = "mp4" } = req.body as { reel_id: string; format?: "mp4" | "png" };
  const { data: reel } = await req.db!.from("reels").select("*").eq("id", reel_id).single();
  if (!reel?.canva_design_id) return res.status(400).json({ error: "El reel todavía no tiene diseño en Canva." });

  try {
    const accessToken = await getValidCanvaAccessToken(req.userId!);
    const urls = await exportCanvaDesign(accessToken, reel.canva_design_id, format);
    const { data: updated, error } = await req.db!
      .from("reels")
      .update({ canva_export_url: urls[0] })
      .eq("id", reel_id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ reel: updated, urls });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
