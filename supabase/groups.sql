-- Ulpan: gruppi e classifica.
-- Da eseguire una volta in Supabase → SQL Editor → New query (dopo schema.sql).
-- Privacy: nome e statistiche di un utente sono visibili solo ai membri dei suoi gruppi; l'email mai.

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Statistiche pubbliche (per la classifica), aggiornate dall'app di ogni utente.
create table if not exists public.public_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  xp integer not null default 0,
  streak integer not null default 0,
  lessons_passed integer not null default 0,
  last_active date,
  -- risposte corrette degli ultimi 14 giorni: {"2026-09-25": 12, ...}
  recent jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.public_stats enable row level security;

-- L'utente corrente fa parte del gruppo?
create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select using (public.is_group_member(id));
drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete using (owner_id = auth.uid());

drop policy if exists "members_select_member" on public.group_members;
create policy "members_select_member" on public.group_members
  for select using (public.is_group_member(group_id));
-- si può uscire da un gruppo; il proprietario può rimuovere i membri
drop policy if exists "members_delete_self_or_owner" on public.group_members;
create policy "members_delete_self_or_owner" on public.group_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

drop policy if exists "stats_select_self_or_groupmate" on public.public_stats;
create policy "stats_select_self_or_groupmate" on public.public_stats
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members m
      where m.user_id = public_stats.user_id and public.is_group_member(m.group_id)
    )
  );
drop policy if exists "stats_insert_own" on public.public_stats;
create policy "stats_insert_own" on public.public_stats
  for insert with check (user_id = auth.uid());
drop policy if exists "stats_update_own" on public.public_stats;
create policy "stats_update_own" on public.public_stats
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Crea un gruppo con un codice d'invito univoco e ne fa entrare il creatore.
create or replace function public.create_group(p_name text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
  i int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(trim(p_name)) = 0 then raise exception 'nome mancante'; end if;
  if (select count(*) from public.groups where owner_id = auth.uid()) >= 20 then
    raise exception 'troppi gruppi';
  end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where code = v_code);
  end loop;
  insert into public.groups (name, code, owner_id) values (trim(p_name), v_code, auth.uid()) returning id into v_id;
  insert into public.group_members (group_id, user_id) values (v_id, auth.uid());
  return json_build_object('id', v_id, 'name', trim(p_name), 'code', v_code);
end;
$$;

-- Entra in un gruppo tramite codice.
create or replace function public.join_group(p_code text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'codice non valido'; end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 200 then
    raise exception 'gruppo pieno';
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid())
    on conflict do nothing;
  return json_build_object('id', g.id, 'name', g.name, 'code', g.code);
end;
$$;

-- I miei gruppi con il numero di membri.
create or replace function public.my_groups()
returns table (id uuid, name text, code text, owner_id uuid, members bigint)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.code, g.owner_id,
         (select count(*) from public.group_members x where x.group_id = g.id)
  from public.groups g
  join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at;
$$;

-- Classifica di un gruppo (solo per i suoi membri).
create or replace function public.group_leaderboard(gid uuid)
returns table (user_id uuid, display_name text, xp integer, streak integer,
               lessons_passed integer, last_active date, recent jsonb)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(nullif(s.display_name, ''), 'Utente'), coalesce(s.xp, 0), coalesce(s.streak, 0),
         coalesce(s.lessons_passed, 0), s.last_active, coalesce(s.recent, '{}'::jsonb)
  from public.group_members m
  left join public.public_stats s on s.user_id = m.user_id
  where m.group_id = gid and public.is_group_member(gid);
$$;

revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.my_groups() from public, anon;
revoke execute on function public.group_leaderboard(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.my_groups() to authenticated;
grant execute on function public.group_leaderboard(uuid) to authenticated;
