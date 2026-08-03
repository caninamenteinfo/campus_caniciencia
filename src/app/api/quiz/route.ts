import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/session";
import { getCourseById } from "@/lib/courses";
import { generateQuiz } from "@/lib/claude";

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida. Vuelve a entrar con tu código de acceso." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const moduleId = Number(body?.moduleId);
  if (!Number.isInteger(moduleId)) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const course = await getCourseById(session.courseId);
  const activeModule = course?.modules.find((m) => m.id === moduleId);
  if (!course || !activeModule) {
    return NextResponse.json({ error: "Módulo no encontrado." }, { status: 404 });
  }

  try {
    const questions = await generateQuiz(activeModule.content);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("quiz error", err);
    return NextResponse.json({ error: "No se ha podido generar el test." }, { status: 502 });
  }
}
