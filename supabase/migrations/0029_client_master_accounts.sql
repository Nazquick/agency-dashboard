-- Client master accounts: a reusable "brand with multiple locations" model.
-- client_groups holds one row per brand (e.g. JØNK); clients.group_id links
-- each location to it; profiles.client_group_id marks a portal account as
-- a master account for that group (instead of profiles.client_id for a
-- single-location account). accessible_client_ids() is the single new
-- helper every client-scoped RLS policy switches to, so a regular account
-- (client_id set) and a master account (client_group_id set) are both
-- handled by the exact same policy clause.
--
-- No function is dropped here (only create-or-replace, same return
-- types) and no CASCADE is needed — each affected policy is individually
-- dropped and recreated with one clause changed. Lower risk than 0028.

create table public.client_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_groups enable row level security;

create policy "client_groups_select_authenticated" on public.client_groups
  for select using (auth.uid() is not null);

create policy "client_groups_insert_master_key" on public.client_groups
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "client_groups_update_master_key" on public.client_groups
  for update using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "client_groups_delete_master_key" on public.client_groups
  for delete using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

alter table public.clients add column group_id uuid references public.client_groups(id);
alter table public.profiles add column client_group_id uuid references public.client_groups(id);

create or replace function public.current_client_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_group_id from public.profiles where id = auth.uid()
$$;

-- Every client_id a profile can see: either their own single client, or
-- every client in their group. OR-ing two comparisons where one side is
-- always null is safe — that branch just never matches, not an error.
create or replace function public.accessible_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clients
  where id = public.current_client_id() or group_id = public.current_client_group_id()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, client_id, client_group_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'role',
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'client_group_id', '')::uuid
  );
  return new;
end;
$$;

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and (select role from public.profiles where id = auth.uid()) <> 'team_leader' then
    raise exception 'Only team leaders can change roles';
  end if;

  if new.role = 'team_leader' and old.role is distinct from new.role
     and (select email from public.profiles where id = auth.uid()) <> 'nasir@thequickstyle.com' then
    raise exception 'Promoting to Team Leader requires approval from nasir@thequickstyle.com';
  end if;

  if new.client_id is distinct from old.client_id
     and (select role from public.profiles where id = auth.uid()) <> 'team_leader' then
    raise exception 'Only team leaders can change client assignment';
  end if;

  if new.client_group_id is distinct from old.client_group_id
     and (select role from public.profiles where id = auth.uid()) <> 'team_leader' then
    raise exception 'Only team leaders can change client group assignment';
  end if;

  return new;
end;
$$;

-- Recreate the 11 client-scoped policies that compared against
-- current_client_id() directly, now via accessible_client_ids().

drop policy "clients_select_authenticated" on public.clients;
create policy "clients_select_authenticated" on public.clients
  for select using (
    public.current_role() <> 'client' or id in (select public.accessible_client_ids())
  );

drop policy "tasks_select_authenticated" on public.tasks;
create policy "tasks_select_authenticated" on public.tasks
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "tasks_insert_authenticated" on public.tasks;
create policy "tasks_insert_authenticated" on public.tasks
  for insert with check (
    auth.uid() is not null
    and (
      public.current_role() <> 'client'
      or client_id in (select public.accessible_client_ids())
    )
  );

drop policy "calendar_events_select_authenticated" on public.calendar_events;
create policy "calendar_events_select_authenticated" on public.calendar_events
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "client_social_accounts_select_authenticated" on public.client_social_accounts;
create policy "client_social_accounts_select_authenticated" on public.client_social_accounts
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "content_assets_select_authenticated" on public.content_assets;
create policy "content_assets_select_authenticated" on public.content_assets
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "content_proofs_select_authenticated" on public.content_proofs;
create policy "content_proofs_select_authenticated" on public.content_proofs
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "client_sales_select_authenticated" on public.client_sales;
create policy "client_sales_select_authenticated" on public.client_sales
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "client_reports_select_authenticated" on public.client_reports;
create policy "client_reports_select_authenticated" on public.client_reports
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

drop policy "client_baselines_select_own_client" on public.client_baselines;
create policy "client_baselines_select_own_client" on public.client_baselines
  for select using (
    public.current_role() = 'client' and client_id in (select public.accessible_client_ids())
  );

drop policy "credit_topups_select_own_client" on public.credit_topups;
create policy "credit_topups_select_own_client" on public.credit_topups
  for select using (
    public.current_role() = 'client' and client_id in (select public.accessible_client_ids())
  );

-- Backfill: group JØNK's 9 locations. DYOR-specific demo data — excluded
-- from the tenant-schema build script (scripts/build-tenant-schema.mjs)
-- via the trailing markers below, so a fresh white-label tenant never gets
-- this seeded.
do $$ -- whitelabel:exclude-line
declare -- whitelabel:exclude-line
  v_group_id uuid; -- whitelabel:exclude-line
begin -- whitelabel:exclude-line
  insert into public.client_groups (name) values ('JØNK') returning id into v_group_id; -- whitelabel:exclude-line
  update public.clients set group_id = v_group_id where name ilike 'JØNK (%'; -- whitelabel:exclude-line
end $$; -- whitelabel:exclude-line
