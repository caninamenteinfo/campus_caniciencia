-- CaninaMente Content Manager — esquema inicial
-- Un solo operador humano por cuenta de Google, pero el esquema queda
-- preparado por usuario (auth.uid()) por si el equipo crece.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles — gamificación (racha, badges) por usuario
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  streak_count int not null default 0,
  longest_streak int not null default 0,
  badges text[] not null default '{}',
  last_completed_week date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- weekly_cycles — un ciclo por semana de producción
-- ============================================================
create table if not exists weekly_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  status text not null default 'planning'
    check (status in ('planning','recording','designing','scheduled','live','closed')),
  flow_step int not null default 0, -- 0=no iniciado,1=grabación,2=captions,3=diseño,4=programación,5=completo
  flow_started_at timestamptz,
  flow_completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ============================================================
-- proposals — 5 propuestas semanales generadas (o editadas)
-- ============================================================
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references weekly_cycles(id) on delete cascade,
  order_index int not null default 0,
  category text not null,
  hook text not null,
  description text not null,
  duration_seconds int not null default 45,
  canva_direction text,
  tiktok_adapt boolean not null default false,
  potential text not null default 'Alto' check (potential in ('Alto','Muy Alto','Máximo')),
  recommended_day text,
  script text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- reels — piezas producidas a partir de una propuesta aceptada
-- ============================================================
create table if not exists reels (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references weekly_cycles(id) on delete cascade,
  proposal_id uuid references proposals(id) on delete set null,
  order_index int not null default 0,
  title text not null,
  script text,
  recorded boolean not null default false,
  caption_short text,
  caption_long text,
  hashtags text[] not null default '{}',
  canva_design_id text,
  canva_export_url text,
  status text not null default 'pending'
    check (status in ('pending','recorded','captioned','designed','scheduled','published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- weekly_metrics — resultados por reel (se pueden registrar varias veces)
-- ============================================================
create table if not exists weekly_metrics (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references reels(id) on delete cascade,
  views int not null default 0,
  shares int not null default 0,
  comments int not null default 0,
  saves int not null default 0,
  recorded_at timestamptz not null default now()
);

-- ============================================================
-- weekly_feedback — cierre de semana (insights + notas del usuario)
-- ============================================================
create table if not exists weekly_feedback (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references weekly_cycles(id) on delete cascade,
  notes text,
  insights_good text,
  insights_bad text,
  recommendation text,
  created_at timestamptz not null default now(),
  unique (cycle_id)
);

-- ============================================================
-- integration_tokens — tokens OAuth de Canva (encriptados en el backend)
-- ============================================================
create table if not exists integration_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('canva')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- ============================================================
-- push_subscriptions — suscripciones Web Push para las alarmas
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, subscription)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table weekly_cycles enable row level security;
alter table proposals enable row level security;
alter table reels enable row level security;
alter table weekly_metrics enable row level security;
alter table weekly_feedback enable row level security;
alter table integration_tokens enable row level security;
alter table push_subscriptions enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own cycles" on weekly_cycles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own proposals" on proposals
  for all using (exists (
    select 1 from weekly_cycles c where c.id = proposals.cycle_id and c.user_id = auth.uid()
  )) with check (exists (
    select 1 from weekly_cycles c where c.id = proposals.cycle_id and c.user_id = auth.uid()
  ));

create policy "own reels" on reels
  for all using (exists (
    select 1 from weekly_cycles c where c.id = reels.cycle_id and c.user_id = auth.uid()
  )) with check (exists (
    select 1 from weekly_cycles c where c.id = reels.cycle_id and c.user_id = auth.uid()
  ));

create policy "own metrics" on weekly_metrics
  for all using (exists (
    select 1 from reels r join weekly_cycles c on c.id = r.cycle_id
    where r.id = weekly_metrics.reel_id and c.user_id = auth.uid()
  )) with check (exists (
    select 1 from reels r join weekly_cycles c on c.id = r.cycle_id
    where r.id = weekly_metrics.reel_id and c.user_id = auth.uid()
  ));

create policy "own feedback" on weekly_feedback
  for all using (exists (
    select 1 from weekly_cycles c where c.id = weekly_feedback.cycle_id and c.user_id = auth.uid()
  )) with check (exists (
    select 1 from weekly_cycles c where c.id = weekly_feedback.cycle_id and c.user_id = auth.uid()
  ));

create policy "own tokens" on integration_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own push subs" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Crea el profile automáticamente al primer login
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
