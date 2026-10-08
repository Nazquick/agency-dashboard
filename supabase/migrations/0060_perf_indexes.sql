-- Indexes for columns that sit on hot query paths: RLS lookups
-- (clients.group_id, profiles.client_id / client_group_id,
-- tasks.credit_client_id), embeds and joins (tasks.created_by,
-- calendar_events.created_by, social_post_credits.profile_id,
-- meetup_responses.profile_id), and the sort/filter columns the Pipeline,
-- Calendar and My Day pages use. Audit-only created_by columns on tiny
-- tables are deliberately left unindexed.
create index if not exists tasks_credit_client_id_idx on public.tasks (credit_client_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_archived_status_idx on public.tasks (archived, status);
create index if not exists clients_group_id_idx on public.clients (group_id);
create index if not exists profiles_client_id_idx on public.profiles (client_id);
create index if not exists profiles_client_group_id_idx on public.profiles (client_group_id);
create index if not exists social_post_credits_profile_id_idx on public.social_post_credits (profile_id);
create index if not exists meetup_responses_profile_id_idx on public.meetup_responses (profile_id);
create index if not exists calendar_events_created_by_idx on public.calendar_events (created_by);
create index if not exists calendar_events_starts_at_idx on public.calendar_events (starts_at);
