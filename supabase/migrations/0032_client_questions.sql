-- Client Q&A: clients ask questions from the portal, any team member can
-- answer. Mirrors client_reports' RLS shape: clients see/insert only their
-- own (accessible_client_ids()-scoped) questions and can't set the answer
-- fields themselves; team members see everything and are the only ones who
-- can answer (update) or delete.

create table public.client_questions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  asked_by uuid references public.profiles(id),
  question text not null,
  answer text,
  answered_by uuid references public.profiles(id),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_questions_client_id_idx on public.client_questions(client_id);
create index client_questions_unanswered_idx on public.client_questions(answered_at) where answered_at is null;

create trigger client_questions_set_updated_at
  before update on public.client_questions
  for each row execute function public.set_updated_at();

alter table public.client_questions enable row level security;

create policy "client_questions_select_authenticated" on public.client_questions
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

create policy "client_questions_insert_client" on public.client_questions
  for insert with check (
    public.current_role() = 'client'
    and client_id in (select public.accessible_client_ids())
    and asked_by = auth.uid()
    and answer is null
    and answered_by is null
    and answered_at is null
  );

create policy "client_questions_update_team" on public.client_questions
  for update using (public.current_role() <> 'client')
  with check (public.current_role() <> 'client');

create policy "client_questions_delete_leader" on public.client_questions
  for delete using (public.current_role() = 'team_leader');
