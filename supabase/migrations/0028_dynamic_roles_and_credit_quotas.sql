-- Three related changes:
-- 1. Convert profiles.role / role_change_requests.requested_role from the
--    fixed user_role enum to text + a new roles table, so Nasir can add a
--    new role at member-creation time and have it show up in future
--    dropdowns. Every RLS policy that reads current_role() compares it
--    against string literals ('team_leader', 'client', ...), so switching
--    the function's return type to text is behaviorally identical — but
--    changing current_role()'s return type requires dropping it first,
--    which (per Postgres) requires CASCADE-dropping the ~50 policies that
--    call it. This migration drops them via CASCADE and recreates every
--    one immediately after with byte-for-byte identical logic, all inside
--    one transaction — if anything below is wrong the whole migration
--    rolls back and nothing in production changes.
-- 2. Replace the count-based monthly/quarterly task quota with a single
--    credit-weighted monthly allowance (8 credits/month; quarterly is
--    dropped). clients.monthly_task_limit becomes monthly_credit_limit,
--    quarterly_task_limit is dropped, and clients.monthly_fee is added so
--    a credit top-up's 50%-of-monthly-fee charge can be computed.
-- 3. credit_topups: one row per client per calendar month, recording an
--    approved credit doubling and its charge — written only by the
--    server-side top-up route (service role), never directly by clients.

drop function public.current_role() cascade;

alter table public.profiles alter column role type text using role::text;
alter table public.role_change_requests alter column requested_role type text using requested_role::text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, client_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    new.raw_user_meta_data->>'role',
    nullif(new.raw_user_meta_data->>'client_id', '')::uuid
  );
  return new;
end;
$$;

create function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.current_role() from public, anon;

drop type public.user_role;

-- Recreate every policy CASCADE just dropped, identical logic, text-typed. --

create policy "clients_update_leader" on public.clients
  for update using (public.current_role() = 'team_leader');
create policy "clients_delete_leader" on public.clients
  for delete using (public.current_role() = 'team_leader');
create policy "clients_select_authenticated" on public.clients
  for select using (public.current_role() <> 'client' or id = public.current_client_id());

create policy "client_contacts_insert_leader" on public.client_contacts
  for insert with check (public.current_role() = 'team_leader');
create policy "client_contacts_update_leader" on public.client_contacts
  for update using (public.current_role() = 'team_leader');
create policy "client_contacts_delete_leader" on public.client_contacts
  for delete using (public.current_role() = 'team_leader');

create policy "client_files_insert_leader" on public.client_files
  for insert with check (public.current_role() = 'team_leader');
create policy "client_files_update_leader" on public.client_files
  for update using (public.current_role() = 'team_leader');
create policy "client_files_delete_leader" on public.client_files
  for delete using (public.current_role() = 'team_leader');

create policy "client_assets_insert_leader" on storage.objects
  for insert with check (bucket_id = 'client-assets' and public.current_role() = 'team_leader');
create policy "client_assets_update_leader" on storage.objects
  for update using (bucket_id = 'client-assets' and public.current_role() = 'team_leader');
create policy "client_assets_delete_leader" on storage.objects
  for delete using (bucket_id = 'client-assets' and public.current_role() = 'team_leader');

create policy "tasks_update_own_or_leader" on public.tasks
  for update using (public.current_role() = 'team_leader' or assignee_id = auth.uid());
create policy "tasks_delete_leader_only" on public.tasks
  for delete using (public.current_role() = 'team_leader');
create policy "tasks_select_authenticated" on public.tasks
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());
create policy "tasks_insert_authenticated" on public.tasks
  for insert with check (
    auth.uid() is not null
    and (public.current_role() <> 'client' or client_id = public.current_client_id())
  );

create policy "calendar_events_insert_own_or_leader" on public.calendar_events
  for insert with check (public.current_role() = 'team_leader' or assignee_id = auth.uid());
create policy "calendar_events_update_own_or_leader" on public.calendar_events
  for update using (public.current_role() = 'team_leader' or assignee_id = auth.uid());
create policy "calendar_events_delete_own_or_leader" on public.calendar_events
  for delete using (public.current_role() = 'team_leader' or assignee_id = auth.uid());
create policy "calendar_events_select_authenticated" on public.calendar_events
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());

create policy "client_social_accounts_insert_leader" on public.client_social_accounts
  for insert with check (public.current_role() = 'team_leader');
create policy "client_social_accounts_update_leader" on public.client_social_accounts
  for update using (public.current_role() = 'team_leader');
create policy "client_social_accounts_delete_leader" on public.client_social_accounts
  for delete using (public.current_role() = 'team_leader');
create policy "client_social_accounts_select_authenticated" on public.client_social_accounts
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());

create policy "content_assets_delete_leader" on public.content_assets
  for delete using (public.current_role() = 'team_leader');
create policy "content_assets_select_authenticated" on public.content_assets
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());

create policy "task_templates_insert_leader" on public.task_templates
  for insert with check (public.current_role() = 'team_leader');
create policy "task_templates_update_leader" on public.task_templates
  for update using (public.current_role() = 'team_leader');
create policy "task_templates_delete_leader" on public.task_templates
  for delete using (public.current_role() = 'team_leader');

create policy "task_template_steps_insert_leader" on public.task_template_steps
  for insert with check (public.current_role() = 'team_leader');
create policy "task_template_steps_update_leader" on public.task_template_steps
  for update using (public.current_role() = 'team_leader');
create policy "task_template_steps_delete_leader" on public.task_template_steps
  for delete using (public.current_role() = 'team_leader');

create policy "task_steps_delete_leader_or_owner" on public.task_steps
  for delete using (
    public.current_role() = 'team_leader'
    or exists (
      select 1 from public.tasks t
      where t.id = task_steps.task_id and t.assignee_id = auth.uid()
    )
  );

create policy "meetup_proposals_update_leader_or_proposer" on public.meetup_proposals
  for update using (public.current_role() = 'team_leader' or proposed_by = auth.uid());
create policy "meetup_proposals_delete_leader_or_proposer" on public.meetup_proposals
  for delete using (public.current_role() = 'team_leader' or proposed_by = auth.uid());

create policy "meetup_responses_update_own_or_leader" on public.meetup_responses
  for update using (public.current_role() = 'team_leader' or profile_id = auth.uid());
create policy "meetup_responses_delete_leader" on public.meetup_responses
  for delete using (public.current_role() = 'team_leader');

create policy "role_change_requests_select_leader" on public.role_change_requests
  for select using (public.current_role() = 'team_leader');
create policy "role_change_requests_insert_leader" on public.role_change_requests
  for insert with check (public.current_role() = 'team_leader' and requested_by = auth.uid());

create policy "content_proofs_delete_own_or_leader" on public.content_proofs
  for delete using (reported_by = auth.uid() or public.current_role() = 'team_leader');
create policy "content_proofs_select_authenticated" on public.content_proofs
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());

create policy "client_sales_update_leader" on public.client_sales
  for update using (public.current_role() = 'team_leader');
create policy "client_sales_delete_leader" on public.client_sales
  for delete using (public.current_role() = 'team_leader');
create policy "client_sales_select_authenticated" on public.client_sales
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());

create policy "client_reports_update_leader" on public.client_reports
  for update using (public.current_role() = 'team_leader');
create policy "client_reports_delete_leader" on public.client_reports
  for delete using (public.current_role() = 'team_leader');
create policy "client_reports_select_authenticated" on public.client_reports
  for select using (public.current_role() <> 'client' or client_id = public.current_client_id());

create policy "profiles_select_authenticated" on public.profiles
  for select using (public.current_role() <> 'client' or id = auth.uid());

create policy "client_baselines_select_leader" on public.client_baselines
  for select using (public.current_role() = 'team_leader');
create policy "client_baselines_select_own_client" on public.client_baselines
  for select using (public.current_role() = 'client' and client_id = public.current_client_id());
create policy "client_baselines_insert_leader" on public.client_baselines
  for insert with check (public.current_role() = 'team_leader');
create policy "client_baselines_update_leader" on public.client_baselines
  for update using (public.current_role() = 'team_leader');

-- roles -----------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  value text unique not null,
  label text not null,
  assignable boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

insert into public.roles (value, label, assignable, is_system) values
  ('team_leader', 'Team Leader', true, true),
  ('editor_designer', 'Editor / Graphic Designer', true, true),
  ('videographer_photographer', 'Videographer / Photographer', true, true),
  ('social_media_manager', 'Social Media Manager', true, true),
  ('client', 'Client', false, true);

alter table public.profiles
  add constraint profiles_role_fkey foreign key (role) references public.roles(value);

alter table public.role_change_requests
  add constraint role_change_requests_requested_role_fkey foreign key (requested_role) references public.roles(value);

alter table public.roles enable row level security;

create policy "roles_select_authenticated" on public.roles
  for select using (auth.uid() is not null);

create policy "roles_insert_master_key" on public.roles
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

-- client credit quota -----------------------------------------------------

alter table public.clients rename column monthly_task_limit to monthly_credit_limit;
alter table public.clients alter column monthly_credit_limit set default 8;
update public.clients set monthly_credit_limit = 8;
alter table public.clients drop column quarterly_task_limit;
alter table public.clients add column monthly_fee numeric(10, 2);

create table public.credit_topups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  credits_added integer not null,
  charge_amount numeric(10, 2) not null,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index credit_topups_one_per_client_period
  on public.credit_topups(client_id, period_start);

alter table public.credit_topups enable row level security;

create policy "credit_topups_select_leader" on public.credit_topups
  for select using (public.current_role() = 'team_leader');

create policy "credit_topups_select_own_client" on public.credit_topups
  for select using (
    public.current_role() = 'client' and client_id = public.current_client_id()
  );
