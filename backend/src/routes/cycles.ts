import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { registerCycleCompleted } from "../lib/gamification.js";

export const cyclesRouter = Router();

function startOfWeek(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function endOfWeek(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 4); // lunes a viernes de producción
  return d.toISOString().slice(0, 10);
}

/** Devuelve el ciclo de la semana actual, creándolo si no existe. */
cyclesRouter.get("/current", requireAuth, async (req, res) => {
  const weekStart = startOfWeek();
  const { data: existing } = await req.db!.from("weekly_cycles").select("*").eq("week_start", weekStart).maybeSingle();

  if (existing) return res.json({ cycle: existing });

  const { data: created, error } = await req.db!
    .from("weekly_cycles")
    .insert({ user_id: req.userId, week_start: weekStart, week_end: endOfWeek(weekStart) })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ cycle: created });
});

cyclesRouter.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await req.db!.from("weekly_cycles").select("*").eq("id", req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });
  res.json({ cycle: data });
});

const VALID_STATUS = ["planning", "recording", "designing", "scheduled", "live", "closed"];

/** Avanza el flujo de 4 pasos (0-5) y/o el estado del ciclo. */
cyclesRouter.patch("/:id", requireAuth, async (req, res) => {
  const { flow_step, status } = req.body as { flow_step?: number; status?: string };
  const patch: Record<string, unknown> = {};

  if (flow_step !== undefined) {
    if (flow_step < 0 || flow_step > 5) return res.status(400).json({ error: "flow_step fuera de rango." });
    patch.flow_step = flow_step;
    if (flow_step === 1) patch.flow_started_at = new Date().toISOString();
    if (flow_step === 5) patch.flow_completed_at = new Date().toISOString();
  }
  if (status !== undefined) {
    if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: "status inválido." });
    patch.status = status;
  }

  const { data, error } = await req.db!
    .from("weekly_cycles")
    .update(patch)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  let gamification = null;
  if (flow_step === 5) {
    gamification = await registerCycleCompleted(req.userId!, data.week_start);
  }

  res.json({ cycle: data, gamification });
});

/** Panel 3: tracking de los últimos 7 días + racha/badges. */
cyclesRouter.get("/:id/summary", requireAuth, async (req, res) => {
  const { data: cycle } = await req.db!.from("weekly_cycles").select("*").eq("id", req.params.id).single();
  if (!cycle) return res.status(404).json({ error: "Ciclo no encontrado." });

  const { data: reels } = await req.db!.from("reels").select("id, title, status").eq("cycle_id", cycle.id);
  const reelIds = (reels ?? []).map((r) => r.id);

  const { data: metrics } = reelIds.length
    ? await req.db!.from("weekly_metrics").select("*").in("reel_id", reelIds)
    : { data: [] };

  const { data: profile } = await req.db!
    .from("profiles")
    .select("streak_count, longest_streak, badges")
    .eq("id", req.userId)
    .single();

  const totals = (metrics ?? []).reduce(
    (acc, m) => ({
      views: acc.views + m.views,
      shares: acc.shares + m.shares,
      comments: acc.comments + m.comments,
      saves: acc.saves + m.saves,
    }),
    { views: 0, shares: 0, comments: 0, saves: 0 }
  );

  res.json({ cycle, reels, totals, count: metrics?.length ?? 0, profile });
});
