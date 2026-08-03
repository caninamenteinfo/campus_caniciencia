import { NextResponse } from "next/server";
import { getInstructorUser } from "@/lib/auth";
import { updateEditionDates, deleteEdition } from "@/lib/courses";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const startDate = typeof body?.startDate === "string" ? body.startDate : undefined;
  const endDate = typeof body?.endDate === "string" ? body.endDate : undefined;
  const maxStudents = body?.maxStudents !== undefined ? Number(body.maxStudents) : undefined;
  const label = typeof body?.label === "string" ? body.label : undefined;

  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: "La fecha de fin no puede ser anterior a la de inicio." }, { status: 400 });
  }

  await updateEditionDates(id, { startDate, endDate, maxStudents, label });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  await deleteEdition(id);
  return NextResponse.json({ ok: true });
}
