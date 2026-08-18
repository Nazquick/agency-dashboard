-- Push-notify a calendar event's assignee whenever the event is created —
-- calendar_events already stores one row per assignee (co-assignees share
-- an event_group_id), so a plain AFTER INSERT ROW trigger fires once per
-- person naturally, whether the row came from EventForm directly or from
-- the meeting-task -> calendar_events auto-sync trigger (0043). Mirrors
-- notify_task_assignment's pg_net + Edge Function pattern exactly,
-- reusing the same webhook secret (Edge Function secrets are
-- project-wide). Hardcodes this project's own function URL/secret, so
-- excluded from the white-label tenant schema build like that trigger is.

create or replace function public.notify_calendar_event_assignment() -- whitelabel:exclude-line
returns trigger -- whitelabel:exclude-line
language plpgsql -- whitelabel:exclude-line
security definer -- whitelabel:exclude-line
set search_path = public -- whitelabel:exclude-line
as $$ -- whitelabel:exclude-line
begin -- whitelabel:exclude-line
  perform net.http_post( -- whitelabel:exclude-line
    url := 'https://atqguuiinocdbqlakozx.supabase.co/functions/v1/notify-calendar-event?secret=55d97333c61567819c731b1350bbbd713d5367d0572069dd', -- whitelabel:exclude-line
    body := jsonb_build_object('event_id', new.id, 'profile_id', new.assignee_id), -- whitelabel:exclude-line
    headers := '{"Content-Type": "application/json"}'::jsonb, -- whitelabel:exclude-line
    timeout_milliseconds := 5000 -- whitelabel:exclude-line
  ); -- whitelabel:exclude-line
  return new; -- whitelabel:exclude-line
end; -- whitelabel:exclude-line
$$; -- whitelabel:exclude-line

create trigger calendar_events_notify_assignment -- whitelabel:exclude-line
  after insert on public.calendar_events -- whitelabel:exclude-line
  for each row execute function public.notify_calendar_event_assignment(); -- whitelabel:exclude-line
