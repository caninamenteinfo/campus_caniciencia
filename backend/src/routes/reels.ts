import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateCaptionSuggestions } from "../lib/claude.js";
import { readGoogleDocText, MASTER_DOCS } from "../lib/googleDrive.js";
import { cached } from "../lib/cache.js";

export const reelsRouter = Router();

reelsRouter.get("/", requireAuth, async (req, res) => {
  const cycleId = req.query.cycleId as string | undefined;
  if (!cycleId) return res.status(400).json({ error: "Falta cycleId." });
  const { data, error } = await req.db!.from("reels").select("*").eq("cycle_id", cycleId).order("order_index");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reels: data });
});

/** Crea los reels de la semana a partir de las propuestas aceptadas. */
reelsRouter.post("/from-proposals", requireAuth, async (req, res) => {
  const { cycleId } = req.body as { cycleId: string };
  const { data: accepted, error } = await req.db!
    .from("proposals")
    .select("*")
    .eq("cycle_id", cycleId)
    .eq("status", "accepted")
    .order("order_index");
  if (error) return res.status(500).json({ error: error.message });
  if (!accepted?.length) return res.status(400).json({ error: "No hay propuestas aceptadas." });

  const rows = accepted.map((p, i) => ({
    cycle_id: cycleId,
    proposal_id: p.id,
    order_index: i,
    title: p.hook,
    script: p.script,
    hashtags: [],
  }));

  const { data: inserted, error: insertError } = await req.db!.from("reels").insert(rows).select();
  if (insertError) return res.status(500).json({ error: insertError.message });
  res.json({ reels: inserted });
});

reelsRouter.patch("/:id", requireAuth, async (req, res) => {
  const allowed = [
    "recorded",
    "caption_short",
    "caption_long",
    "hashtags",
    "canva_design_id",
    "canva_export_url",
    "status",
    "published_at",
    "title",
    "script",
  ];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await req.db!.from("reels").update(patch).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reel: data });
});

reelsRouter.post("/:id/captions/suggest", requireAuth, async (req, res) => {
  const { data: reel } = await req.db!.from("reels").select("*").eq("id", req.params.id).single();
  if (!reel) return res.status(404).json({ error: "Reel no encontrado." });

  const googleToken = req.header("X-Google-Token");
  const tone = MASTER_DOCS.find((d) => d.role === "tone_guide");
  const toneGuide = tone?.fileId
    ? await cached(`doc:${tone.fileId}`, 15 * 60 * 1000, () => readGoogleDocText(tone.fileId, googleToken)).catch(
        () => undefined
      )
    : undefined;

  try {
    const suggestion = await generateCaptionSuggestions({ title: reel.title, script: reel.script ?? "", toneGuide });
    res.json(suggestion);
  } catch (err) {
    res.status(502).json({ error: "No se pudieron generar captions.", detail: (err as Error).message });
  }
});
