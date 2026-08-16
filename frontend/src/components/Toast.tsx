import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Sparkles, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "../store/toast";

const STYLES: Record<ToastVariant, { icon: typeof Sparkles; classes: string }> = {
  info: { icon: Sparkles, classes: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan" },
  warning: { icon: AlertTriangle, classes: "border-brand-yellow/40 bg-brand-yellow/10 text-brand-yellow" },
  success: { icon: CheckCircle2, classes: "border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan" },
};

/** Pila de mensajes contextuales/motivacionales, fija arriba a la derecha. */
export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 md:items-end md:right-4 md:left-auto">
      <AnimatePresence>
        {toasts.map((t) => {
          const { icon: Icon, classes } = STYLES[t.variant];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto flex max-w-sm items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${classes}`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-white/90">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="shrink-0 text-white/40 hover:text-white/80">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
