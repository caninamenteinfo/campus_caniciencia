import { NextResponse } from "next/server";
import { getInstructorUser } from "@/lib/auth";
import { removeStudent } from "@/lib/courses";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  await removeStudent(id);
  return NextResponse.json({ ok: true });
}
