import { motion } from "framer-motion";
import { ALL_BADGE_IDS, BADGE_CATALOG, type BadgeId } from "../lib/badges";

export function BadgeGrid({ unlocked }: { unlocked: BadgeId[] }) {
  const unlockedSet = new Set(unlocked);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {ALL_BADGE_IDS.map((id, i) => {
        const badge = BADGE_CATALOG[id];
        const isUnlocked = unlockedSet.has(id);
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
              isUnlocked
                ? "border-brand-yellow/40 bg-brand-yellow/[0.06]"
                : "border-white/10 bg-white/[0.02] opacity-45 grayscale"
            }`}
          >
            <span className="text-2xl">{badge.emoji}</span>
            <p className="font-display text-[11px] leading-tight">{badge.label}</p>
            <p className="text-[10px] text-white/40">{badge.description}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
