-- Periodic full performance report per client (social metrics, campaign
-- sales, ad spend, content output) — filled out by hand, e.g. by the social
-- media manager, from each platform's own dashboard.

create table public.client_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  report_date date not null default current_date,

  instagram_views integer,
  instagram_comments integer,
  instagram_likes integer,

  tiktok_views integer,
  tiktok_comments integer,
  tiktok_likes integer,

  facebook_views integer,
  facebook_comments integer,
  facebook_likes integer,

  snapchat_views integer,
  snapchat_comments integer,
  snapchat_likes integer,

  campaign_name text,
  campaign_sales numeric(12, 2),
  roas numeric(8, 2),
  ad_spend numeric(12, 2),
  app_downloads integer,
  sales_percent numeric(6, 2),
  content_count integer,
  content_type text,

  submitted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_reports enable row level security;

create policy "client_reports_select_authenticated" on public.client_reports
  for select using (auth.uid() is not null);

create policy "client_reports_insert_own" on public.client_reports
  for insert with check (auth.uid() is not null and submitted_by = auth.uid());

create policy "client_reports_update_leader" on public.client_reports
  for update using (public.current_role() = 'team_leader');

create policy "client_reports_delete_leader" on public.client_reports
  for delete using (public.current_role() = 'team_leader');

create index client_reports_client_id_idx on public.client_reports(client_id);
