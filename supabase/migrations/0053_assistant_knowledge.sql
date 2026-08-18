-- Standing knowledge the assistant has been "taught" by the admin during
-- conversation (via its remember_fact tool) — readable by every staff
-- member so the whole team's assistant benefits, but only the admin can
-- add to or remove from it.

create table public.assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.assistant_knowledge enable row level security;

create policy "assistant_knowledge_select_staff" on public.assistant_knowledge
  for select using (public.current_role() <> 'client');

create policy "assistant_knowledge_insert_master_key" on public.assistant_knowledge
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "assistant_knowledge_delete_master_key" on public.assistant_knowledge
  for delete using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );
