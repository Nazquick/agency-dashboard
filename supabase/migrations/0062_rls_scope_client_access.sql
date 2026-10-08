-- Client-portal logins (role = 'client') could read other clients' contacts,
-- every task's internal steps, group names, internal meetups and templates,
-- and every client's files in storage, and could insert/update sales, content
-- assets, reports and proofs for any client. Scope all of it to staff, or to
-- the client's own data via accessible_client_ids().

-- Reads scoped to staff-or-own-client ---------------------------------------
drop policy "client_contacts_select_authenticated" on public.client_contacts;
create policy "client_contacts_select_scoped" on public.client_contacts
  for select using (
    (select public.current_role()) <> 'client'
    or client_id in (select public.accessible_client_ids())
  );

drop policy "client_files_select_authenticated" on public.client_files;
create policy "client_files_select_scoped" on public.client_files
  for select using (
    (select public.current_role()) <> 'client'
    or client_id in (select public.accessible_client_ids())
  );

drop policy "client_groups_select_authenticated" on public.client_groups;
create policy "client_groups_select_scoped" on public.client_groups
  for select using (
    (select public.current_role()) <> 'client'
    or id = (select public.current_client_group_id())
    or id in (
      select group_id from public.clients
      where group_id is not null and id in (select public.accessible_client_ids())
    )
  );

-- Staff-only internals --------------------------------------------------------
drop policy "meetup_proposals_select_authenticated" on public.meetup_proposals;
create policy "meetup_proposals_select_staff" on public.meetup_proposals
  for select using ((select public.current_role()) <> 'client');

drop policy "meetup_proposals_insert_authenticated" on public.meetup_proposals;
create policy "meetup_proposals_insert_staff" on public.meetup_proposals
  for insert with check ((select public.current_role()) <> 'client');

drop policy "meetup_responses_select_authenticated" on public.meetup_responses;
create policy "meetup_responses_select_staff" on public.meetup_responses
  for select using ((select public.current_role()) <> 'client');

drop policy "meetup_responses_insert_authenticated" on public.meetup_responses;
create policy "meetup_responses_insert_staff" on public.meetup_responses
  for insert with check ((select public.current_role()) <> 'client');

drop policy "task_steps_select_authenticated" on public.task_steps;
create policy "task_steps_select_staff" on public.task_steps
  for select using ((select public.current_role()) <> 'client');

drop policy "task_steps_insert_authenticated" on public.task_steps;
create policy "task_steps_insert_staff" on public.task_steps
  for insert with check ((select public.current_role()) <> 'client');

drop policy "task_steps_update_authenticated" on public.task_steps;
create policy "task_steps_update_staff" on public.task_steps
  for update using ((select public.current_role()) <> 'client');

drop policy "task_templates_select_authenticated" on public.task_templates;
create policy "task_templates_select_staff" on public.task_templates
  for select using ((select public.current_role()) <> 'client');

drop policy "task_template_steps_select_authenticated" on public.task_template_steps;
create policy "task_template_steps_select_staff" on public.task_template_steps
  for select using ((select public.current_role()) <> 'client');

-- Writes that must not be open to client logins -----------------------------
drop policy "client_sales_insert_authenticated" on public.client_sales;
create policy "client_sales_insert_staff" on public.client_sales
  for insert with check ((select public.current_role()) <> 'client');

drop policy "content_assets_insert_authenticated" on public.content_assets;
create policy "content_assets_insert_staff" on public.content_assets
  for insert with check ((select public.current_role()) <> 'client');

drop policy "content_assets_update_authenticated" on public.content_assets;
create policy "content_assets_update_staff" on public.content_assets
  for update using ((select public.current_role()) <> 'client');

drop policy "client_reports_insert_own" on public.client_reports;
create policy "client_reports_insert_staff" on public.client_reports
  for insert with check (
    submitted_by = auth.uid() and (select public.current_role()) <> 'client'
  );

drop policy "content_proofs_insert_own" on public.content_proofs;
create policy "content_proofs_insert_staff" on public.content_proofs
  for insert with check (
    reported_by = auth.uid() and (select public.current_role()) <> 'client'
  );

-- Storage: client-assets was readable by every logged-in user ---------------
drop policy "client_assets_select_authenticated" on storage.objects;
create policy "client_assets_select_scoped" on storage.objects
  for select using (
    bucket_id = 'client-assets'
    and (
      (select public.current_role()) <> 'client'
      or (storage.foldername(name))[1] in (select a::text from public.accessible_client_ids() a)
    )
  );
