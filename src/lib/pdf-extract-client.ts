// Solo se importa desde componentes cliente. Extrae el texto del PDF en el
// propio navegador (no se sube el archivo al servidor), así evitamos el
// límite de tamaño de subida de las funciones serverless de Vercel.

import type { TextItem } from "pdfjs-dist/types/src/display/api";

/** Une los fragmentos de texto de una página respetando los saltos de línea reales del PDF. */
function joinPageText(items: TextItem[]): string {
  let pageText = "";
  let currentLine = "";
  for (const item of items) {
    currentLine += item.str;
    if (item.hasEOL) {
      pageText += currentLine.trimEnd() + "\n";
      currentLine = "";
    } else {
      currentLine += " ";
    }
  }
  if (currentLine.trim()) pageText += currentLine.trimEnd() + "\n";
  return pageText;
}

export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is TextItem => "str" in item);
    fullText += joinPageText(items) + "\n";
    onProgress?.(i, pdf.numPages);
  }

  return fullText;
}
