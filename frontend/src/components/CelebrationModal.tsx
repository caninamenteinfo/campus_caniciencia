import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { BADGE_CATALOG, type BadgeId } from "../lib/badges";
import { celebrate } from "../lib/celebrate";

interface Stats {
  views: number;
  shares: number;
  comments: number;
  saves: number;
}

export function CelebrationModal({
  open,
  onClose,
  streak,
  stats,
  newlyUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  streak: number;
  stats: Stats;
  newlyUnlocked: BadgeId[];
}) {
  useEffect(() => {
    if (open) celebrate("week");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-base/90 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            className="card relative w-full max-w-lg overflow-y-auto p-6 text-center"
            style={{ maxHeight: "90vh" }}
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-white/40 hover:text-white">
              <X size={18} />
            </button>

            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="text-5xl"
            >
              🏁
            </motion.p>
            <h2 className="mt-3 font-display text-2xl">¡Semana cerrada!</h2>
            <p className="mt-1 text-sm text-white/60">
              Sumaste racha de{" "}
              <span className="font-display text-brand-orange">
                🔥 {streak} {streak === 1 ? "semana" : "semanas"}
              </span>
              .
            </p>

            <div className="mt-5 grid grid-cols-4 gap-2">
              <Stat label="Views" value={stats.views} />
              <Stat label="Shares" value={stats.shares} />
              <Stat label="Coment." value={stats.comments} />
              <Stat label="Saves" value={stats.saves} />
            </div>

            {newlyUnlocked.length > 0 && (
              <div className="mt-6 text-left">
                <p className="mb-2 text-center font-display text-sm text-brand-yellow">
                  🎉 Nuevos badges desbloqueados
                </p>
                <div className="space-y-2">
                  {newlyUnlocked.map((id, i) => {
                    const badge = BADGE_CATALOG[id];
                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.12 }}
                        className="flex items-center gap-3 rounded-xl border border-brand-yellow/30 bg-brand-yellow/[0.06] p-3"
                      >
                        <span className="text-2xl">{badge.emoji}</span>
                        <div>
                          <p className="font-display text-sm">{badge.label}</p>
                          <p className="text-xs text-white/50">{badge.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={onClose} className="btn-primary mt-6 w-full">
              Nos vemos el lunes 🐾
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-2.5">
      <p className="font-display text-lg text-brand-yellow">{value.toLocaleString("es-AR")}</p>
      <p className="text-[10px] text-white/50">{label}</p>
    </div>
  );
}
