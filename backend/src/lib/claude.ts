import Anthropic from "@anthropic-ai/sdk";
import { env, features } from "./env.js";

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  if (!features.claude) {
    throw new Error("ANTHROPIC_API_KEY no está configurada — no se pueden generar propuestas con IA.");
  }
  client ??= new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

/** Pide un bloque JSON a Claude y lo parsea, tolerando texto alrededor. */
async function askForJson<T>(system: string, prompt: string): Promise<T> {
  const res = await anthropic().messages.create({
    model: env.anthropicModel,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Claude no devolvió JSON válido:\n" + text);
  return JSON.parse(match[0]) as T;
}

export interface GeneratedProposal {
  category: string;
  hook: string;
  description: string;
  duration_seconds: number;
  canva_direction: string;
  tiktok_adapt: boolean;
  potential: "Alto" | "Muy Alto" | "Máximo";
  recommended_day: string;
  script: string;
}

const SYSTEM_STRATEGIST = `Sos el estratega de contenido de CaninaMente, una marca de formación
canina basada en neurobiología y educación transformacional, con audiencia dual
(dueños de perros + educadores caninos). Tu única fuente de verdad es el
documento MAESTRO de estrategia que te pasa el usuario: tendencias, categorías
de contenido, tono, y principios de diseño. Nunca inventes datos de negocio
que no estén en ese documento. Tono narrativo, cercano, nunca prepotente ni
robótico. Proponés, no imponés.`;

export async function generateWeeklyProposals(params: {
  masterDoc: string;
  toneGuide?: string;
  recentPerformance?: string;
}): Promise<GeneratedProposal[]> {
  const prompt = `DOCUMENTO MAESTRO DE ESTRATEGIA:\n"""${params.masterDoc.slice(0, 15000)}"""\n\n${
    params.toneGuide ? `GUÍA DE TONO:\n"""${params.toneGuide.slice(0, 4000)}"""\n\n` : ""
  }${
    params.recentPerformance
      ? `RENDIMIENTO DE LAS ÚLTIMAS SEMANAS:\n"""${params.recentPerformance.slice(0, 3000)}"""\n\n`
      : ""
  }Generá exactamente 5 propuestas de reels para la próxima semana, basadas
estrictamente en el documento MAESTRO de arriba (sus categorías, tendencias y
principios). Si hay datos de rendimiento reciente, usalos para priorizar qué
funcionó y evitar repetir lo que no funcionó.

Devolvé SOLO un array JSON de 5 objetos con esta forma exacta:
[{
  "category": "string (una de las categorías del documento MAESTRO)",
  "hook": "string, máximo 2 líneas cortas para texto sobre imagen",
  "description": "string, 1-2 párrafos explicando el ángulo del reel",
  "duration_seconds": number,
  "canva_direction": "string, dirección visual para el diseño en Canva",
  "tiktok_adapt": boolean,
  "potential": "Alto" | "Muy Alto" | "Máximo",
  "recommended_day": "string, día de la semana recomendado para publicar",
  "script": "string, guión narrativo completo listo para grabar, fluido, sin marcas de pausa"
}]`;

  return askForJson<GeneratedProposal[]>(SYSTEM_STRATEGIST, prompt);
}

export interface CaptionSuggestion {
  caption_short: string;
  caption_long: string;
  hashtags: string[];
}

export async function generateCaptionSuggestions(params: {
  title: string;
  script: string;
  toneGuide?: string;
}): Promise<CaptionSuggestion> {
  const prompt = `Reel: "${params.title}"\nGuión:\n"""${params.script}"""\n\n${
    params.toneGuide ? `GUÍA DE TONO:\n"""${params.toneGuide.slice(0, 3000)}"""\n\n` : ""
  }Escribí:
1. Un copy corto (máx 2 líneas) para superponer en la imagen.
2. Un caption largo para Instagram, en el tono de la marca.
3. Entre 8 y 12 hashtags relevantes, incluyendo #NeurobiologiaCanina #FormacionCanina #CaninaMente.

Devolvé SOLO JSON: {"caption_short": string, "caption_long": string, "hashtags": string[]}`;

  return askForJson<CaptionSuggestion>(SYSTEM_STRATEGIST, prompt);
}

export interface WeeklyInsights {
  what_worked: string;
  what_didnt: string;
  recommendation: string;
}

export async function generateWeeklyInsights(params: {
  metricsSummary: string;
  masterDoc?: string;
}): Promise<WeeklyInsights> {
  const prompt = `Resultados de la semana (por reel: tema, categoría, views, shares,
comentarios, saves):\n"""${params.metricsSummary}"""\n\n${
    params.masterDoc ? `Contexto estratégico (documento MAESTRO, resumen):\n"""${params.masterDoc.slice(0, 6000)}"""\n\n` : ""
  }Analizá el patrón de resultados y devolvé SOLO JSON:
{"what_worked": string, "what_didnt": string, "recommendation": string (sugerencia concreta y accionable para la próxima semana)}`;

  return askForJson<WeeklyInsights>(SYSTEM_STRATEGIST, prompt);
}
