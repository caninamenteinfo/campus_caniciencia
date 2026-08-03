"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AccessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !code.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se ha podido validar el acceso.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ha ocurrido un error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-blue-100 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <Image
            src="/logo.png"
            alt="CaninaMente"
            width={80}
            height={80}
            className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 mb-4"
          />
          <p className="text-blue-600 font-semibold text-sm tracking-wide mb-1">CANINAMENTE</p>
          <h1 className="text-2xl text-black font-semibold font-heading">Campus</h1>
          <p className="text-gray-500 text-sm mt-2">
            Introduce tu nombre y el código de acceso que te ha entregado tu instructor.
          </p>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black outline-none focus:border-blue-600"
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Código de acceso"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-black outline-none focus:border-blue-600 tracking-widest uppercase"
          />
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !name.trim() || !code.trim()}
          className="w-full mt-5 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-medium disabled:opacity-50 bg-blue-600"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Comprobando…" : "Entrar al campus"}
        </button>
      </div>
    </div>
  );
}
