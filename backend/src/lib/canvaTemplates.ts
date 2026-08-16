import { env } from "./env.js";
import { normalize } from "./badges.js";

export type TemplateKey = "neurobiologia" | "transformacional" | "desmitificacion" | "carrusel" | "evento";

export interface TemplateDef {
  key: TemplateKey;
  label: string;
  style: string;
  /** Substrings (ya normalizados, sin tildes) que matchean la categoría libre generada por Claude. */
  matches: string[];
}

export const TEMPLATE_CATALOG: TemplateDef[] = [
  {
    key: "neurobiologia",
    label: "EDUCATIVO NEUROBIOLÓGICO",
    style: "Hook amarillo + imagen central",
    matches: ["neurobiolog"],
  },
  {
    key: "transformacional",
    label: "ANTES/DESPUÉS",
    style: "Split screen naranja/cyan",
    matches: ["transformacional"],
  },
  {
    key: "desmitificacion",
    label: "MITO VS REALIDAD",
    style: "❌ vs ✅",
    matches: ["desmitificacion", "mito"],
  },
  {
    key: "carrusel",
    label: "EDUCATIVO",
    style: "6 slides, números grandes",
    matches: ["carrusel"],
  },
  {
    key: "evento",
    label: "MASTERCLASS",
    style: "Header amarillo + fecha/hora",
    matches: ["evento", "masterclass"],
  },
];

/** Matchea la categoría libre (texto generado por Claude) contra el catálogo de 5 templates. */
export function resolveTemplateDef(category: string | null | undefined): TemplateDef | null {
  const normalized = normalize(category);
  if (!normalized) return null;
  return TEMPLATE_CATALOG.find((t) => t.matches.some((m) => normalized.includes(m))) ?? null;
}

/** Devuelve el brand_template_id de Canva a usar para una categoría, con fallback al default. */
export function resolveTemplateId(category: string | null | undefined): string | undefined {
  const def = resolveTemplateDef(category);
  const specific = def ? env.canvaTemplates[def.key] : undefined;
  return specific ?? env.canvaBrandTemplateId;
}
