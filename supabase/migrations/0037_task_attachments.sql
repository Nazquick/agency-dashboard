-- File attachments on tasks — any team member or the owning client can
-- attach a file (reference material, a graphic element to include, or
-- finished work), capped at 50MB per file by the storage bucket itself.
-- Access mirrors tasks' own visibility rule exactly (staff see everything,
-- clients only their own accessible tasks) via a shared helper function so
-- both the table and the storage bucket enforce the same boundary.

create or replace function public.can_access_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and (public.current_role() <> 'client' or t.client_id in (select public.accessible_client_ids()))
  )
$$;

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  category text not null check (category in ('reference', 'graphic_element', 'finished_work')),
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index task_attachments_task_id_idx on public.task_attachments(task_id);

alter table public.task_attachments enable row level security;

create policy "task_attachments_select" on public.task_attachments
  for select using (public.can_access_task(task_id));

create policy "task_attachments_insert" on public.task_attachments
  for insert with check (auth.uid() is not null and public.can_access_task(task_id));

-- Uploader can remove their own file; a leader can moderate any of them.
create policy "task_attachments_delete" on public.task_attachments
  for delete using (uploaded_by = auth.uid() or public.current_role() = 'team_leader');

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 52428800);

-- Path convention: {task_id}/{category}/{timestamp}-{filename} — lets the
-- storage policies below parse the task id straight out of the path via
-- storage.foldername() and defer to the same can_access_task() check.
create policy "task_attachments_storage_select" on storage.objects
  for select using (
    bucket_id = 'task-attachments'
    and public.can_access_task((storage.foldername(name))[1]::uuid)
  );

create policy "task_attachments_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'task-attachments'
    and public.can_access_task((storage.foldername(name))[1]::uuid)
  );

create policy "task_attachments_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'task-attachments'
    and (owner = auth.uid() or public.current_role() = 'team_leader')
  );

alter publication supabase_realtime add table public.task_attachments;
