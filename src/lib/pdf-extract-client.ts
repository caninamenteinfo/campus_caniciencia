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

type HeadingLevel = "" | "# " | "## ";

function headingLevel(line: PdfLine, bodyHeight: number): HeadingLevel {
  const ratio = line.height / bodyHeight;
  return ratio >= 1.45 ? "# " : ratio >= 1.15 ? "## " : "";
}

/**
 * Marca como título ("# ") o subtítulo ("## ") las líneas cuya letra es
 * notablemente más grande que el cuerpo de texto normal del documento, para
 * que la app pueda mostrarlas con un estilo distinto en vez de tratarlas
 * como un párrafo más. Cuando un título largo ocupa dos líneas del PDF
 * (mismo tamaño de letra en ambas, una justo detrás de la otra), se unen en
 * un único título en vez de quedar partido en dos.
 */
function linesToMarkedText(lines: PdfLine[], bodyHeight: number): string {
  const nonEmpty = lines.filter((l) => l.text.trim());
  let text = "";
  let i = 0;
  while (i < nonEmpty.length) {
    const level = headingLevel(nonEmpty[i], bodyHeight);
    if (level) {
      let merged = nonEmpty[i].text;
      let j = i + 1;
      while (j < nonEmpty.length && headingLevel(nonEmpty[j], bodyHeight) === level) {
        merged += " " + nonEmpty[j].text;
        j++;
      }
      text += level + merged + "\n";
      i = j;
    } else {
      text += nonEmpty[i].text + "\n";
      i++;
    }
  }
  return text;
}

/**
 * Los encabezados/pies de página (nombre del curso, autor, número de
 * página...) se repiten casi igual en la primera o última línea de la
 * mayoría de páginas del PDF. Se detectan por esa repetición y se
 * eliminan, para que no aparezcan mezclados con el contenido real en cada
 * página. Los números de página se ignoran al comparar (para que "Página 3"
 * y "Página 4" cuenten como el mismo patrón repetido).
 */
function stripRunningHeadersFooters(pages: PdfLine[][]): PdfLine[][] {
  if (pages.length < 3) return pages;

  const normalize = (s: string) => s.trim().replace(/\d+/g, "#").toLowerCase();

  const edgeIndexes = pages.map((page) => {
    let first = -1;
    let last = -1;
    for (let i = 0; i < page.length; i++) {
      if (!page[i].text.trim()) continue;
      if (first === -1) first = i;
      last = i;
    }
    return { first, last };
  });

  const headerCounts = new Map<string, number>();
  const footerCounts = new Map<string, number>();
  pages.forEach((page, pageIdx) => {
    const { first, last } = edgeIndexes[pageIdx];
    if (first !== -1) {
      const key = normalize(page[first].text);
      headerCounts.set(key, (headerCounts.get(key) || 0) + 1);
    }
    if (last !== -1 && last !== first) {
      const key = normalize(page[last].text);
      footerCounts.set(key, (footerCounts.get(key) || 0) + 1);
    }
  });

  const threshold = Math.max(3, Math.ceil(pages.length * 0.4));
  const repeatedHeaders = new Set(
    [...headerCounts].filter(([, count]) => count >= threshold).map(([key]) => key)
  );
  const repeatedFooters = new Set(
    [...footerCounts].filter(([, count]) => count >= threshold).map(([key]) => key)
  );
  if (repeatedHeaders.size === 0 && repeatedFooters.size === 0) return pages;

  return pages.map((page, pageIdx) => {
    const { first, last } = edgeIndexes[pageIdx];
    return page.filter((line, idx) => {
      if (!line.text.trim()) return true;
      const key = normalize(line.text);
      if (idx === first && repeatedHeaders.has(key)) return false;
      if (idx === last && repeatedFooters.has(key)) return false;
      return true;
    });
  });
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

  const cleanedPages = stripRunningHeadersFooters(pages);
  const bodyHeight = computeBodyHeight(cleanedPages.flat());
  return cleanedPages.map((lines) => linesToMarkedText(lines, bodyHeight)).join("\n");
}
