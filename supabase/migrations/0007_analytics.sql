-- Analytics & Data: client social accounts, manually-logged content metrics,
-- and a per-client monthly task allowance.

create type social_platform as enum (
  'instagram', 'tiktok', 'youtube', 'facebook', 'twitter_x', 'linkedin', 'other'
);

create type content_asset_type as enum (
  'post', 'reel', 'video', 'story', 'carousel', 'other'
);

alter table public.clients add column monthly_task_limit integer;

create table public.client_social_accounts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform social_platform not null,
  handle text not null,
  url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_social_accounts enable row level security;

create policy "client_social_accounts_select_authenticated" on public.client_social_accounts
  for select using (auth.uid() is not null);

create policy "client_social_accounts_insert_leader" on public.client_social_accounts
  for insert with check (public.current_role() = 'team_leader');

create policy "client_social_accounts_update_leader" on public.client_social_accounts
  for update using (public.current_role() = 'team_leader');

create policy "client_social_accounts_delete_leader" on public.client_social_accounts
  for delete using (public.current_role() = 'team_leader');

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  social_account_id uuid not null references public.client_social_accounts(id) on delete cascade,
  title text not null,
  asset_type content_asset_type not null default 'post',
  published_at timestamptz,
  url text,
  views integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_assets_set_updated_at
  before update on public.content_assets
  for each row execute function public.set_updated_at();

alter table public.content_assets enable row level security;

create policy "content_assets_select_authenticated" on public.content_assets
  for select using (auth.uid() is not null);

create policy "content_assets_insert_authenticated" on public.content_assets
  for insert with check (auth.uid() is not null);

create policy "content_assets_update_authenticated" on public.content_assets
  for update using (auth.uid() is not null);

create policy "content_assets_delete_leader" on public.content_assets
  for delete using (public.current_role() = 'team_leader');

create index client_social_accounts_client_id_idx on public.client_social_accounts(client_id);
create index content_assets_client_id_idx on public.content_assets(client_id);
create index content_assets_social_account_id_idx on public.content_assets(social_account_id);
