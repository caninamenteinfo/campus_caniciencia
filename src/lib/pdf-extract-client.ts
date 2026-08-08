// Solo se importa desde componentes cliente. Extrae el texto del PDF en el
// propio navegador (no se sube el archivo al servidor), así evitamos el
// límite de tamaño de subida de las funciones serverless de Vercel.

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
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    fullText += pageText + "\n\n";
    onProgress?.(i, pdf.numPages);
  }

  return fullText;
}
