import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getEditionByCode,
  countEditionStudents,
  findEditionStudent,
  registerEditionStudent,
} from "@/lib/courses";
import { normalizeAccessCode } from "@/lib/access-code";
import { signStudentSession, STUDENT_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const rawCode = typeof body?.code === "string" ? body.code : "";

  if (!name || !rawCode) {
    return NextResponse.json({ error: "Introduce tu nombre y el código de acceso." }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: "El nombre es demasiado largo." }, { status: 400 });
  }

  const code = normalizeAccessCode(rawCode);
  const edition = await getEditionByCode(code);
  if (!edition) {
    return NextResponse.json({ error: "El código de acceso no es válido." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (today < edition.start_date) {
    return NextResponse.json(
      { error: `Esta edición del curso todavía no ha empezado (comienza el ${edition.start_date}).` },
      { status: 403 }
    );
  }
  if (today > edition.end_date) {
    return NextResponse.json(
      { error: "Esta edición del curso ya ha finalizado y el acceso está cerrado." },
      { status: 403 }
    );
  }

  const identifier = name.toLowerCase();
  const existing = await findEditionStudent(edition.id, identifier);
  if (!existing) {
    const count = await countEditionStudents(edition.id);
    if (count >= edition.max_students) {
      return NextResponse.json(
        {
          error:
            "Se ha alcanzado el número máximo de alumnos para esta edición. Contacta con tu instructor.",
        },
        { status: 403 }
      );
    }
    await registerEditionStudent(edition.id, identifier, name);
  }

  const expiresAt = new Date(`${edition.end_date}T23:59:59Z`);
  const token = await signStudentSession(
    { editionId: edition.id, courseId: edition.course_id, name },
    expiresAt
  );

  const cookieStore = await cookies();
  cookieStore.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return NextResponse.json({ ok: true });
}
