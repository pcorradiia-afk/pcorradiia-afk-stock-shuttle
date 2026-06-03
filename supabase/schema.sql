-- ============================================================================
-- Prode Mundial 2026 — Esquema de base de datos para Supabase
-- ----------------------------------------------------------------------------
-- Pegá TODO este archivo en: Supabase → SQL Editor → New query → Run.
-- Es idempotente: lo podés correr de nuevo sin romper nada.
-- ============================================================================

-- ---------- Tablas ----------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_admin boolean not null default false,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  stage text not null default 'group',
  group_name text,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  home_score int not null,
  away_score int not null,
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.special_predictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  champion text,
  best_player text,
  top_scorer text,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id int primary key default 1,
  champion text,
  best_player text,
  top_scorer text,
  entry_amount numeric not null default 0,
  currency text not null default 'ARS',
  predictions_locked boolean not null default false,
  specials_deadline timestamptz,
  constraint settings_singleton check (id = 1)
);

create table if not exists public.asados (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Asado del grupo',
  date date not null,
  host_id uuid references public.profiles(id) on delete set null,
  approved boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.asado_attendees (
  asado_id uuid not null references public.asados(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (asado_id, user_id)
);

-- Fila única de configuración / resultados oficiales.
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Helpers ---------------------------------------------------------

-- Lee el flag is_admin SIN pasar por RLS (security definer), para usar en las
-- políticas sin caer en recursión.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- Evita que un jugador se auto-ascienda a admin o se marque como pagado.
-- En el SQL Editor / service role, auth.uid() es null y se permite (para que
-- puedas hacer admin al primer jugador a mano).
create or replace function public.protect_profile_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.is_admin := old.is_admin;
    new.paid := old.paid;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_cols();

-- ---------- RLS -------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.matches             enable row level security;
alter table public.predictions         enable row level security;
alter table public.special_predictions enable row level security;
alter table public.settings            enable row level security;
alter table public.asados              enable row level security;
alter table public.asado_attendees     enable row level security;

-- profiles ----------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

-- matches (sólo admin escribe) --------------------------------------
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select to authenticated using (true);

drop policy if exists matches_write on public.matches;
create policy matches_write on public.matches
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- predictions (propias siempre; ajenas recién al empezar el partido) -
drop policy if exists predictions_select on public.predictions;
create policy predictions_select on public.predictions
  for select to authenticated using (
    user_id = auth.uid()
    or (select kickoff_at from public.matches m where m.id = match_id) <= now()
  );

drop policy if exists predictions_insert on public.predictions;
create policy predictions_insert on public.predictions
  for insert to authenticated with check (
    user_id = auth.uid()
    and coalesce((select predictions_locked from public.settings where id = 1), false) = false
    and now() < (select kickoff_at from public.matches m where m.id = match_id)
  );

drop policy if exists predictions_update on public.predictions;
create policy predictions_update on public.predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and coalesce((select predictions_locked from public.settings where id = 1), false) = false
    and now() < (select kickoff_at from public.matches m where m.id = match_id)
  );

-- special_predictions (propias; las de todos al pasar el deadline) ---
drop policy if exists specials_select on public.special_predictions;
create policy specials_select on public.special_predictions
  for select to authenticated using (
    user_id = auth.uid()
    or public.is_admin(auth.uid())
    or (select specials_deadline from public.settings where id = 1) <= now()
  );

drop policy if exists specials_upsert on public.special_predictions;
create policy specials_upsert on public.special_predictions
  for insert to authenticated with check (
    user_id = auth.uid()
    and coalesce((select predictions_locked from public.settings where id = 1), false) = false
    and coalesce((select specials_deadline from public.settings where id = 1) > now(), true)
  );

drop policy if exists specials_update on public.special_predictions;
create policy specials_update on public.special_predictions
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and coalesce((select predictions_locked from public.settings where id = 1), false) = false
    and coalesce((select specials_deadline from public.settings where id = 1) > now(), true)
  );

-- settings (todos leen; sólo admin escribe) -------------------------
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
  for select to authenticated using (true);

drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- asados ------------------------------------------------------------
drop policy if exists asados_select on public.asados;
create policy asados_select on public.asados
  for select to authenticated using (true);

drop policy if exists asados_insert on public.asados;
create policy asados_insert on public.asados
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists asados_update on public.asados;
create policy asados_update on public.asados
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists asados_delete on public.asados;
create policy asados_delete on public.asados
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- asado_attendees (cada uno se anota/saca a sí mismo) ---------------
drop policy if exists attendees_select on public.asado_attendees;
create policy attendees_select on public.asado_attendees
  for select to authenticated using (true);

drop policy if exists attendees_insert on public.asado_attendees;
create policy attendees_insert on public.asado_attendees
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists attendees_delete on public.asado_attendees;
create policy attendees_delete on public.asado_attendees
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ---------- Grants (Supabase ya da acceso por rol; los dejamos explícitos) --
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;

-- ============================================================================
-- DESPUÉS de loguearte por primera vez en la app, hacete admin con tu email:
--
--   update public.profiles
--   set is_admin = true
--   where id = (select id from auth.users where email = 'TU_EMAIL@AQUI.com');
--
-- ============================================================================
