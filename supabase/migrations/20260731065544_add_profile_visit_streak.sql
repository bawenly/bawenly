alter table public.profiles
  add column visit_streak integer not null default 0 check (visit_streak >= 0),
  add column last_visit_date date;

create or replace function public.record_profile_visit(
  p_local_date date,
  p_display_name text
)
returns table (visit_streak integer, last_visit_date date)
language plpgsql
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, visit_streak, last_visit_date)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_display_name), ''), 'Пользователь'),
    1,
    p_local_date
  )
  on conflict (user_id) do update
  set visit_streak = case
      when profiles.last_visit_date = excluded.last_visit_date then profiles.visit_streak
      when profiles.last_visit_date = excluded.last_visit_date - 1 then profiles.visit_streak + 1
      else 1
    end,
    last_visit_date = excluded.last_visit_date,
    updated_at = case
      when profiles.last_visit_date = excluded.last_visit_date then profiles.updated_at
      else now()
    end;

  return query
  select profiles.visit_streak, profiles.last_visit_date
  from public.profiles
  where profiles.user_id = auth.uid();
end;
$$;

revoke all on function public.record_profile_visit(date, text) from public;
grant execute on function public.record_profile_visit(date, text) to authenticated;
