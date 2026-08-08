import { NextResponse } from "next/server";
import { getInstructorUser } from "@/lib/auth";
import { regenerateStudentCode } from "@/lib/courses";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const student = await regenerateStudentCode(id);
  return NextResponse.json({ student });
}
