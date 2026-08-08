import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStudentByAccessCode, touchStudentLogin } from "@/lib/courses";
import { normalizeAccessCode } from "@/lib/access-code";
import { signStudentSession, STUDENT_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const rawCode = typeof body?.code === "string" ? body.code : "";

  if (!rawCode) {
    return NextResponse.json({ error: "Introduce tu código de acceso." }, { status: 400 });
  }

  const code = normalizeAccessCode(rawCode);
  const student = await getStudentByAccessCode(code);
  if (!student) {
    return NextResponse.json({ error: "El código de acceso no es válido." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (today < student.startDate) {
    return NextResponse.json(
      { error: `Esta sesión del curso todavía no ha empezado (comienza el ${student.startDate}).` },
      { status: 403 }
    );
  }
  if (today > student.endDate) {
    return NextResponse.json(
      { error: "Esta sesión del curso ya ha finalizado y el acceso está cerrado." },
      { status: 403 }
    );
  }

  await touchStudentLogin(student.studentId);

  const expiresAt = new Date(`${student.endDate}T23:59:59Z`);
  const token = await signStudentSession(
    {
      editionId: student.editionId,
      courseId: student.courseId,
      studentId: student.studentId,
      name: student.displayName,
    },
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
