-- The new AI assistant (Phase 4) needs every staff member to be able to
-- READ campaign data so it can answer questions grounded in real records —
-- but the editable admin page stays master-key only (app-level gate,
-- unchanged), and financial fields (budget/ad_spend/roas) are stripped out
-- server-side before they ever reach the assistant's model context, not
-- just hidden by prompt instruction. This migration only widens SELECT;
-- insert/update/delete remain master-key only exactly as tightened in
-- 0051.

drop policy "campaigns_all_master_key" on public.campaigns;

create policy "campaigns_select_staff" on public.campaigns
  for select using (public.current_role() <> 'client');

create policy "campaigns_write_master_key" on public.campaigns
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "campaigns_update_master_key" on public.campaigns
  for update using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "campaigns_delete_master_key" on public.campaigns
  for delete using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "campaign_attachments_all_master_key" on public.campaign_attachments;

create policy "campaign_attachments_select_staff" on public.campaign_attachments
  for select using (public.current_role() <> 'client');

create policy "campaign_attachments_write_master_key" on public.campaign_attachments
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "campaign_attachments_delete_master_key" on public.campaign_attachments
  for delete using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "campaign_attachments_storage_master_key" on storage.objects;

create policy "campaign_attachments_storage_select_staff" on storage.objects
  for select using (
    bucket_id = 'campaign-attachments' and public.current_role() <> 'client'
  );

create policy "campaign_attachments_storage_write_master_key" on storage.objects
  for insert with check (
    bucket_id = 'campaign-attachments'
    and (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "campaign_attachments_storage_delete_master_key" on storage.objects
  for delete using (
    bucket_id = 'campaign-attachments'
    and (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );
