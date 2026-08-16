import { Flame } from "lucide-react";
import type { Profile } from "../lib/types";

export function StreakBadge({ profile }: { profile: Profile | null }) {
  if (!profile) return null;
  return (
    <div className="flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1.5">
      <Flame size={16} className="text-brand-orange" />
      <span className="font-display text-sm">{profile.streak_count}</span>
      <span className="text-xs text-white/60">semanas seguidas</span>
    </div>
  );
}
