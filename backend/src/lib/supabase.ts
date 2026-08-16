import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/** Cliente con service_role — bypassa RLS, solo se usa server-side. */
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Cliente "en nombre del usuario" — respeta RLS usando el JWT del request. */
export function supabaseForUser(accessToken: string) {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
