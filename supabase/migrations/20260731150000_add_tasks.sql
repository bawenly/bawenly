create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'paused', 'done')),
  status_before_pause text
    check (status_before_pause in ('not_started', 'in_progress', 'done')),
  due_date date,
  procrastination_reason text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_steps (
  id uuid primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  position integer not null check (position >= 0),
  estimated_minutes integer not null check (estimated_minutes >= 1),
  actual_seconds integer not null default 0 check (actual_seconds >= 0),
  is_done boolean not null default false,
  unique (task_id, position)
);

alter table public.tasks enable row level security;
alter table public.task_steps enable row level security;

create policy "users read own tasks" on public.tasks
  for select using (auth.uid() = user_id);
create policy "users insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "users update own tasks" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

create policy "users read own task steps" on public.task_steps
  for select using (auth.uid() = user_id);
create policy "users insert own task steps" on public.task_steps
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.tasks
      where tasks.id = task_steps.task_id and tasks.user_id = auth.uid()
    )
  );
create policy "users update own task steps" on public.task_steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own task steps" on public.task_steps
  for delete using (auth.uid() = user_id);

create index task_steps_task_position_idx on public.task_steps (task_id, position);
