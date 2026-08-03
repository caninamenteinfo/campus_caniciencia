import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key: solo se importa desde código de servidor
 * (Route Handlers, Server Components, Server Actions). Nunca debe llegar al
 * bundle del navegador — "server-only" lo garantiza en build.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
