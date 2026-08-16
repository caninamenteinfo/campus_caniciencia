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
  emoji: string;
  label: string;
  description: string;
}

export const BADGE_CATALOG: Record<BadgeId, BadgeDef> = {
  productor_rapido: {
    id: "productor_rapido",
    emoji: "⚡",
    label: "Productor Rápido",
    description: "Completaste el flujo de producción en menos de 4h 45min",
  },
  viralidad: {
    id: "viralidad",
    emoji: "🚀",
    label: "Viralidad",
    description: "Un reel superó las 3,000 views",
  },
  neurobiologia_master: {
    id: "neurobiologia_master",
    emoji: "🧠",
    label: "Neurobiología Master",
    description: "10 reels de la categoría Neurobiología",
  },
  comentarista: {
    id: "comentarista",
    emoji: "💬",
    label: "Comentarista",
    description: "Un reel superó los 50 comentarios",
  },
  streak_4: {
    id: "streak_4",
    emoji: "🔥",
    label: "Streak 4 Semanas",
    description: "4 semanas seguidas completando el flujo",
  },
  director: {
    id: "director",
    emoji: "🎬",
    label: "Director",
    description: "10 reels producidos en total",
  },
  visionario: {
    id: "visionario",
    emoji: "🔮",
    label: "Visionario",
    description: "3 reels de la categoría Transformacional",
  },
  leyenda: {
    id: "leyenda",
    emoji: "👑",
    label: "Leyenda",
    description: "Desbloqueaste todos los badges de CaninaMente",
  },
};

export const ALL_BADGE_IDS: BadgeId[] = [
  "productor_rapido",
  "viralidad",
  "neurobiologia_master",
  "comentarista",
  "streak_4",
  "director",
  "visionario",
  "leyenda",
];
