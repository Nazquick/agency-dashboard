-- Phase 3: calendar_events (shared per-person calendar, source of truth for conflicts)

create type event_type as enum ('meeting', 'shoot', 'deadline', 'deliverable', 'other');

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  assignee_id uuid not null references public.profiles(id),
  title text not null,
  event_type event_type not null default 'other',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint calendar_events_valid_range check (ends_at > starts_at)
);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_authenticated" on public.calendar_events
  for select using (auth.uid() is not null);

create policy "calendar_events_insert_own_or_leader" on public.calendar_events
  for insert with check (
    public.current_role() = 'team_leader' or assignee_id = auth.uid()
  );

create policy "calendar_events_update_own_or_leader" on public.calendar_events
  for update using (
    public.current_role() = 'team_leader' or assignee_id = auth.uid()
  );

create policy "calendar_events_delete_own_or_leader" on public.calendar_events
  for delete using (
    public.current_role() = 'team_leader' or assignee_id = auth.uid()
  );

create index calendar_events_assignee_range_idx on public.calendar_events(assignee_id, starts_at, ends_at);
create index calendar_events_client_id_idx on public.calendar_events(client_id);
