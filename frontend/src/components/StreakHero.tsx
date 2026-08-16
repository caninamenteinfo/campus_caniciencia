import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { Profile } from "../lib/types";

/** Banner grande de racha arriba del Dashboard, con progreso hacia la próxima semana. */
export function StreakHero({ profile, flowStep }: { profile: Profile | null; flowStep: number }) {
  const streak = profile?.streak_count ?? 0;
  const progressPct = Math.min(100, Math.round((flowStep / 4) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-5 overflow-hidden p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={streak > 0 ? { scale: [1, 1.15, 1] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/15"
          >
            <Flame className="text-brand-orange" size={26} />
          </motion.div>
          <div>
            <p className="font-display text-xl leading-tight">
              🔥 {streak} {streak === 1 ? "SEMANA SEGUIDA" : "SEMANAS SEGUIDAS"}
            </p>
            <p className="text-xs text-white/50">
              {streak === 0
                ? "Completá esta semana para empezar tu racha."
                : `Récord personal: ${profile?.longest_streak ?? streak} semanas.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-white/40">
          <span>Progreso hacia la semana {streak + 1}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-cyan"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
