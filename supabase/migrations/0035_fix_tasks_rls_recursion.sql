-- tasks_update_own_or_leader (added in 0033) checks task_assignees inline,
-- and task_assignees' own select policy checks back into tasks — a genuine
-- two-table RLS cycle that trips Postgres's recursion guard on any UPDATE
-- to tasks ("infinite recursion detected in policy for relation tasks").
-- Same fix already used everywhere else in this schema for this exact
-- problem (current_role, current_client_id, accessible_client_ids): wrap
-- the cross-table check in a security definer function, which — like
-- those — runs as the table owner and so isn't itself subject to
-- task_assignees' RLS, breaking the cycle.

create or replace function public.is_task_assignee(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.task_assignees
    where task_id = p_task_id and profile_id = auth.uid()
  )
$$;

drop policy "tasks_update_own_or_leader" on public.tasks;
create policy "tasks_update_own_or_leader" on public.tasks
  for update using (
    public.current_role() = 'team_leader'
    or assignee_id = auth.uid()
    or public.is_task_assignee(id)
  );
