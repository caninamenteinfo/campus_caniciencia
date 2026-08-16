import { supabase } from "./supabase";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000";

export class ApiError extends Error {
  constructor(message: string, public status: number, public detail?: string) {
    super(message);
  }
}

async function authedHeaders(base?: HeadersInit): Promise<Headers> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const headers = new Headers(base);
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  // provider_token: access token de Google emitido en el último login OAuth.
  // Se re-obtiene volviendo a iniciar sesión con Google si venció (ver Ajustes).
  if (session?.provider_token) headers.set("X-Google-Token", session.provider_token);
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authedHeaders(init?.headers);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body.error ?? `Error ${res.status}`, res.status, body.detail);
  }
  return body as T;
}

/** Descarga un recurso binario (ej. el video de un reel) con la misma autenticación que `request`. */
async function requestBlob(path: string): Promise<Blob> {
  const headers = await authedHeaders();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Error ${res.status}`, res.status, body.detail);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
  getBlob: requestBlob,
};
