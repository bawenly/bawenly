alter table public.profiles
  add column language text not null default 'ru'
  check (language in ('ru', 'en'));
