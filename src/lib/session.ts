import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StudentSessionPayload } from "@/types";

export const STUDENT_COOKIE = "cm_session";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET no está configurado (o es demasiado corto) en las variables de entorno."
    );
  }
  return new TextEncoder().encode(secret);
}

/** Firma un JWT de sesión de alumno que caduca en la fecha de fin de la edición. */
export async function signStudentSession(
  payload: StudentSessionPayload,
  expiresAt: Date
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
}

export async function verifyStudentSession(
  token: string
): Promise<StudentSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.editionId === "string" &&
      typeof payload.courseId === "string" &&
      typeof payload.studentId === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        editionId: payload.editionId,
        courseId: payload.courseId,
        studentId: payload.studentId,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Lee y valida la sesión de alumno desde las cookies de la petición actual. */
export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  return verifyStudentSession(token);
}
