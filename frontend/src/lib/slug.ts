/** Espejo del slugify del backend — nombre de archivo prolijo para la descarga. */
export function reelFilename(reel: { title: string; order_index: number }): string {
  const slug = reel.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `Reel-${reel.order_index + 1}-${slug}.mp4`;
}
