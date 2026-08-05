-- Multiple assignees per task. tasks.assignee_id stays populated as the
-- "primary" assignee (first person chosen) so every existing single-assignee
-- consumer (calendar sync, quota, AI auto-assign, salary/workload role
-- counts) keeps working unchanged; task_assignees is the full list and is
-- always a superset that includes the primary.

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, profile_id)
);

create index task_assignees_profile_id_idx on public.task_assignees(profile_id);

alter table public.task_assignees enable row level security;

create policy "task_assignees_select_authenticated" on public.task_assignees
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id
        and (public.current_role() <> 'client' or t.client_id in (select public.accessible_client_ids()))
    )
  );

create policy "task_assignees_insert_team" on public.task_assignees
  for insert with check (public.current_role() <> 'client');

create policy "task_assignees_delete_own_or_leader" on public.task_assignees
  for delete using (
    public.current_role() = 'team_leader'
    or exists (
      select 1 from public.task_assignees ta2
      where ta2.task_id = task_assignees.task_id and ta2.profile_id = auth.uid()
    )
  );

-- Backfill: every task that already has a primary assignee gets a matching row.
insert into public.task_assignees (task_id, profile_id)
select id, assignee_id from public.tasks where assignee_id is not null
on conflict do nothing;

-- A secondary (non-primary) assignee should be able to update task status
-- too, same as the primary assignee already could.
drop policy "tasks_update_own_or_leader" on public.tasks;
create policy "tasks_update_own_or_leader" on public.tasks
  for update using (
    public.current_role() = 'team_leader'
    or assignee_id = auth.uid()
    or exists (
      select 1 from public.task_assignees ta
      where ta.task_id = tasks.id and ta.profile_id = auth.uid()
    )
  );
