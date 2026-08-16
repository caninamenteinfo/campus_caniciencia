import axios from "axios";
import { randomBytes, createHash } from "node:crypto";
import { env, features } from "./env.js";

const AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
const API_BASE = "https://api.canva.com/rest/v1";

export const CANVA_SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "brandtemplate:content:read",
  "brandtemplate:meta:read",
  "asset:read",
  "asset:write",
  "profile:read",
].join(" ");

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkcePair() {
  const verifier = base64url(randomBytes(64));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildCanvaAuthUrl(state: string, codeChallenge: string): string {
  if (!features.canva) throw new Error("Canva no está configurado (CANVA_CLIENT_ID / SECRET).");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.canvaClientId!,
    redirect_uri: env.canvaRedirectUri,
    scope: CANVA_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

interface CanvaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

function basicAuthHeader(): string {
  return "Basic " + Buffer.from(`${env.canvaClientId}:${env.canvaClientSecret}`).toString("base64");
}

export async function exchangeCanvaCode(code: string, verifier: string): Promise<CanvaTokenResponse> {
  const { data } = await axios.post(
    `${API_BASE}/oauth/token`,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: env.canvaRedirectUri,
    }),
    { headers: { Authorization: basicAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data;
}

export async function refreshCanvaToken(refreshToken: string): Promise<CanvaTokenResponse> {
  const { data } = await axios.post(
    `${API_BASE}/oauth/token`,
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    { headers: { Authorization: basicAuthHeader(), "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data;
}

function authed(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

async function poll<T extends { status: string }>(
  fetchStatus: () => Promise<T>,
  { intervalMs = 1500, timeoutMs = 60000 } = {}
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const result = await fetchStatus();
    if (result.status !== "in_progress") return result;
    if (Date.now() - start > timeoutMs) throw new Error("Timeout esperando a Canva.");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Autocompleta la brand template configurada (Guía de Diseño Canva) con los
 * textos del reel y devuelve el diseño resultante listo para editar/exportar.
 */
export async function createDesignFromReel(
  accessToken: string,
  brandTemplateId: string,
  fields: Record<string, { type: "text"; text: string }>
): Promise<{ designId: string; editUrl: string; viewUrl: string }> {
  const { data: job } = await axios.post(
    `${API_BASE}/autofills`,
    { brand_template_id: brandTemplateId, title: fields.title?.text ?? "Reel CaninaMente", data: fields },
    { headers: authed(accessToken) }
  );

  const result = await poll(async () => {
    const { data } = await axios.get(`${API_BASE}/autofills/${job.job.id}`, { headers: authed(accessToken) });
    return data.job;
  });

  if (result.status === "failed") {
    throw new Error(`Canva autofill falló: ${result.error?.message ?? "desconocido"}`);
  }

  return {
    designId: result.result.design.id,
    editUrl: result.result.design.urls.edit_url,
    viewUrl: result.result.design.urls.view_url,
  };
}

/** Exporta un diseño de Canva a MP4/PNG y devuelve la URL de descarga. */
export async function exportCanvaDesign(
  accessToken: string,
  designId: string,
  format: "mp4" | "png" = "mp4"
): Promise<string[]> {
  const { data: job } = await axios.post(
    `${API_BASE}/exports`,
    { design_id: designId, format: { type: format } },
    { headers: authed(accessToken) }
  );

  const result = await poll(async () => {
    const { data } = await axios.get(`${API_BASE}/exports/${job.job.id}`, { headers: authed(accessToken) });
    return data.job;
  });

  if (result.status === "failed") {
    throw new Error(`Canva export falló: ${result.error?.message ?? "desconocido"}`);
  }

  return result.urls as string[];
}
