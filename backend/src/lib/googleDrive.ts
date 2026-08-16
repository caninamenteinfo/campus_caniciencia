import { google } from "googleapis";
import { env, features } from "./env.js";

/**
 * Devuelve un cliente `docs`+`drive` autenticado. Prioridad:
 * 1) Token de Google del usuario logueado (provider_token de Supabase Auth,
 *    reenviado por el frontend en el header `X-Google-Token`).
 * 2) Service account (si está configurada) — útil para lecturas en
 *    background (ej. el cron semanal) sin sesión de usuario activa. El
 *    documento debe estar compartido con el email de la service account.
 */
function authFor(userGoogleToken?: string) {
  if (userGoogleToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: userGoogleToken });
    return auth;
  }

  if (features.driveServiceAccount) {
    return new google.auth.JWT({
      email: env.googleServiceAccountEmail,
      key: env.googleServiceAccountPrivateKey,
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents.readonly",
      ],
    });
  }

  throw new Error(
    "No hay credenciales de Google disponibles (ni token de usuario ni service account)."
  );
}

/** Extrae el texto plano de un Google Doc por fileId. */
export async function readGoogleDocText(fileId: string, userGoogleToken?: string): Promise<string> {
  const auth = authFor(userGoogleToken);
  const docs = google.docs({ version: "v1", auth });
  const { data } = await docs.documents.get({ documentId: fileId });

  const paragraphs: string[] = [];
  for (const el of data.body?.content ?? []) {
    const elements = el.paragraph?.elements ?? [];
    const line = elements.map((e) => e.textRun?.content ?? "").join("");
    if (line.trim()) paragraphs.push(line.trimEnd());
  }
  return paragraphs.join("\n");
}

export interface DriveFileRef {
  fileId: string;
  name: string;
  role: string;
}

/** Documentos maestros referenciados en la estrategia de CaninaMente. */
export const MASTER_DOCS: DriveFileRef[] = [
  { fileId: env.masterDocFileId ?? "", name: "MAESTRO: Tendencias y Temas Virales 2026", role: "master" },
  { fileId: "1sY149flkbNZCmhTq5gvfUV3Vu_2nG3tFAtDhN6mXCLg", name: "Dashboard Maestro Semanal", role: "dashboard_template" },
  { fileId: "1o6fpoe0wruZklT6SN0tWfq0dwyIUF2Q0bFt93tkZV8s", name: "Guiones a Cámara — Ansiedad por Separación", role: "script_example" },
  { fileId: "1CUZ4zw1Kd-bU46S64yBL3dc_BIoYVI9gWHoGbF0KtbE", name: "Guía de Diseño Canva — Sistema Disruptivo", role: "design_guide" },
  { fileId: "1NGwWfCwbxr4Unj91ZB0kuJ1JV4gvV23Hee5nREtI6DI", name: "Guía de Tono", role: "tone_guide" },
];

/** Crea un Google Doc nuevo con el contenido dado (propuestas semanales, feedback, etc). */
export async function createGoogleDoc(
  title: string,
  bodyText: string,
  userGoogleToken?: string
): Promise<{ documentId: string; url: string }> {
  const auth = authFor(userGoogleToken);
  const docs = google.docs({ version: "v1", auth });

  const { data: created } = await docs.documents.create({ requestBody: { title } });
  const documentId = created.documentId!;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        { insertText: { location: { index: 1 }, text: bodyText } },
      ],
    },
  });

  return { documentId, url: `https://docs.google.com/document/d/${documentId}/edit` };
}
