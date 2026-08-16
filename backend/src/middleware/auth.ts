import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin, supabaseForUser } from "../lib/supabase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      accessToken?: string;
      db?: ReturnType<typeof supabaseForUser>;
    }
  }
}

/**
 * Espera un header `Authorization: Bearer <supabase access token>`.
 * El frontend obtiene ese token de `supabase.auth.getSession()` tras el
 * login con Google. Verificamos el token contra Supabase y adjuntamos un
 * cliente scoped-to-user (respeta RLS) al request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Falta el token de sesión." });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }

  req.userId = data.user.id;
  req.accessToken = token;
  req.db = supabaseForUser(token);
  next();
}
