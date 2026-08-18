-- Ad campaigns per client — budget/spend/ROAS tracking, multi-channel
-- distribution, and a linked table for campaign creative (images/posters),
-- backed by Supabase Storage. Staff-only for now (no client-portal
-- visibility yet — that can follow the same client_id + RLS pattern
-- social_posts uses, in a later phase if wanted).

-- Drives the human-readable "CMP-00001" style code below. A raw sequence
-- (not identity-on-the-column) so the code can be formatted with a prefix
-- and zero-padding via the column default.
create sequence public.campaign_code_seq;

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CMP-' || lpad(nextval('public.campaign_code_seq')::text, 5, '0')),
  client_id uuid not null references public.clients(id),
  name text not null,
  budget numeric(12, 2),
  ad_spend numeric(12, 2),
  roas numeric(10, 2),
  boost_location text,
  -- Free-form array (not CHECK-constrained) so new channels don't need a
  -- migration — validated against a constants list at the app layer,
  -- same convention as everywhere else options are UI-driven, not DB-enum.
  distribution_channels text[] not null default '{}',
  publication_date date,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_client_id_idx on public.campaigns(client_id);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.campaign_attachments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index campaign_attachments_campaign_id_idx on public.campaign_attachments(campaign_id);

alter table public.campaigns enable row level security;
alter table public.campaign_attachments enable row level security;

create policy "campaigns_select_staff" on public.campaigns
  for select using (public.current_role() <> 'client');

create policy "campaigns_insert_staff" on public.campaigns
  for insert with check (public.current_role() <> 'client');

create policy "campaigns_update_staff" on public.campaigns
  for update using (public.current_role() <> 'client');

create policy "campaigns_delete_leader_only" on public.campaigns
  for delete using (public.current_role() = 'team_leader');

create policy "campaign_attachments_select_staff" on public.campaign_attachments
  for select using (public.current_role() <> 'client');

create policy "campaign_attachments_insert_staff" on public.campaign_attachments
  for insert with check (public.current_role() <> 'client' and auth.uid() is not null);

create policy "campaign_attachments_delete" on public.campaign_attachments
  for delete using (uploaded_by = auth.uid() or public.current_role() = 'team_leader');

insert into storage.buckets (id, name, public, file_size_limit)
values ('campaign-attachments', 'campaign-attachments', false, 52428800);

create policy "campaign_attachments_storage_select" on storage.objects
  for select using (
    bucket_id = 'campaign-attachments' and public.current_role() <> 'client'
  );

create policy "campaign_attachments_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'campaign-attachments' and public.current_role() <> 'client'
  );

create policy "campaign_attachments_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'campaign-attachments'
    and (owner = auth.uid() or public.current_role() = 'team_leader')
  );

alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.campaign_attachments;
