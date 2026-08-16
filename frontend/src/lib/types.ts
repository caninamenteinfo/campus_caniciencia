export interface WeeklyCycle {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  status: "planning" | "recording" | "designing" | "scheduled" | "live" | "closed";
  flow_step: number;
  flow_started_at: string | null;
  flow_completed_at: string | null;
}

export interface Proposal {
  id: string;
  cycle_id: string;
  order_index: number;
  category: string;
  hook: string;
  description: string;
  duration_seconds: number;
  canva_direction: string | null;
  tiktok_adapt: boolean;
  potential: "Alto" | "Muy Alto" | "Máximo";
  recommended_day: string | null;
  script: string | null;
  status: "pending" | "accepted" | "rejected";
}

export interface Reel {
  id: string;
  cycle_id: string;
  proposal_id: string | null;
  order_index: number;
  title: string;
  script: string | null;
  category: string | null;
  recorded: boolean;
  caption_short: string | null;
  caption_long: string | null;
  hashtags: string[];
  canva_design_id: string | null;
  canva_export_url: string | null;
  status: "pending" | "recorded" | "captioned" | "designed" | "scheduled" | "published";
  published_at: string | null;
}

export interface WeeklyMetric {
  id: string;
  reel_id: string;
  views: number;
  shares: number;
  comments: number;
  saves: number;
  recorded_at: string;
}

export interface Profile {
  streak_count: number;
  longest_streak: number;
  badges: import("./badges").BadgeId[];
}

export interface CycleSummary {
  cycle: WeeklyCycle;
  reels: Pick<Reel, "id" | "title" | "status">[];
  totals: { views: number; shares: number; comments: number; saves: number };
  count: number;
  profile: Profile | null;
}

export interface BadgeUnlockResult {
  streak: number;
  longestStreak: number;
  badges: import("./badges").BadgeId[];
  newlyUnlocked: import("./badges").BadgeId[];
}

export interface DriveFileRef {
  fileId: string;
  name: string;
  role: string;
}

export const FLOW_STEPS = [
  { step: 1, path: "/grabacion", label: "Grabación", window: "08:30–09:30" },
  { step: 2, path: "/captions", label: "Captions", window: "09:30–10:30" },
  { step: 3, path: "/diseno", label: "Diseño Canva", window: "10:30–12:00" },
  { step: 4, path: "/programar", label: "Programación", window: "12:00–12:30" },
] as const;
