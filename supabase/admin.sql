-- Ulpan: area amministratore (elenco iscritti con date e punto di studio).
-- Da eseguire una volta in Supabase → SQL Editor. Poi abilita il tuo account con l'ultima istruzione.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Nessuna policy: la tabella non è leggibile né scrivibile dal browser, solo dalle funzioni qui sotto.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.admin_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  provider text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  synced_at timestamptz,
  last_active text,
  xp integer,
  streak integer,
  lessons_passed integer,
  max_lesson_passed integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  return query
    select
      u.id,
      u.email::text,
      coalesce(u.raw_user_meta_data ->> 'name', '')::text,
      coalesce(u.raw_app_meta_data ->> 'provider', 'email')::text,
      u.created_at,
      u.last_sign_in_at,
      p.updated_at,
      (p.state ->> 'lastActive')::text,
      coalesce(nullif(p.state ->> 'xp', '')::numeric, 0)::integer,
      coalesce(nullif(p.state ->> 'streak', '')::numeric, 0)::integer,
      coalesce(ls.passed_count, 0)::integer,
      coalesce(ls.max_passed, 0)::integer
    from auth.users u
    left join public.progress p on p.user_id = u.id
    left join lateral (
      select
        count(*) filter (where l.value ->> 'passed' = 'true') as passed_count,
        max(l.key::integer) filter (where l.value ->> 'passed' = 'true') as max_passed
      from jsonb_each(case when jsonb_typeof(p.state -> 'lessons') = 'object' then p.state -> 'lessons' else '{}'::jsonb end) l
      where l.key ~ '^[0-9]{1,3}$'
    ) ls on true
    order by u.created_at desc;
end;
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_users() to authenticated;

-- Abilita il tuo account come amministratore (cambia l'email se serve):
insert into public.admins (user_id)
select id from auth.users where email = 'm.mieli@powerpill.io'
on conflict do nothing;
