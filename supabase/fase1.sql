-- Ulpan · correzioni di sicurezza (fase 1).
-- Da eseguire una volta in Supabase → SQL Editor → New query (dopo schema.sql, groups.sql e classes.sql).
-- Si può rieseguire senza problemi.

-- 1) "Insegnante" solo nelle CLASSI e solo se ancora membro.
--    Prima il proprietario di un semplice gruppo tra amici poteva leggere i progressi dettagliati dei membri.
create or replace function public.is_group_teacher(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.groups g
    join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
    where g.id = gid and g.kind = 'class' and (m.role = 'teacher' or g.owner_id = auth.uid())
  );
$$;

-- Amministratore = insegnante di una classe oppure proprietario (ancora membro) di un gruppo.
create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_group_teacher(gid) or exists (
    select 1 from public.groups g
    join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
    where g.id = gid and g.owner_id = auth.uid()
  );
$$;
revoke execute on function public.is_group_admin(uuid) from public, anon;
grant execute on function public.is_group_admin(uuid) to authenticated;

-- Uscire da un gruppo o rimuovere membri (admin). Il proprietario non esce: elimina il gruppo.
drop policy if exists "members_delete_self_or_owner" on public.group_members;
drop policy if exists "members_delete_self_or_teacher" on public.group_members;
drop policy if exists "members_delete" on public.group_members;
create policy "members_delete" on public.group_members
  for delete using (
    user_id <> (select g.owner_id from public.groups g where g.id = group_id)
    and (user_id = auth.uid() or public.is_group_admin(group_id))
  );

-- 2) Statistiche: leggibili solo le proprie. Classifiche e pannello insegnante passano
--    dalle funzioni dedicate, che rispettano la classifica nascosta e i ruoli.
drop policy if exists "stats_select_self_or_groupmate" on public.public_stats;
drop policy if exists "stats_select_own" on public.public_stats;
create policy "stats_select_own" on public.public_stats
  for select using (user_id = auth.uid());

-- 3) Limite ai tentativi con i codici d'invito (contro chi prova codici a caso).
create table if not exists public.join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists join_attempts_user_at on public.join_attempts (user_id, at);
alter table public.join_attempts enable row level security; -- nessuna policy: solo dalle funzioni

create or replace function public.check_join_rate()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.join_attempts where at < now() - interval '1 day';
  if (select count(*) from public.join_attempts where user_id = auth.uid() and at > now() - interval '1 hour') >= 20 then
    raise exception 'troppi tentativi';
  end if;
  insert into public.join_attempts (user_id) values (auth.uid());
end;
$$;
revoke execute on function public.check_join_rate() from public, anon, authenticated;

create or replace function public.group_info(p_code text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  g public.groups;
begin
  perform public.check_join_rate();
  select * into g from public.groups where code = upper(trim(p_code));
  if not found then raise exception 'codice non valido'; end if;
  return json_build_object('name', g.name, 'kind', g.kind);
end;
$$;

create or replace function public.join_group(p_code text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
begin
  perform public.check_join_rate();
  select * into g from public.groups where code = upper(trim(p_code)) for update;
  if not found then raise exception 'codice non valido'; end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 200 then
    raise exception 'gruppo pieno';
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid())
    on conflict do nothing;
  return json_build_object('id', g.id, 'name', g.name, 'code', g.code);
end;
$$;

-- 4) Codici d'invito più lunghi (8 caratteri) generati con un generatore crittografico.
create or replace function public.create_group(p_name text, p_kind text default 'group')
returns json language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
  v_bytes bytea;
  i int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if char_length(trim(p_name)) = 0 then raise exception 'nome mancante'; end if;
  if p_kind not in ('group', 'class') then raise exception 'tipo non valido'; end if;
  if (select count(*) from public.groups where owner_id = auth.uid()) >= 20 then
    raise exception 'troppi gruppi';
  end if;
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
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

-- 5) Limiti di dimensione e valori plausibili (contro abusi di spazio e classifiche falsate).
alter table public.progress drop constraint if exists progress_size;
alter table public.progress add constraint progress_size check (pg_column_size(state) < 1048576);
alter table public.public_stats drop constraint if exists recent_size;
alter table public.public_stats add constraint recent_size check (pg_column_size(recent) < 4096);
alter table public.public_stats drop constraint if exists stats_sane;
alter table public.public_stats add constraint stats_sane
  check (xp between 0 and 10000000 and streak between 0 and 10000 and lessons_passed between 0 and 100);

revoke execute on function public.group_info(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.create_group(text, text) from public, anon;
grant execute on function public.group_info(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.create_group(text, text) to authenticated;
