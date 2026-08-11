// Solo se importa desde componentes cliente. Extrae el texto del PDF en el
// propio navegador (no se sube el archivo al servidor), así evitamos el
// límite de tamaño de subida de las funciones serverless de Vercel.

import type { TextItem } from "pdfjs-dist/types/src/display/api";

interface PdfLine {
  text: string;
  height: number;
}

/**
 * Un guion justo al final de una línea, precedido de una minúscula, casi
 * siempre es un corte de palabra por ajuste de línea del PDF (p. ej.
 * "adiestra-" al final de renglón y "miento" al principio del siguiente),
 * no un guion real del texto. En ese caso se une la palabra sin guion ni
 * salto de línea en vez de dejarla partida.
 */
function endsWithLineWrapHyphen(line: string): boolean {
  return /\p{Ll}-$/u.test(line);
}

/**
 * Algunas fuentes dibujan combinaciones de letras como "fi" o "fl" como un
 * único símbolo (ligadura tipográfica), y el PDF las guarda como un
 * fragmento de texto aparte del resto de la palabra. Si uniéramos siempre
 * los fragmentos con un espacio, palabras como "confiar" o "identifica"
 * saldrían partidas ("con fi ar", "identi fi ca"). Para saber si dos
 * fragmentos van pegados o separados de verdad, comparamos su posición
 * horizontal real en la página: solo hay espacio si hay un hueco visible
 * entre donde termina uno y empieza el siguiente.
 */
function needsSpaceBetween(prev: TextItem, curr: TextItem): boolean {
  const prevEndX = prev.transform[4] + prev.width;
  const currStartX = curr.transform[4];
  const gap = currStartX - prevEndX;
  const refHeight = curr.height || prev.height || 10;
  return gap > refHeight * 0.15;
}

/** Reconstruye las líneas de una página, con el tamaño de letra de cada una. */
function buildPageLines(items: TextItem[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let current = "";
  let lineHeight: number | null = null;
  let prevItemInLine: TextItem | null = null;

  for (const item of items) {
    if (lineHeight === null) lineHeight = item.height || 0;
    if (prevItemInLine && needsSpaceBetween(prevItemInLine, item)) {
      current += " ";
    }
    current += item.str;

    if (item.hasEOL) {
      const trimmed = current.trimEnd();
      if (endsWithLineWrapHyphen(trimmed)) {
        // La palabra continúa en la siguiente línea visual: no cerramos línea todavía.
        current = trimmed.slice(0, -1);
        prevItemInLine = null;
        continue;
      }
      lines.push({ text: trimmed, height: lineHeight ?? 0 });
      current = "";
      lineHeight = null;
      prevItemInLine = null;
    } else {
      prevItemInLine = item;
    }
  }
  if (current.trim()) lines.push({ text: current.trim(), height: lineHeight ?? 0 });
  return lines;
}

/** El tamaño de letra más frecuente del documento = el del texto de cuerpo normal. */
function computeBodyHeight(lines: PdfLine[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    if (!line.text.trim() || !line.height) continue;
    const rounded = Math.round(line.height * 2) / 2;
    counts.set(rounded, (counts.get(rounded) || 0) + 1);
  }
  let mode = 0;
  let modeCount = 0;
  for (const [height, count] of counts) {
    if (count > modeCount) {
      mode = height;
      modeCount = count;
    }
  }
  return mode || 1;
}

/**
 * Marca como título ("# ") o subtítulo ("## ") las líneas cuya letra es
 * notablemente más grande que el cuerpo de texto normal del documento, para
 * que la app pueda mostrarlas con un estilo distinto en vez de tratarlas
 * como un párrafo más.
 */
function linesToMarkedText(lines: PdfLine[], bodyHeight: number): string {
  let text = "";
  for (const line of lines) {
    if (!line.text.trim()) continue;
    const ratio = line.height / bodyHeight;
    const prefix = ratio >= 1.45 ? "# " : ratio >= 1.15 ? "## " : "";
    text += prefix + line.text + "\n";
  }
  return text;
}

export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PdfLine[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((item): item is TextItem => "str" in item);
    pages.push(buildPageLines(items));
    onProgress?.(i, pdf.numPages);
  }

  const bodyHeight = computeBodyHeight(pages.flat());
  return pages.map((lines) => linesToMarkedText(lines, bodyHeight)).join("\n");
}
