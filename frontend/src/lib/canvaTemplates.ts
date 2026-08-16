export interface TemplateDef {
  key: string;
  label: string;
  style: string;
  matches: string[];
}

/** Espejo de backend/src/lib/canvaTemplates.ts — solo para mostrar el mapeo en la UI. */
export const TEMPLATE_CATALOG: TemplateDef[] = [
  { key: "neurobiologia", label: "EDUCATIVO NEUROBIOLÓGICO", style: "Hook amarillo + imagen central", matches: ["neurobiolog"] },
  { key: "transformacional", label: "ANTES/DESPUÉS", style: "Split screen naranja/cyan", matches: ["transformacional"] },
  { key: "desmitificacion", label: "MITO VS REALIDAD", style: "❌ vs ✅", matches: ["desmitificacion", "mito"] },
  { key: "carrusel", label: "EDUCATIVO", style: "6 slides, números grandes", matches: ["carrusel"] },
  { key: "evento", label: "MASTERCLASS", style: "Header amarillo + fecha/hora", matches: ["evento", "masterclass"] },
];

function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function resolveTemplateDef(category: string | null | undefined): TemplateDef | null {
  const normalized = normalize(category);
  if (!normalized) return null;
  return TEMPLATE_CATALOG.find((t) => t.matches.some((m) => normalized.includes(m))) ?? null;
}
