-- Ulpan · fase 4: consenso alle classi registrato sul server.
-- Da eseguire una volta in Supabase → SQL Editor → New query (dopo fase1.sql). Si può rieseguire.

-- Quando lo studente ha accettato che l'insegnante veda i suoi progressi.
alter table public.group_members add column if not exists consented_at timestamptz;
-- Chi è già in una classe aveva confermato nell'app al momento dell'ingresso.
update public.group_members m set consented_at = m.joined_at
  from public.groups g
  where g.id = m.group_id and g.kind = 'class' and m.consented_at is null;

-- Entrare in una classe richiede il consenso esplicito (p_consent = true).
drop function if exists public.join_group(text);
create or replace function public.join_group(p_code text, p_consent boolean default false)
returns json language plpgsql security definer set search_path = '' as $$
declare
  g public.groups;
begin
  perform public.check_join_rate();
  select * into g from public.groups where code = upper(trim(p_code)) for update;
  if not found then raise exception 'codice non valido'; end if;
  if g.kind = 'class' and not coalesce(p_consent, false) then
    raise exception 'consenso richiesto';
  end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 200 then
    raise exception 'gruppo pieno';
  end if;
  insert into public.group_members (group_id, user_id, consented_at)
    values (g.id, auth.uid(), case when g.kind = 'class' then now() end)
    on conflict do nothing;
  return json_build_object('id', g.id, 'name', g.name, 'code', g.code);
end;
$$;
revoke execute on function public.join_group(text, boolean) from public, anon;
grant execute on function public.join_group(text, boolean) to authenticated;

-- Il pannello insegnante mostra i progressi solo di chi ha dato il consenso.
create or replace function public.class_report(gid uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz, progress jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_group_teacher(gid) then raise exception 'solo insegnanti'; end if;
  return query
    select m.user_id, coalesce(nullif(s.display_name, ''), 'Utente'), m.role, m.joined_at,
           case when p.state is null or (m.role = 'student' and m.consented_at is null) then '{}'::jsonb
           else jsonb_build_object(
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
