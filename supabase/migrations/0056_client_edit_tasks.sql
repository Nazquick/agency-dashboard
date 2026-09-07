-- Lets a client edit or remove a task from their own portal pipeline —
-- but only before it's done (once staff mark something done, it's locked
-- from the client's side), and only for their own accessible clients.
-- "Remove" is implemented as archiving (tasks.archived = true), not a
-- real DELETE — reversible by staff, consistent with how archiving
-- already works elsewhere, and avoids granting a destructive DELETE
-- policy to a client role. Added alongside the existing tasks_update_staff
-- policy (RLS policies for the same command are OR'd together), so staff
-- access is unaffected.

create policy "tasks_update_client_own_not_done" on public.tasks
  for update using (
    public.current_role() = 'client'
    and client_id in (select public.accessible_client_ids())
    and status <> 'done'
  ) with check (
    client_id in (select public.accessible_client_ids())
  );
