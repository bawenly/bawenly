alter table public.tasks
  add column generation_state text
    check (generation_state in ('loading', 'error')),
  add column generation_error text,
  add column final_state text;

alter table public.task_steps
  add column support jsonb;
