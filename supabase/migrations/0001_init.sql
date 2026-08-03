-- CaninaMente Campus — esquema inicial
-- Ejecutar en el SQL Editor de Supabase (o vía `supabase db push`).

create extension if not exists "pgcrypto";

-- Perfiles de usuarios de Supabase Auth. Solo se usa para marcar
-- qué cuentas tienen rol "instructor" y pueden entrar al panel.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'instructor' check (role in ('instructor')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- El propio usuario puede leer su perfil (solo se usa como comprobación
-- de conveniencia en cliente; la comprobación real de autorización se
-- hace siempre en el servidor con la service role key).
create policy "profiles: select propio" on public.profiles
  for select using (auth.uid() = id);

-- Curso: nombre + material + módulos ya detectados (cache de parseModules).
-- El instructor puede sustituir el contenido por el de cualquier curso;
-- no está fijado a "Diplomado en Estimulación Olfativa..." en la base de datos,
-- eso es solo la semilla inicial.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  material_text text not null default '',
  modules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;
-- Sin políticas de select/insert/update para anon/authenticated:
-- todo el acceso a esta tabla pasa por rutas de servidor con la
-- service role key, que se salta RLS. Así el material del curso
-- nunca es legible directamente con la clave anon del navegador.

-- Ediciones de un curso: código de acceso, ventana de fechas y aforo.
create table if not exists public.course_editions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  label text not null default '',
  access_code text not null unique,
  start_date date not null,
  end_date date not null,
  max_students int not null default 10 check (max_students > 0),
  created_at timestamptz not null default now(),
  constraint edition_dates_valid check (end_date >= start_date)
);

alter table public.course_editions enable row level security;

create index if not exists course_editions_course_id_idx
  on public.course_editions(course_id);

-- Alumnos registrados en una edición (para hacer cumplir el aforo máximo).
create table if not exists public.edition_students (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.course_editions(id) on delete cascade,
  identifier text not null,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  unique (edition_id, identifier)
);

alter table public.edition_students enable row level security;

create index if not exists edition_students_edition_id_idx
  on public.edition_students(edition_id);
