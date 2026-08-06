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
create extension if not exists pg_net;

-- Fires once per row inserted into task_assignees — i.e. once per person
-- newly assigned to a task, whether that's the first assignee on a new
-- task or an extra assignee added later. The Edge Function looks up that
-- person's push_subscriptions and sends a Web Push to each. The secret
-- query param gates the function the same way INBOUND_EMAIL_SECRET gates
-- the inbound-email function (verify_jwt=false, shared-secret auth).
create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://atqguuiinocdbqlakozx.supabase.co/functions/v1/notify-task-assignment?secret=55d97333c61567819c731b1350bbbd713d5367d0572069dd',
    body := jsonb_build_object('task_id', new.task_id, 'profile_id', new.profile_id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger task_assignees_notify_push
  after insert on public.task_assignees
  for each row execute function public.notify_task_assignment();
