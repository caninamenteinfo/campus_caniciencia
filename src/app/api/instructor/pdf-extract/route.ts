import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getInstructorUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getInstructorUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No se ha recibido ningún archivo." }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf" && !("name" in file && String((file as File).name).toLowerCase().endsWith(".pdf"))) {
    return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result.text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "No se ha podido extraer texto de este PDF. Prueba a pegarlo manualmente." },
        { status: 422 }
      );
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("pdf-extract error", err);
    return NextResponse.json(
      { error: "No se ha podido leer el PDF. Prueba a pegar el texto manualmente." },
      { status: 422 }
    );
  } finally {
    await parser.destroy();
  }
}
