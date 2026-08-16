import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { Zap } from "lucide-react";

const MESSAGES: Record<string, string[]> = {
  "/": [
    "5 propuestas te esperan. Elegí las que más te den ganas de grabar hoy.",
    "Cada semana que completás construye la próxima. Vamos por otra racha.",
    "No hace falta perfección, hace falta constancia. Arrancá.",
  ],
  "/grabacion": [
    "Respirá, leé el guión una vez más y grabá natural. Si te trabás, parás y repetís — nadie lo va a ver.",
    "Tu voz importa más que la edición. Grabá como si le hablaras a una sola persona.",
  ],
  "/captions": [
    "Un buen hook detiene el scroll en el primer segundo. Escribilo como si fuera lo único que se lee.",
    "Los captions se guardan solos — enfocate en escribir, no en apretar botones.",
  ],
  "/diseno": [
    "El diseño es el envoltorio, el guión es el regalo. Ya hiciste lo difícil.",
    "Canva hace el trabajo pesado — vos solo revisá que quede fiel a la Guía de Diseño.",
  ],
  "/programar": [
    "Ya casi. Programar hoy es tiempo libre el resto de la semana.",
    "Últimos minutos del flujo de 4 horas. Terminalo y descansá tranquilo.",
  ],
  "/analisis": [
    "Los números no juzgan, informan. Mirá qué funcionó y usalo la próxima semana.",
    "Cerrar la semana es tan importante como haberla producido. Sumá tu racha.",
  ],
};

export function MotivationBanner() {
  const { pathname } = useLocation();
  const message = useMemo(() => {
    const pool = MESSAGES[pathname] ?? MESSAGES["/"];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [pathname]);

  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-brand-yellow/20 bg-brand-yellow/[0.06] px-4 py-3 text-sm text-brand-yellow/90">
      <Zap size={16} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
