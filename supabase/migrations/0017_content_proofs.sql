-- Quick "I just posted this" reporting from the Clients page — a link is
-- required as proof, so there's no free-text/no-evidence path to log one.

create type content_proof_type as enum ('video', 'image', 'graphic', 'collab');

create table public.content_proofs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type content_proof_type not null,
  link text not null,
  reported_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.content_proofs enable row level security;

create policy "content_proofs_select_authenticated" on public.content_proofs
  for select using (auth.uid() is not null);

create policy "content_proofs_insert_own" on public.content_proofs
  for insert with check (auth.uid() is not null and reported_by = auth.uid());

create policy "content_proofs_delete_own_or_leader" on public.content_proofs
  for delete using (
    reported_by = auth.uid() or public.current_role() = 'team_leader'
  );

create index content_proofs_client_id_idx on public.content_proofs(client_id);
