"use client";

/** Renderiza el texto de un módulo aplicando estilo a títulos ("# ") y subtítulos ("## "). */
export function MaterialParagraphs({ content }: { content: string }) {
  const paragraphs = content.split("\n").filter((p) => p.trim().length > 0);

  return (
    <>
      {paragraphs.map((p, i) => {
        if (p.startsWith("# ")) {
          return (
            <p key={i} className="text-blue-700 font-bold text-xl pt-3 font-heading">
              {p.slice(2)}
            </p>
          );
        }
        if (p.startsWith("## ")) {
          return (
            <p key={i} className="text-blue-700 font-semibold text-lg pt-2 font-heading">
              {p.slice(3)}
            </p>
          );
        }
        const isHeading = /^Cap[ií]tulo/i.test(p) || /^M[ÓO]DULO/i.test(p);
        return (
          <p
            key={i}
            className={
              isHeading
                ? "text-blue-700 font-semibold text-lg pt-2 font-heading"
                : "text-gray-800 text-base leading-relaxed"
            }
          >
            {p}
          </p>
        );
      })}
    </>
  );
}
