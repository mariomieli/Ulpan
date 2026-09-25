-- Ulpan: classi con insegnante, compiti e pannello insegnante.
-- Da eseguire una volta in Supabase → SQL Editor → New query (dopo schema.sql e groups.sql).
-- Sicurezza: solo gli insegnanti di una classe vedono i progressi dettagliati dei suoi studenti.

alter table public.groups add column if not exists kind text not null default 'group';
alter table public.groups drop constraint if exists groups_kind_check;
alter table public.groups add constraint groups_kind_check check (kind in ('group', 'class'));
alter table public.groups add column if not exists leaderboard_visible boolean not null default true;

alter table public.group_members add column if not exists role text not null default 'student';
alter table public.group_members drop constraint if exists group_members_role_check;
alter table public.group_members add constraint group_members_role_check check (role in ('student', 'teacher'));

-- L'utente corrente è insegnante (o proprietario) della classe?
create or replace function public.is_group_teacher(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role = 'teacher')
      or exists (select 1 from public.groups where id = gid and owner_id = auth.uid());
$$;

-- Uscire da un gruppo; insegnanti e proprietario possono rimuovere membri (ma non il proprietario).
drop policy if exists "members_delete_self_or_owner" on public.group_members;
drop policy if exists "members_delete_self_or_teacher" on public.group_members;
create policy "members_delete_self_or_teacher" on public.group_members
  for delete using (
    user_id = auth.uid()
    or (public.is_group_teacher(group_id)
        and user_id <> (select g.owner_id from public.groups g where g.id = group_id))
  );

-- Crea un gruppo ('group') o una classe ('class'): chi crea una classe ne è l'insegnante.
drop function if exists public.create_group(text);
create or replace function public.create_group(p_name text, p_kind text default 'group')
returns json language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
  i int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(trim(p_name)) = 0 then raise exception 'nome mancante'; end if;
  if p_kind not in ('group', 'class') then raise exception 'tipo non valido'; end if;
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
  insert into public.groups (name, code, owner_id, kind, leaderboard_visible)
    values (trim(p_name), v_code, auth.uid(), p_kind, p_kind = 'group')
    returning id into v_id;
  insert into public.group_members (group_id, user_id, role)
    values (v_id, auth.uid(), case when p_kind = 'class' then 'teacher' else 'student' end);
  return json_build_object('id', v_id, 'name', trim(p_name), 'code', v_code, 'kind', p_kind);
end;
$$;

-- Informazioni su un gruppo prima di entrarci (per chiedere il consenso se è una classe).
create or replace function public.group_info(p_code text)
returns json language plpgsql stable security definer set search_path = '' as $$
declare
  g public.groups;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'codice non valido'; end if;
  return json_build_object('name', g.name, 'kind', g.kind);
end;
$$;

-- I miei gruppi e classi, con il mio ruolo.
drop function if exists public.my_groups();
create or replace function public.my_groups()
returns table (id uuid, name text, code text, owner_id uuid, members bigint,
               kind text, role text, leaderboard_visible boolean)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.code, g.owner_id,
         (select count(*) from public.group_members x where x.group_id = g.id and x.role = 'student'),
         g.kind, case when g.owner_id = auth.uid() and g.kind = 'class' then 'teacher' else m.role end,
         g.leaderboard_visible
  from public.groups g
  join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at;
$$;

-- Classifica: nelle classi esclude gli insegnanti ed è visibile agli studenti solo se attivata.
create or replace function public.group_leaderboard(gid uuid)
returns table (user_id uuid, display_name text, xp integer, streak integer,
               lessons_passed integer, last_active date, recent jsonb)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(nullif(s.display_name, ''), 'Utente'), coalesce(s.xp, 0), coalesce(s.streak, 0),
         coalesce(s.lessons_passed, 0), s.last_active, coalesce(s.recent, '{}'::jsonb)
  from public.group_members m
  join public.groups g on g.id = m.group_id
  left join public.public_stats s on s.user_id = m.user_id
  where m.group_id = gid
    and public.is_group_member(gid)
    and (g.kind <> 'class' or m.role = 'student')
    and (g.kind <> 'class' or g.leaderboard_visible or public.is_group_teacher(gid));
$$;

-- Mostra o nasconde la classifica agli studenti (solo insegnanti).
create or replace function public.set_leaderboard_visible(gid uuid, visible boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_teacher(gid) then raise exception 'solo insegnanti'; end if;
  update public.groups set leaderboard_visible = visible where id = gid;
end;
$$;

-- Nomina o revoca un co-insegnante (solo il proprietario della classe).
create or replace function public.set_member_role(gid uuid, uid uuid, new_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.groups where id = gid and owner_id = auth.uid() and kind = 'class') then
    raise exception 'solo il proprietario';
  end if;
  if new_role not in ('student', 'teacher') or uid = auth.uid() then raise exception 'ruolo non valido'; end if;
  update public.group_members set role = new_role where group_id = gid and user_id = uid;
end;
$$;

-- Pannello insegnante: progressi dettagliati degli studenti della classe (solo insegnanti).
create or replace function public.class_report(gid uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz, progress jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_group_teacher(gid) then raise exception 'solo insegnanti'; end if;
  return query
    select m.user_id, coalesce(nullif(s.display_name, ''), 'Utente'), m.role, m.joined_at,
           case when p.state is null then '{}'::jsonb else jsonb_build_object(
             'lessons', p.state -> 'lessons', 'exams', p.state -> 'exams', 'srs', p.state -> 'srs',
             'days', p.state -> 'days', 'texts', p.state -> 'texts', 'xp', p.state -> 'xp',
             'streak', p.state -> 'streak', 'lastActive', p.state -> 'lastActive') end
    from public.group_members m
    left join public.public_stats s on s.user_id = m.user_id
    left join public.progress p on p.user_id = m.user_id
    where m.group_id = gid
    order by m.role desc, s.display_name;
end;
$$;

-- Compiti assegnati dall'insegnante.
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  lesson_id integer not null check (lesson_id between 1 and 100),
  note text not null default '' check (char_length(note) <= 200),
  due_date date,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.assignments enable row level security;

drop policy if exists "assignments_select_member" on public.assignments;
create policy "assignments_select_member" on public.assignments
  for select using (public.is_group_member(group_id));
drop policy if exists "assignments_insert_teacher" on public.assignments;
create policy "assignments_insert_teacher" on public.assignments
  for insert with check (public.is_group_teacher(group_id) and created_by = auth.uid());
drop policy if exists "assignments_delete_teacher" on public.assignments;
create policy "assignments_delete_teacher" on public.assignments
  for delete using (public.is_group_teacher(group_id));

revoke execute on function public.is_group_teacher(uuid) from public, anon;
revoke execute on function public.create_group(text, text) from public, anon;
revoke execute on function public.group_info(text) from public, anon;
revoke execute on function public.my_groups() from public, anon;
revoke execute on function public.group_leaderboard(uuid) from public, anon;
revoke execute on function public.set_leaderboard_visible(uuid, boolean) from public, anon;
revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon;
revoke execute on function public.class_report(uuid) from public, anon;
grant execute on function public.is_group_teacher(uuid) to authenticated;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.group_info(text) to authenticated;
grant execute on function public.my_groups() to authenticated;
grant execute on function public.group_leaderboard(uuid) to authenticated;
grant execute on function public.set_leaderboard_visible(uuid, boolean) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.class_report(uuid) to authenticated;
