-- The task steps editor lets the task's own assignee (not just a leader)
-- remove steps while editing their task, matching the leader-or-owner
-- pattern already used for updates on tasks/calendar_events.

drop policy "task_steps_delete_leader" on public.task_steps;

create policy "task_steps_delete_leader_or_owner" on public.task_steps
  for delete using (
    public.current_role() = 'team_leader'
    or exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id and t.assignee_id = auth.uid()
    )
  );
