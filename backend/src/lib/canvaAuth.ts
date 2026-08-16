import { supabaseAdmin } from "./supabase.js";
import { encryptToken, decryptToken } from "./crypto.js";
import { refreshCanvaToken } from "./canva.js";

export async function isCanvaConnected(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("integration_tokens")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "canva")
    .maybeSingle();
  return Boolean(data);
}

/** Devuelve un access token de Canva válido, refrescándolo si está por vencer. */
export async function getValidCanvaAccessToken(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("integration_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "canva")
    .single();

  if (!data) throw new Error("Canva no está conectado. Andá a Ajustes y conectá tu cuenta.");

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now() + 60_000) {
    const refreshed = await refreshCanvaToken(decryptToken(data.refresh_token));
    await supabaseAdmin
      .from("integration_tokens")
      .update({
        access_token: encryptToken(refreshed.access_token),
        refresh_token: encryptToken(refreshed.refresh_token),
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "canva");
    return refreshed.access_token;
  }

  return decryptToken(data.access_token);
}
