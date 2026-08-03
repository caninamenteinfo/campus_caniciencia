"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import type { QuizQuestion } from "@/types";

export function TestsView({ activeModuleId }: { activeModuleId: number }) {
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: activeModuleId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.questions || !data.questions.length) throw new Error("Sin preguntas en la respuesta");
      setQuiz(data.questions);
    } catch (e) {
      setError(
        "No se ha podido generar el test (" +
          (e instanceof Error ? e.message : "error desconocido") +
          "). Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const score = quiz
    ? quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
    : 0;

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <p className="text-blue-600 font-semibold text-sm tracking-wide mb-1">
        AUTOEVALUACIÓN · MÓDULO {activeModuleId + 1}
      </p>
      <h1 className="text-2xl md:text-3xl text-black font-semibold mb-2 font-heading">
        Pon a prueba lo que has estudiado
      </h1>
      <p className="text-gray-600 mb-6">Genera un test de 5 preguntas basado en el módulo activo.</p>

      {!quiz && (
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-medium disabled:opacity-60 bg-blue-600"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? "Generando test…" : "Generar test"}
        </button>
      )}

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      {quiz && (
        <div className="space-y-5 mt-2">
          {quiz.map((q, qi) => (
            <div key={qi} className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-black font-medium mb-3">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const isCorrect = submitted && oi === q.correctIndex;
                  const isWrongChosen = submitted && chosen && oi !== q.correctIndex;
                  let optionClasses =
                    "w-full text-left px-4 py-2.5 rounded-xl border text-sm flex items-center justify-between ";
                  if (isCorrect) optionClasses += "border-green-600 bg-green-50";
                  else if (isWrongChosen) optionClasses += "border-red-600 bg-red-50";
                  else if (chosen && !submitted) optionClasses += "border-blue-600 bg-blue-50";
                  else optionClasses += "border-gray-200";
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                      className={optionClasses}
                    >
                      <span className="text-gray-800">{opt}</span>
                      {isCorrect && <CheckCircle2 size={16} className="text-green-600" />}
                      {isWrongChosen && <XCircle size={16} className="text-red-600" />}
                    </button>
                  );
                })}
              </div>
              {submitted && <p className="text-gray-500 text-xs mt-3 leading-relaxed">{q.explanation}</p>}
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length < quiz.length}
              className="px-5 py-3 rounded-xl text-white font-medium disabled:opacity-40 bg-blue-600"
            >
              Corregir test
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white rounded-xl px-5 py-3 font-semibold">
                {score} / {quiz.length} correctas
              </div>
              <button onClick={generate} className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                <RotateCcw size={15} /> Generar otro test
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
