-- Any staff member (not just the leader, the assignee, or a co-assignee)
-- should be able to edit any task — the assignment is a work-routing
-- signal, not an access boundary. Deletion stays leader-only via the
-- existing tasks_delete_leader_only policy; this only loosens UPDATE,
-- and mirrors tasks_select_authenticated's own staff-vs-client split so
-- clients still get no direct update access through this policy.

drop policy "tasks_update_own_or_leader" on public.tasks;

create policy "tasks_update_staff" on public.tasks
  for update using (public.current_role() <> 'client');
