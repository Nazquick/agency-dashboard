-- whitelabel:exclude-file
-- Control plane for the white-label onboarding feature: DYOR-generated
-- invite links and the resulting tenant directory. Lives in DYOR's own
-- Supabase project only — never replayed into a tenant's fresh project
-- (the leading marker above tells scripts/build-tenant-schema.mjs to skip
-- this whole file). Deliberately holds NO service-role-key or DB-password
-- column for any tenant — that credential is used once, transiently, in
-- the provisioning route and is never written to a table.

create table public.whitelabel_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  label text,
  status text not null default 'pending' check (status in ('pending', 'used', 'revoked', 'expired')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_at timestamptz,
  tenant_id uuid
);

create table public.whitelabel_tenants (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.whitelabel_invites(id),
  business_name text not null,
  contact_name text,
  contact_email text not null,
  logo_url text,
  layout_variant text not null default 'top-nav'
    check (layout_variant in ('top-nav', 'sidebar', 'compact', 'minimal')),
  brand_primary_color text,
  supabase_url text not null,
  supabase_anon_key text not null,
  vercel_deploy_url text,
  custom_domain text,
  app_url text,
  dyor_admin_seeded boolean not null default false,
  tenant_admin_seeded boolean not null default false,
  status text not null default 'provisioning' check (status in ('provisioning', 'seeded', 'live', 'failed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whitelabel_invites
  add constraint whitelabel_invites_tenant_id_fkey
  foreign key (tenant_id) references public.whitelabel_tenants(id);

create trigger whitelabel_tenants_set_updated_at
  before update on public.whitelabel_tenants
  for each row execute function public.set_updated_at();

alter table public.whitelabel_invites enable row level security;
alter table public.whitelabel_tenants enable row level security;

-- Master-key only, same shape as client_credentials_all_master_key
-- (0031). No anon/public policy on either table — the public
-- /onboard/[token] route always goes through the service-role admin
-- client after validating the token itself server-side.
create policy "whitelabel_invites_all_master_key" on public.whitelabel_invites
  for all using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "whitelabel_tenants_all_master_key" on public.whitelabel_tenants
  for all using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

-- Public bucket for tenant logos — all writes go through the admin client
-- in the onboarding logo-upload route (no client-side insert policy
-- needed); public read so the resulting URL is hotlinkable from a
-- tenant's own deployed dashboard.
insert into storage.buckets (id, name, public)
values ('whitelabel-logos', 'whitelabel-logos', true)
on conflict (id) do nothing;
