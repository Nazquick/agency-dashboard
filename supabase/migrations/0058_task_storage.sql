-- "Storage": a permanent record of tasks that were deleted, so the admin can
-- always look one up. Deleting a task (or a client, which cascades to its
-- tasks) used to destroy the row for good. A BEFORE DELETE trigger now
-- snapshots every task into task_deletions first, however it was deleted.

create table public.task_deletions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  title text not null,
  client_id uuid,
  client_name text,
  -- Full copy of the task row. Null for entries recovered from the activity
  -- log, which only ever recorded the title, who deleted it, and when.
  snapshot jsonb,
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz not null default now()
);

create index task_deletions_deleted_at_idx on public.task_deletions (deleted_at desc);

alter table public.task_deletions enable row level security;

create policy "task_deletions_select_master_key" on public.task_deletions
  for select using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create function public.archive_deleted_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_deletions (task_id, title, client_id, client_name, snapshot, deleted_by)
  values (
    old.id,
    old.title,
    old.client_id,
    (select name from public.clients where id = old.client_id),
    to_jsonb(old),
    auth.uid()
  );
  return old;
end;
$$;

create trigger tasks_archive_before_delete
  before delete on public.tasks
  for each row execute function public.archive_deleted_task();

-- Recover what the activity log knows about tasks deleted before this existed.
insert into public.task_deletions (task_id, title, deleted_by, deleted_at)
select
  entity_id,
  coalesce(substring(summary from '^Deleted task "(.*)"$'), summary),
  actor_id,
  created_at
from public.activity_log
where action = 'task_deleted'
  and entity_id is not null;
