import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useCurrentCycle } from "../hooks/useCurrentCycle";
import { useDebouncedEffect } from "../hooks/useDebouncedEffect";
import type { Reel } from "../lib/types";
import { Loader } from "../components/Loader";
import { FlowGuard } from "../components/FlowGuard";
import { celebrate } from "../lib/celebrate";

export function Captions() {
  const { cycle, loading } = useCurrentCycle();
  const [reels, setReels] = useState<Reel[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!cycle) return;
    api.get<{ reels: Reel[] }>(`/api/reels?cycleId=${cycle.id}`).then((r) => setReels(r.reels));
  }, [cycle]);

  if (loading || !cycle) return <Loader />;

  const ready = reels.length > 0 && reels.every((r) => r.caption_short && r.caption_long);

  async function finishStep() {
    await api.patch(`/api/cycles/${cycle!.id}`, { flow_step: 2 });
    celebrate("step");
    navigate("/diseno");
  }

  return (
    <FlowGuard cycle={cycle} requiredStep={2}>
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="font-display text-2xl">Captions</h1>
        {reels.map((reel) => (
          <CaptionEditor
            key={reel.id}
            reel={reel}
            onUpdate={(u) => setReels((prev) => prev.map((r) => (r.id === u.id ? u : r)))}
          />
        ))}
        {ready && (
          <button onClick={finishStep} className="btn-primary w-full animate-pulseGlow">
            Captions listos — continuar a Diseño
          </button>
        )}
      </div>
    </FlowGuard>
  );
}

type SaveStatus = "idle" | "saving" | "saved";

function CaptionEditor({ reel, onUpdate }: { reel: Reel; onUpdate: (r: Reel) => void }) {
  const [shortCopy, setShortCopy] = useState(reel.caption_short ?? "");
  const [longCopy, setLongCopy] = useState(reel.caption_long ?? "");
  const [hashtags, setHashtags] = useState((reel.hashtags ?? []).join(" "));
  const [suggesting, setSuggesting] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");

  async function suggest() {
    setSuggesting(true);
    try {
      const s = await api.post<{ caption_short: string; caption_long: string; hashtags: string[] }>(
        `/api/reels/${reel.id}/captions/suggest`
      );
      setShortCopy(s.caption_short);
      setLongCopy(s.caption_long);
      setHashtags(s.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "));
    } finally {
      setSuggesting(false);
    }
  }

  async function save() {
    setStatus("saving");
    try {
      const updated = await api.patch<{ reel: Reel }>(`/api/reels/${reel.id}`, {
        caption_short: shortCopy,
        caption_long: longCopy,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        status: "captioned",
      });
      onUpdate(updated.reel);
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  }

  // Auto-guardado: cualquier cambio en los campos se persiste solo, sin
  // necesidad de tocar el botón — así nunca se pierde una idea a mitad de escritura.
  useDebouncedEffect(() => {
    if (shortCopy || longCopy || hashtags) save();
  }, [shortCopy, longCopy, hashtags]);

  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base">{reel.title}</h2>
        <button onClick={suggest} disabled={suggesting} className="btn-secondary text-xs">
          <Sparkles size={13} /> {suggesting ? "Pensando…" : "Sugerir con IA"}
        </button>
      </div>

      <label className="block text-xs text-white/50">Copy corto (imagen, 2 líneas)</label>
      <textarea
        value={shortCopy}
        onChange={(e) => setShortCopy(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-brand-cyan/50"
      />

      <label className="block text-xs text-white/50">Caption largo (Instagram)</label>
      <textarea
        value={longCopy}
        onChange={(e) => setLongCopy(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-brand-cyan/50"
      />

      <label className="block text-xs text-white/50">Hashtags</label>
      <input
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-brand-cyan/50"
      />

      {shortCopy && (
        <div className="rounded-xl border border-white/10 bg-base-light p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-white/40">Preview Instagram</p>
          <p className="text-sm font-semibold">{shortCopy}</p>
          <p className="mt-1 text-xs text-white/60 line-clamp-3">{longCopy}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 text-xs text-white/40">
        {status === "saving" && "Guardando…"}
        {status === "saved" && (
          <span className="flex items-center gap-1 text-brand-cyan">
            <Check size={12} /> Guardado automáticamente
          </span>
        )}
      </div>
    </section>
  );
}
