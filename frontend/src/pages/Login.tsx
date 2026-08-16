import { motion } from "framer-motion";
import { signInWithGoogle } from "../lib/supabase";

export function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <motion.img
        src="/logo.svg"
        alt="CaninaMente"
        className="h-24 w-24 rounded-3xl shadow-glow-yellow"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120 }}
      />
      <div className="space-y-3">
        <h1 className="font-display text-3xl md:text-4xl">
          <span className="text-brand-yellow">Canina</span>
          <span className="text-brand-orange">Mente</span>
        </h1>
        <p className="max-w-sm text-white/60">
          El cerebro operacional de tu contenido semanal: propuestas, grabación, diseño y análisis, todo en un solo lugar.
        </p>
      </div>

      <motion.button
        onClick={() => signInWithGoogle()}
        whileTap={{ scale: 0.96 }}
        className="btn-primary animate-pulseGlow"
      >
        <GoogleIcon />
        Entrar con Google
      </motion.button>

      <p className="max-w-xs text-xs text-white/40">
        Necesitamos permiso de Google Drive y Calendar para leer tu documento MAESTRO de estrategia y
        gestionar las alarmas semanales.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#0a1428"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
