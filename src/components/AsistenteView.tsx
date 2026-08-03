"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/types";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hola, soy tu asistente de estudio para este módulo. Pregúntame lo que no te haya quedado claro del material, o pídeme que te lo explique de otra forma.",
};

// La clave `key={activeModuleId}` en CampusApp remonta este componente al
// cambiar de módulo, reiniciando la conversación (el asistente solo conoce
// el módulo activo).
export function AsistenteView({ activeModuleId }: { activeModuleId: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: activeModuleId, messages: newMessages }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "No he podido generar una respuesta, inténtalo de nuevo." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ha ocurrido un error al conectar con el asistente. Inténtalo de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl">
      <div className="px-6 md:px-10 pt-6 md:pt-10 pb-4">
        <p className="text-blue-600 font-semibold text-sm tracking-wide mb-1">
          ASISTENTE · MÓDULO {activeModuleId + 1}
        </p>
        <h1 className="text-2xl md:text-3xl text-black font-semibold font-heading">Pregunta lo que necesites</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 space-y-4 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              style={{ maxWidth: "85%" }}
              className={`rounded-2xl px-4 py-3 text-base leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Pensando…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-6 md:px-10 pb-6 md:pb-10 pt-2">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-2xl px-4 py-2 focus-within:border-blue-600 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escribe tu duda sobre el material…"
            className="flex-1 py-2 text-base outline-none text-black placeholder-gray-400"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 bg-blue-600"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
