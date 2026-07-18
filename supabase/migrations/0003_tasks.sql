-- Phase 2: Action Pipeline (tasks)

create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('not_started', 'in_progress', 'blocked', 'review', 'done');
create type task_source as enum ('manual', 'email');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  description text,
  task_type text,
  assignee_id uuid references public.profiles(id),
  deadline timestamptz,
  priority task_priority not null default 'medium',
  status task_status not null default 'not_started',
  ai_estimated_minutes integer,
  ai_estimate_status text check (ai_estimate_status in ('pending', 'done', 'failed')),
  source task_source not null default 'manual',
  source_email_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "tasks_select_authenticated" on public.tasks
  for select using (auth.uid() is not null);

create policy "tasks_insert_authenticated" on public.tasks
  for insert with check (auth.uid() is not null);

create policy "tasks_update_own_or_leader" on public.tasks
  for update using (
    public.current_role() = 'team_leader' or assignee_id = auth.uid()
  );

create policy "tasks_delete_leader_only" on public.tasks
  for delete using (public.current_role() = 'team_leader');

create index tasks_assignee_status_idx on public.tasks(assignee_id, status);
create index tasks_client_id_idx on public.tasks(client_id);

alter publication supabase_realtime add table public.tasks;
