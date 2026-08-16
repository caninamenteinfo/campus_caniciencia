import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { env, features } from "../lib/env.js";

export const pushRouter = Router();

pushRouter.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: features.push ? env.vapidPublicKey : null });
});

pushRouter.post("/subscribe", requireAuth, async (req, res) => {
  const { subscription } = req.body as { subscription: unknown };
  if (!subscription) return res.status(400).json({ error: "Falta subscription." });
  const { error } = await req.db!
    .from("push_subscriptions")
    .upsert({ user_id: req.userId, subscription }, { onConflict: "user_id,subscription" });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

pushRouter.delete("/subscribe", requireAuth, async (req, res) => {
  const { endpoint } = req.body as { endpoint: string };
  const { error } = await req.db!
    .from("push_subscriptions")
    .delete()
    .eq("user_id", req.userId)
    .filter("subscription->>endpoint", "eq", endpoint);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
