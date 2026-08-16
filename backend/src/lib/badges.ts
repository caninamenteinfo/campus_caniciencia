export type BadgeId =
  | "productor_rapido"
  | "viralidad"
  | "neurobiologia_master"
  | "comentarista"
  | "streak_4"
  | "director"
  | "visionario"
  | "leyenda";

export interface BadgeDef {
  id: BadgeId;
  label: string;
  description: string;
}

/** Los 7 badges "normales" — Leyenda se calcula aparte al desbloquear todos estos. */
export const BADGES: BadgeDef[] = [
  { id: "productor_rapido", label: "⚡ Productor Rápido", description: "Completaste el flujo de producción en menos de 4h 45min" },
  { id: "viralidad", label: "🚀 Viralidad", description: "Un reel superó las 3,000 views" },
  { id: "neurobiologia_master", label: "🧠 Neurobiología Master", description: "10 reels de la categoría Neurobiología" },
  { id: "comentarista", label: "💬 Comentarista", description: "Un reel superó los 50 comentarios" },
  { id: "streak_4", label: "🔥 Streak 4 Semanas", description: "4 semanas seguidas completando el flujo" },
  { id: "director", label: "🎬 Director", description: "10 reels producidos en total" },
  { id: "visionario", label: "🔮 Visionario", description: "3 reels de la categoría Transformacional" },
];

export const LEYENDA_BADGE: BadgeDef = {
  id: "leyenda",
  label: "👑 Leyenda",
  description: "Desbloqueaste todos los badges de CaninaMente",
};

export const ALL_BADGES: BadgeDef[] = [...BADGES, LEYENDA_BADGE];

export const THRESHOLDS = {
  FAST_COMPLETION_MS: (4 * 60 + 45) * 60 * 1000, // 4h 45min
  VIRAL_VIEWS: 3000,
  COMMENTS: 50,
  NEUROBIOLOGIA_REELS: 10,
  DIRECTOR_REELS: 10,
  VISIONARIO_REELS: 3,
  STREAK_WEEKS: 4,
};

/** Normaliza texto libre (categorías generadas por Claude) para matchear sin tildes/mayúsculas. */
export function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
