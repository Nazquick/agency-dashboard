-- Post Plan: a social-media content calendar, separate from the client
-- task pipeline. Each post is scheduled for a specific date/time, color
-- coded by media type (video/image/graphic/collab/campaign), credits
-- whichever team members were involved, and can carry files. Staff-only —
-- clients never see this, it's the agency's own publishing calendar, not
-- a per-client deliverable.

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in (
    'instagram', 'tiktok', 'facebook', 'youtube', 'linkedin', 'x', 'snapchat', 'pinterest', 'threads', 'other'
  )),
  media_type text not null check (media_type in ('video', 'image', 'graphic', 'collab', 'campaign')),
  caption text,
  tag_handles text,
  suggested_song text,
  post_at timestamptz not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_posts_post_at_idx on public.social_posts(post_at);

create trigger social_posts_set_updated_at
  before update on public.social_posts
  for each row execute function public.set_updated_at();

create table public.social_post_credits (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, profile_id)
);

create table public.social_post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index social_post_attachments_post_id_idx on public.social_post_attachments(post_id);

alter table public.social_posts enable row level security;
alter table public.social_post_credits enable row level security;
alter table public.social_post_attachments enable row level security;

create policy "social_posts_select_staff" on public.social_posts
  for select using (public.current_role() <> 'client');

create policy "social_posts_insert_staff" on public.social_posts
  for insert with check (public.current_role() <> 'client' and created_by = auth.uid());

create policy "social_posts_update_staff" on public.social_posts
  for update using (public.current_role() <> 'client');

create policy "social_posts_delete_leader_only" on public.social_posts
  for delete using (public.current_role() = 'team_leader');

create policy "social_post_credits_select_staff" on public.social_post_credits
  for select using (public.current_role() <> 'client');

create policy "social_post_credits_insert_staff" on public.social_post_credits
  for insert with check (public.current_role() <> 'client');

create policy "social_post_credits_delete_staff" on public.social_post_credits
  for delete using (public.current_role() <> 'client');

create policy "social_post_attachments_select_staff" on public.social_post_attachments
  for select using (public.current_role() <> 'client');

create policy "social_post_attachments_insert_staff" on public.social_post_attachments
  for insert with check (public.current_role() <> 'client' and auth.uid() is not null);

create policy "social_post_attachments_delete" on public.social_post_attachments
  for delete using (uploaded_by = auth.uid() or public.current_role() = 'team_leader');

insert into storage.buckets (id, name, public, file_size_limit)
values ('social-post-attachments', 'social-post-attachments', false, 52428800);

create policy "social_post_attachments_storage_select" on storage.objects
  for select using (
    bucket_id = 'social-post-attachments' and public.current_role() <> 'client'
  );

create policy "social_post_attachments_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'social-post-attachments' and public.current_role() <> 'client'
  );

create policy "social_post_attachments_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'social-post-attachments'
    and (owner = auth.uid() or public.current_role() = 'team_leader')
  );

alter publication supabase_realtime add table public.social_posts;
alter publication supabase_realtime add table public.social_post_credits;
alter publication supabase_realtime add table public.social_post_attachments;

-- Push-notify the admin (nasir@thequickstyle.com) whenever a file is
-- uploaded to a post — mirrors notify_task_assignment's pg_net + Edge
-- Function pattern (0034_push_notifications.sql). Hardcodes this
-- project's own function URL/secret, so excluded from the white-label
-- tenant schema build like that trigger is.
create or replace function public.notify_post_attachment_upload() -- whitelabel:exclude-line
returns trigger -- whitelabel:exclude-line
language plpgsql -- whitelabel:exclude-line
security definer -- whitelabel:exclude-line
set search_path = public -- whitelabel:exclude-line
as $$ -- whitelabel:exclude-line
begin -- whitelabel:exclude-line
  perform net.http_post( -- whitelabel:exclude-line
    url := 'https://atqguuiinocdbqlakozx.supabase.co/functions/v1/notify-post-attachment?secret=55d97333c61567819c731b1350bbbd713d5367d0572069dd', -- whitelabel:exclude-line
    body := jsonb_build_object('attachment_id', new.id), -- whitelabel:exclude-line
    headers := '{"Content-Type": "application/json"}'::jsonb, -- whitelabel:exclude-line
    timeout_milliseconds := 5000 -- whitelabel:exclude-line
  ); -- whitelabel:exclude-line
  return new; -- whitelabel:exclude-line
end; -- whitelabel:exclude-line
$$; -- whitelabel:exclude-line

create trigger social_post_attachments_notify_admin -- whitelabel:exclude-line
  after insert on public.social_post_attachments -- whitelabel:exclude-line
  for each row execute function public.notify_post_attachment_upload(); -- whitelabel:exclude-line
