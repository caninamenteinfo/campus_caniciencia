import { NextResponse } from "next/server";
import { getInstructorUser } from "@/lib/auth";
import { getOrCreateCourse, listEditions, createEdition } from "@/lib/courses";

export async function GET() {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const course = await getOrCreateCourse();
  const editions = await listEditions(course.id);
  return NextResponse.json({ editions });
}

export async function POST(req: Request) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const startDate = typeof body?.startDate === "string" ? body.startDate : "";
  const endDate = typeof body?.endDate === "string" ? body.endDate : "";
  const maxStudents = Number(body?.maxStudents) || 10;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Indica la fecha de inicio y de fin de la sesión." }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "La fecha de fin no puede ser anterior a la de inicio." }, { status: 400 });
  }
  if (maxStudents < 1 || maxStudents > 100) {
    return NextResponse.json({ error: "El aforo debe estar entre 1 y 100 alumnos." }, { status: 400 });
  }

  const course = await getOrCreateCourse();
  const edition = await createEdition({
    courseId: course.id,
    label: label || `Sesión ${startDate}`,
    startDate,
    endDate,
    maxStudents,
  });

  return NextResponse.json({ edition });
}
