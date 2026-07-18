-- Phase 1: profiles, clients, client_contacts, client_files, storage, RLS

create extension if not exists pgcrypto;

create type user_role as enum (
  'editor_designer',
  'videographer_photographer',
  'social_media_manager',
  'team_leader'
);

-- profiles ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_own_or_leader" on public.profiles
  for update using (
    auth.uid() = id
    or (select role from public.profiles where id = auth.uid()) = 'team_leader'
  );

-- auto-create a profile row when a new auth user signs up, reading
-- full_name/role from the signup form's user_metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    (new.raw_user_meta_data->>'role')::user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- role helper, usable once profiles exists ----------------------------

create or replace function public.current_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- clients ---------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles(id),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "clients_select_authenticated" on public.clients
  for select using (auth.uid() is not null);

create policy "clients_insert_leader" on public.clients
  for insert with check (public.current_role() = 'team_leader');

create policy "clients_update_leader" on public.clients
  for update using (public.current_role() = 'team_leader');

create policy "clients_delete_leader" on public.clients
  for delete using (public.current_role() = 'team_leader');

-- client_contacts --------------------------------------------------------

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.client_contacts enable row level security;

create policy "client_contacts_select_authenticated" on public.client_contacts
  for select using (auth.uid() is not null);

create policy "client_contacts_insert_leader" on public.client_contacts
  for insert with check (public.current_role() = 'team_leader');

create policy "client_contacts_update_leader" on public.client_contacts
  for update using (public.current_role() = 'team_leader');

create policy "client_contacts_delete_leader" on public.client_contacts
  for delete using (public.current_role() = 'team_leader');

-- client_files -------------------------------------------------------------

create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  file_type text not null check (file_type in ('graphic_pack', 'onboarding', 'brand_guide', 'other')),
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_files enable row level security;

create policy "client_files_select_authenticated" on public.client_files
  for select using (auth.uid() is not null);

create policy "client_files_insert_leader" on public.client_files
  for insert with check (public.current_role() = 'team_leader');

create policy "client_files_update_leader" on public.client_files
  for update using (public.current_role() = 'team_leader');

create policy "client_files_delete_leader" on public.client_files
  for delete using (public.current_role() = 'team_leader');

-- storage: single bucket, folders {client_id}/{file_type}/{filename} -------

insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do nothing;

create policy "client_assets_select_authenticated" on storage.objects
  for select using (bucket_id = 'client-assets' and auth.uid() is not null);

create policy "client_assets_insert_leader" on storage.objects
  for insert with check (bucket_id = 'client-assets' and public.current_role() = 'team_leader');

create policy "client_assets_update_leader" on storage.objects
  for update using (bucket_id = 'client-assets' and public.current_role() = 'team_leader');

create policy "client_assets_delete_leader" on storage.objects
  for delete using (bucket_id = 'client-assets' and public.current_role() = 'team_leader');

-- indexes --------------------------------------------------------------

create index client_contacts_client_id_idx on public.client_contacts(client_id);
create index client_files_client_id_idx on public.client_files(client_id);
