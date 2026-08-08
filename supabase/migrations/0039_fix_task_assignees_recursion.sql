-- task_assignees_delete_own_or_leader queried task_assignees from inside
-- its own DELETE policy (EXISTS ... FROM task_assignees ta2 ...), tripping
-- Postgres's RLS recursion guard ("infinite recursion detected in policy
-- for relation task_assignees") on every save in TaskForm, since it always
-- deletes-then-reinserts task_assignees for an existing task. Same failure
-- class as 0035, just on this table instead of tasks — same fix: defer to
-- the existing is_task_assignee() security definer helper, which runs as
-- the table owner and so isn't itself subject to this table's RLS.
--
-- Also widen both this policy and task_steps' delete policy from
-- "leader or the single owner" to "any staff member", matching
-- tasks_update_staff (0038) — a member editing someone else's task needs
-- to be able to replace its steps and assignees too, not just its fields.

drop policy "task_assignees_delete_own_or_leader" on public.task_assignees;

create policy "task_assignees_delete_staff" on public.task_assignees
  for delete using (public.current_role() <> 'client');

drop policy "task_steps_delete_leader_or_owner" on public.task_steps;

create policy "task_steps_delete_staff" on public.task_steps
  for delete using (public.current_role() <> 'client');
