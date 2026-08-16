import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateWeeklyInsights } from "../lib/claude.js";

export const feedbackRouter = Router();

feedbackRouter.get("/:cycleId", requireAuth, async (req, res) => {
  const { data, error } = await req.db!
    .from("weekly_feedback")
    .select("*")
    .eq("cycle_id", req.params.cycleId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ feedback: data });
});

/** Cierre de semana: guarda notas del usuario y pide a Claude insights automáticos. */
feedbackRouter.post("/", requireAuth, async (req, res) => {
  const { cycle_id, notes } = req.body as { cycle_id: string; notes?: string };
  if (!cycle_id) return res.status(400).json({ error: "Falta cycle_id." });

  const { data: reels } = await req.db!.from("reels").select("id, title").eq("cycle_id", cycle_id);
  const reelIds = (reels ?? []).map((r) => r.id);
  const { data: metrics } = reelIds.length
    ? await req.db!.from("weekly_metrics").select("reel_id, views, shares, comments, saves").in("reel_id", reelIds)
    : { data: [] };

  const metricsSummary = (reels ?? [])
    .map((r) => {
      const m = (metrics ?? []).find((x) => x.reel_id === r.id);
      return m ? `${r.title}: ${m.views} views, ${m.shares} shares, ${m.comments} comentarios, ${m.saves} saves` : `${r.title}: sin métricas`;
    })
    .join("\n");

  let insights = { what_worked: "", what_didnt: "", recommendation: "" };
  try {
    insights = await generateWeeklyInsights({ metricsSummary });
  } catch {
    // Si Claude no está configurado seguimos guardando el feedback manual igual.
  }

  const { data, error } = await req.db!
    .from("weekly_feedback")
    .upsert(
      {
        cycle_id,
        notes: notes ?? null,
        insights_good: insights.what_worked,
        insights_bad: insights.what_didnt,
        recommendation: insights.recommendation,
      },
      { onConflict: "cycle_id" }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ feedback: data });
});
