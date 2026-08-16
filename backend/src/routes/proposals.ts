import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateWeeklyProposals } from "../lib/claude.js";
import { readGoogleDocText, MASTER_DOCS } from "../lib/googleDrive.js";
import { cached } from "../lib/cache.js";

export const proposalsRouter = Router();

proposalsRouter.get("/", requireAuth, async (req, res) => {
  const cycleId = req.query.cycleId as string | undefined;
  if (!cycleId) return res.status(400).json({ error: "Falta cycleId." });
  const { data, error } = await req.db!
    .from("proposals")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("order_index");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ proposals: data });
});

/** Genera 5 propuestas con Claude a partir del documento MAESTRO + rendimiento reciente. */
proposalsRouter.post("/generate", requireAuth, async (req, res) => {
  const { cycleId } = req.body as { cycleId: string };
  if (!cycleId) return res.status(400).json({ error: "Falta cycleId." });

  const googleToken = req.header("X-Google-Token");
  const master = MASTER_DOCS.find((d) => d.role === "master");
  const tone = MASTER_DOCS.find((d) => d.role === "tone_guide");

  try {
    const masterDoc = master?.fileId
      ? await cached(`doc:${master.fileId}`, 15 * 60 * 1000, () => readGoogleDocText(master.fileId, googleToken))
      : "";
    const toneGuide = tone?.fileId
      ? await cached(`doc:${tone.fileId}`, 15 * 60 * 1000, () => readGoogleDocText(tone.fileId, googleToken)).catch(
          () => undefined
        )
      : undefined;

    if (!masterDoc) {
      return res.status(502).json({
        error: "No se pudo leer el documento MAESTRO. Iniciá sesión con Google (permiso de Drive) e intentá de nuevo.",
      });
    }

    // Rendimiento de las últimas semanas, para que Claude no repita lo que no funcionó.
    const { data: recentCycles } = await req.db!
      .from("weekly_cycles")
      .select("id, week_start")
      .order("week_start", { ascending: false })
      .limit(5);
    const recentCycleIds = (recentCycles ?? []).map((c) => c.id);
    const { data: recentReels } = recentCycleIds.length
      ? await req.db!.from("reels").select("id, title, status").in("cycle_id", recentCycleIds)
      : { data: [] };
    const recentReelIds = (recentReels ?? []).map((r) => r.id);
    const { data: recentMetrics } = recentReelIds.length
      ? await req.db!.from("weekly_metrics").select("reel_id, views, shares, comments, saves").in("reel_id", recentReelIds)
      : { data: [] };

    const recentPerformance = (recentReels ?? [])
      .map((r) => {
        const m = (recentMetrics ?? []).find((x) => x.reel_id === r.id);
        return m ? `${r.title}: ${m.views} views, ${m.shares} shares, ${m.comments} comentarios, ${m.saves} saves` : null;
      })
      .filter(Boolean)
      .join("\n");

    const generated = await generateWeeklyProposals({ masterDoc, toneGuide, recentPerformance });

    // Reemplaza propuestas pendientes anteriores del ciclo (si se regenera).
    await req.db!.from("proposals").delete().eq("cycle_id", cycleId).eq("status", "pending");

    const rows = generated.map((p, i) => ({ cycle_id: cycleId, order_index: i, ...p }));
    const { data: inserted, error } = await req.db!.from("proposals").insert(rows).select();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ proposals: inserted });
  } catch (err) {
    res.status(502).json({ error: "No se pudieron generar propuestas.", detail: (err as Error).message });
  }
});

proposalsRouter.patch("/:id", requireAuth, async (req, res) => {
  const allowed = ["hook", "description", "script", "status", "recommended_day"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await req.db!.from("proposals").update(patch).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ proposal: data });
});
