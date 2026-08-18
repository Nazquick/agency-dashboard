-- Campaigns hold budget/ad-spend data and the admin page gating this
-- feature is master-key only (per Phase 2 scope) — tighten RLS to match,
-- same shape as client_credentials, so DB access mirrors the UI gate
-- instead of a broader "any staff" policy that a direct API call could
-- still exercise regardless of what the page shows.

drop policy "campaigns_select_staff" on public.campaigns;
drop policy "campaigns_insert_staff" on public.campaigns;
drop policy "campaigns_update_staff" on public.campaigns;
drop policy "campaigns_delete_leader_only" on public.campaigns;

create policy "campaigns_all_master_key" on public.campaigns
  for all using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "campaign_attachments_select_staff" on public.campaign_attachments;
drop policy "campaign_attachments_insert_staff" on public.campaign_attachments;
drop policy "campaign_attachments_delete" on public.campaign_attachments;

create policy "campaign_attachments_all_master_key" on public.campaign_attachments
  for all using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "campaign_attachments_storage_select" on storage.objects;
drop policy "campaign_attachments_storage_insert" on storage.objects;
drop policy "campaign_attachments_storage_delete" on storage.objects;

create policy "campaign_attachments_storage_master_key" on storage.objects
  for all using (
    bucket_id = 'campaign-attachments'
    and (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    bucket_id = 'campaign-attachments'
    and (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );
