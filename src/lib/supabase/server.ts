import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente de Supabase Auth ligado a las cookies de la petición actual.
 * Se usa únicamente para autenticar al instructor (login/logout/sesión),
 * nunca para leer/escribir datos de curso (eso pasa por supabaseAdmin()).
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Se llama desde un Server Component sin permiso de escritura;
          // el middleware/route handler correspondiente ya refresca la sesión.
        }
      },
    },
  });
}
