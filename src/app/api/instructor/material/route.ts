import { NextResponse } from "next/server";
import { getInstructorUser } from "@/lib/auth";
import { getOrCreateCourse, updateCourse } from "@/lib/courses";

export async function POST(req: Request) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const materialText = typeof body?.materialText === "string" ? body.materialText : undefined;

  if (name !== undefined && name.length === 0) {
    return NextResponse.json({ error: "El nombre del curso no puede estar vacío." }, { status: 400 });
  }

  const course = await getOrCreateCourse();
  const updated = await updateCourse(course.id, { name, material_text: materialText });

  return NextResponse.json({ course: updated });
}
