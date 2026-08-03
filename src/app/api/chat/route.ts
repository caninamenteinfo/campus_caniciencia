import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/session";
import { getCourseById } from "@/lib/courses";
import { askStudyAssistant } from "@/lib/claude";
import type { ChatMessage } from "@/types";

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Sesión no válida. Vuelve a entrar con tu código de acceso." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const moduleId = Number(body?.moduleId);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  if (!Number.isInteger(moduleId) || messages.length === 0) {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const course = await getCourseById(session.courseId);
  const activeModule = course?.modules.find((m) => m.id === moduleId);
  if (!course || !activeModule) {
    return NextResponse.json({ error: "Módulo no encontrado." }, { status: 404 });
  }

  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

  try {
    const reply = await askStudyAssistant(history, activeModule.content);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json({ error: "Error al conectar con el asistente." }, { status: 502 });
  }
}
