import "server-only";
import type { ChatMessage, QuizQuestion } from "@/types";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

async function callClaude(
  messages: { role: string; content: string }[],
  system: string,
  maxTokens = 1000
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY no está configurada en el servidor.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de la API de Claude (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");

  if (!text) {
    throw new Error("Respuesta vacía del modelo.");
  }
  return text;
}

/** Responde una pregunta del alumno usando ÚNICAMENTE el material del módulo activo. */
export async function askStudyAssistant(
  history: ChatMessage[],
  moduleContent: string
): Promise<string> {
  const system = `Eres un tutor de apoyo para alumnos de un diplomado profesional de adiestramiento canino. Responde ÚNICAMENTE basándote en el siguiente material del módulo actual. Si la pregunta no se puede responder con este material, dilo claramente y sugiere que lo consulte con el instructor, no inventes información externa. Responde en español, de forma clara y cercana, como a un profesional que está estudiando.\n\nMATERIAL DEL MÓDULO:\n${moduleContent}`;

  return callClaude(history, system);
}

/** Genera un cuestionario de 5 preguntas tipo test basado ÚNICAMENTE en el módulo activo. */
export async function generateQuiz(moduleContent: string): Promise<QuizQuestion[]> {
  const system = `Generas cuestionarios de autoevaluación para un diplomado profesional de adiestramiento canino. Basándote ÚNICAMENTE en el material proporcionado, genera 5 preguntas tipo test de opción múltiple (4 opciones cada una, solo una correcta), variadas y que cubran distintas partes del material. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, con este formato exacto:\n{"questions":[{"question":"texto","options":["a","b","c","d"],"correctIndex":0,"explanation":"breve explicación de por qué es correcta"}]}\n\nMATERIAL:\n${moduleContent}`;

  const reply = await callClaude(
    [{ role: "user", content: "Genera el test." }],
    system,
    2000
  );

  let clean = reply.replace(/```json|```/g, "").trim();
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(clean);
  if (!parsed.questions || !parsed.questions.length) {
    throw new Error("Sin preguntas en la respuesta.");
  }
  return parsed.questions as QuizQuestion[];
}
