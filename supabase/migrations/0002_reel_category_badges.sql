-- Refinamiento #1: gamificación con 8 badges desbloqueables.
-- Los reels guardan su categoría (heredada de la propuesta) para poder
-- contar logros como "Neurobiología Master" o "Visionario" sin tener que
-- volver a consultar la propuesta original.

alter table reels add column if not exists category text;

comment on column profiles.badges is
  'IDs de badges desbloqueados. Ver backend/src/lib/badges.ts para el catálogo completo.';
