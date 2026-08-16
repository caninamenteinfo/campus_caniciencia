import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

export const metricsRouter = Router();

metricsRouter.post("/", requireAuth, async (req, res) => {
  const { reel_id, views = 0, shares = 0, comments = 0, saves = 0 } = req.body as {
    reel_id: string;
    views?: number;
    shares?: number;
    comments?: number;
    saves?: number;
  };
  if (!reel_id) return res.status(400).json({ error: "Falta reel_id." });

  const { data, error } = await req.db!
    .from("weekly_metrics")
    .insert({ reel_id, views, shares, comments, saves })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ metric: data });
});

metricsRouter.get("/", requireAuth, async (req, res) => {
  const reelId = req.query.reelId as string | undefined;
  if (!reelId) return res.status(400).json({ error: "Falta reelId." });
  const { data, error } = await req.db!
    .from("weekly_metrics")
    .select("*")
    .eq("reel_id", reelId)
    .order("recorded_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ metrics: data });
});
