-- Admin-only vault of client platform logins (Instagram, Meta Business
-- Suite, Google Ads, etc.) — master-key only, same RLS shape as
-- company_transactions. Not encrypted at rest, same security model as the
-- rest of this admin panel's sensitive data (salaries, finances): gated
-- entirely by RLS + master-key checks, not field-level encryption.

create table public.client_credentials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null,
  login text not null,
  password text not null,
  auth_code text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_credentials_client_id_idx on public.client_credentials(client_id);

create trigger client_credentials_set_updated_at
  before update on public.client_credentials
  for each row execute function public.set_updated_at();

alter table public.client_credentials enable row level security;

create policy "client_credentials_all_master_key" on public.client_credentials
  for all using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );
