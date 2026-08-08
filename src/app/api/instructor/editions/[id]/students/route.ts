import { NextResponse } from "next/server";
import { getInstructorUser } from "@/lib/auth";
import { addStudent, CapacityError } from "@/lib/courses";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!displayName) {
    return NextResponse.json({ error: "Indica el nombre del alumno." }, { status: 400 });
  }
  if (displayName.length > 120) {
    return NextResponse.json({ error: "El nombre es demasiado largo." }, { status: 400 });
  }

  try {
    const student = await addStudent(id, displayName);
    return NextResponse.json({ student });
  } catch (err) {
    if (err instanceof CapacityError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("add student error", err);
    return NextResponse.json({ error: "No se ha podido dar de alta al alumno." }, { status: 500 });
  }
}
