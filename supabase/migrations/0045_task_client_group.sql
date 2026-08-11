-- A "{Group} (ALL)" task is now a single row fulfilled by one location
-- (chosen by available credit, see app/api/tasks/pick-group-client), not
-- a copy created at every location in the group. client_group_id marks a
-- task as belonging to the whole group for display purposes ("JØNK
-- (ALL)" in the Pipeline) while client_id still points at the one
-- location actually doing the work, so credit/quota tracking and portal
-- visibility are unaffected.
alter table public.tasks
  add column client_group_id uuid references public.client_groups(id);
