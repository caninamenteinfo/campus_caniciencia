import { supabaseAdmin } from "./supabase.js";

const STREAK_BADGES: Record<number, string> = {
  1: "🐾 Primera Semana",
  3: "🔥 Racha de 3",
  5: "⚡ Racha de 5",
  10: "🏆 Racha de 10",
  20: "👑 Leyenda CaninaMente",
};

/** Se llama cuando un ciclo semanal llega a flow_step = 5 (completado). */
export async function registerCycleCompleted(userId: string, weekStart: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("streak_count, longest_streak, badges, last_completed_week")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const lastWeek = profile.last_completed_week ? new Date(profile.last_completed_week) : null;
  const thisWeek = new Date(weekStart);
  const isConsecutive =
    lastWeek !== null && (thisWeek.getTime() - lastWeek.getTime()) / (1000 * 60 * 60 * 24) <= 8;

  const newStreak = isConsecutive ? profile.streak_count + 1 : 1;
  const newLongest = Math.max(newStreak, profile.longest_streak ?? 0);
  const newBadge = STREAK_BADGES[newStreak];
  const badges = new Set<string>(profile.badges ?? []);
  if (newBadge) badges.add(newBadge);

  await supabaseAdmin
    .from("profiles")
    .update({
      streak_count: newStreak,
      longest_streak: newLongest,
      badges: Array.from(badges),
      last_completed_week: weekStart,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { streak: newStreak, longestStreak: newLongest, newBadge: newBadge ?? null };
}
