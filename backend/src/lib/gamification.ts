import { supabaseAdmin } from "./supabase.js";
import { ALL_BADGES, BadgeId, LEYENDA_BADGE, THRESHOLDS, normalize } from "./badges.js";

interface CycleRow {
  id: string;
  week_start: string;
  flow_started_at: string | null;
  flow_completed_at: string | null;
}

export interface BadgeUnlockResult {
  streak: number;
  longestStreak: number;
  badges: BadgeId[];
  newlyUnlocked: BadgeId[];
}

/**
 * Se llama al cerrar una semana (flow_step = 5). Evalúa los 8 badges contra
 * el historial completo del usuario (no solo la semana que se cierra) y
 * persiste racha + badges en `profiles`. Los badges nunca se revocan.
 */
export async function evaluateAndUnlockBadges(userId: string, cycle: CycleRow): Promise<BadgeUnlockResult | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("streak_count, longest_streak, badges, last_completed_week")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  // --- Racha ---
  const lastWeek = profile.last_completed_week ? new Date(profile.last_completed_week) : null;
  const thisWeek = new Date(cycle.week_start);
  const isConsecutive =
    lastWeek !== null && (thisWeek.getTime() - lastWeek.getTime()) / (1000 * 60 * 60 * 24) <= 8;
  const streak = isConsecutive ? profile.streak_count + 1 : 1;
  const longestStreak = Math.max(streak, profile.longest_streak ?? 0);

  // --- Historial completo del usuario para los badges acumulativos ---
  const { data: cycles } = await supabaseAdmin.from("weekly_cycles").select("id").eq("user_id", userId);
  const cycleIds = (cycles ?? []).map((c) => c.id);

  const { data: reels } = cycleIds.length
    ? await supabaseAdmin.from("reels").select("id, category").in("cycle_id", cycleIds)
    : { data: [] as { id: string; category: string | null }[] };

  const reelIds = (reels ?? []).map((r) => r.id);
  const { data: metrics } = reelIds.length
    ? await supabaseAdmin.from("weekly_metrics").select("reel_id, views, comments").in("reel_id", reelIds)
    : { data: [] as { reel_id: string; views: number; comments: number }[] };

  const viewsByReel = new Map<string, number>();
  const commentsByReel = new Map<string, number>();
  for (const m of metrics ?? []) {
    viewsByReel.set(m.reel_id, (viewsByReel.get(m.reel_id) ?? 0) + m.views);
    commentsByReel.set(m.reel_id, (commentsByReel.get(m.reel_id) ?? 0) + m.comments);
  }

  const totalReels = reels?.length ?? 0;
  const neurobiologiaReels = (reels ?? []).filter((r) => normalize(r.category).includes("neurobiolog")).length;
  const transformacionalReels = (reels ?? []).filter((r) => normalize(r.category).includes("transformacional")).length;
  const hasViralReel = [...viewsByReel.values()].some((v) => v >= THRESHOLDS.VIRAL_VIEWS);
  const hasHighCommentReel = [...commentsByReel.values()].some((c) => c >= THRESHOLDS.COMMENTS);

  const fastCompletion =
    Boolean(cycle.flow_started_at && cycle.flow_completed_at) &&
    new Date(cycle.flow_completed_at!).getTime() - new Date(cycle.flow_started_at!).getTime() <=
      THRESHOLDS.FAST_COMPLETION_MS;

  const earned = new Set<BadgeId>(profile.badges ?? []);
  if (fastCompletion) earned.add("productor_rapido");
  if (hasViralReel) earned.add("viralidad");
  if (neurobiologiaReels >= THRESHOLDS.NEUROBIOLOGIA_REELS) earned.add("neurobiologia_master");
  if (hasHighCommentReel) earned.add("comentarista");
  if (streak >= THRESHOLDS.STREAK_WEEKS) earned.add("streak_4");
  if (totalReels >= THRESHOLDS.DIRECTOR_REELS) earned.add("director");
  if (transformacionalReels >= THRESHOLDS.VISIONARIO_REELS) earned.add("visionario");

  const allSevenUnlocked = ALL_BADGES.filter((b) => b.id !== "leyenda").every((b) => earned.has(b.id));
  if (allSevenUnlocked) earned.add(LEYENDA_BADGE.id);

  const previouslyUnlocked = new Set(profile.badges ?? []);
  const newlyUnlocked = [...earned].filter((id) => !previouslyUnlocked.has(id));

  await supabaseAdmin
    .from("profiles")
    .update({
      streak_count: streak,
      longest_streak: longestStreak,
      badges: Array.from(earned),
      last_completed_week: cycle.week_start,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { streak, longestStreak, badges: Array.from(earned), newlyUnlocked };
}
