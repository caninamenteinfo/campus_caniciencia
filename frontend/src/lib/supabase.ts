import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.error(
    "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en frontend/.env — copiá frontend/.env.example."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");

// Scopes de Google necesarios para leer/escribir en Drive y crear eventos
// de Calendar en nombre del usuario (además de openid/email/profile).
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: GOOGLE_SCOPES,
      // access_type + prompt=consent son necesarios para recibir un
      // provider_refresh_token la primera vez que el usuario autoriza.
      queryParams: { access_type: "offline", prompt: "consent" },
      redirectTo: window.location.origin,
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
