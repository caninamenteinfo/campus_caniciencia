export function Loader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-white/60">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-brand-cyan" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
