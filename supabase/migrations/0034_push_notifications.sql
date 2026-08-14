-- Web Push notifications: a member gets notified when assigned a task,
-- once they've subscribed from an installed (home-screen) PWA.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_id_idx on public.push_subscriptions(profile_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own" on public.push_subscriptions
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- This project has never used Supabase's Database Webhooks feature, so the
-- supabase_functions.http_request() convenience wrapper it normally
-- provisions doesn't exist here. pg_net (the extension that wrapper is
-- built on) is available directly, so the trigger is built on that instead.
--
-- The function below hardcodes THIS project's own Edge Function URL and
-- shared secret, so it cannot be replayed as-is into a white-label
-- tenant's project (it would both leak this secret and call the wrong
-- endpoint) — excluded from scripts/build-tenant-schema.mjs's output via
-- the trailing markers below. Push notifications are a documented v1 gap
-- for white-label tenants; the push_subscriptions table above still gets
-- created for them, ready to wire up if they deploy their own Edge
-- Function later.
create extension if not exists pg_net; -- whitelabel:exclude-line

create or replace function public.notify_task_assignment() -- whitelabel:exclude-line
returns trigger -- whitelabel:exclude-line
language plpgsql -- whitelabel:exclude-line
security definer -- whitelabel:exclude-line
set search_path = public -- whitelabel:exclude-line
as $$ -- whitelabel:exclude-line
begin -- whitelabel:exclude-line
  perform net.http_post( -- whitelabel:exclude-line
    url := 'https://atqguuiinocdbqlakozx.supabase.co/functions/v1/notify-task-assignment?secret=55d97333c61567819c731b1350bbbd713d5367d0572069dd', -- whitelabel:exclude-line
    body := jsonb_build_object('task_id', new.task_id, 'profile_id', new.profile_id), -- whitelabel:exclude-line
    headers := '{"Content-Type": "application/json"}'::jsonb, -- whitelabel:exclude-line
    timeout_milliseconds := 5000 -- whitelabel:exclude-line
  ); -- whitelabel:exclude-line
  return new; -- whitelabel:exclude-line
end; -- whitelabel:exclude-line
$$; -- whitelabel:exclude-line

create trigger task_assignees_notify_push -- whitelabel:exclude-line
  after insert on public.task_assignees -- whitelabel:exclude-line
  for each row execute function public.notify_task_assignment(); -- whitelabel:exclude-line
