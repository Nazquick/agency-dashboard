-- Auto-syncs "meeting" content-type tasks into calendar_events, one row
-- per assignee (mirrors the existing meetup pattern in
-- confirm_meetup_if_all_accepted). The task stays the source of truth:
-- editing a meeting task's title/deadline/assignees re-syncs the linked
-- calendar_events rows. Editing the calendar event directly still works
-- (unchanged EventForm edit flow), but a later edit to the source task
-- will overwrite it again — an accepted tradeoff, not a full
-- bidirectional sync.

alter table public.calendar_events
  drop constraint calendar_events_task_id_fkey;

alter table public.calendar_events
  add constraint calendar_events_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade;

create unique index calendar_events_task_assignee_key
  on public.calendar_events (task_id, assignee_id)
  where task_id is not null;

create or replace function public.sync_meeting_calendar_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_type = 'meeting' and new.deadline is not null and new.archived = false then
    insert into public.calendar_events
      (client_id, task_id, assignee_id, title, event_type, starts_at, ends_at, source, created_by)
    select new.client_id, new.id, ta.profile_id, new.title, 'meeting', new.deadline,
           new.deadline + interval '1 hour', new.source, new.created_by
    from public.task_assignees ta
    where ta.task_id = new.id
    on conflict (task_id, assignee_id) where task_id is not null
    do update set
      client_id = excluded.client_id,
      title = excluded.title,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      source = excluded.source;
  else
    delete from public.calendar_events where task_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_sync_meeting_calendar_events on public.tasks;
create trigger tasks_sync_meeting_calendar_events
  after insert or update on public.tasks
  for each row
  execute function public.sync_meeting_calendar_events();

create or replace function public.sync_meeting_calendar_event_for_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = new.task_id;
  if v_task.task_type = 'meeting' and v_task.deadline is not null and v_task.archived = false then
    insert into public.calendar_events
      (client_id, task_id, assignee_id, title, event_type, starts_at, ends_at, source, created_by)
    values
      (v_task.client_id, v_task.id, new.profile_id, v_task.title, 'meeting', v_task.deadline,
       v_task.deadline + interval '1 hour', v_task.source, v_task.created_by)
    on conflict (task_id, assignee_id) where task_id is not null
    do update set
      client_id = excluded.client_id,
      title = excluded.title,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      source = excluded.source;
  end if;
  return new;
end;
$$;

drop trigger if exists task_assignees_sync_meeting_calendar_event on public.task_assignees;
create trigger task_assignees_sync_meeting_calendar_event
  after insert on public.task_assignees
  for each row
  execute function public.sync_meeting_calendar_event_for_assignee();

create or replace function public.cleanup_meeting_calendar_event_for_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.calendar_events where task_id = old.task_id and assignee_id = old.profile_id;
  return old;
end;
$$;

drop trigger if exists task_assignees_cleanup_meeting_calendar_event on public.task_assignees;
create trigger task_assignees_cleanup_meeting_calendar_event
  after delete on public.task_assignees
  for each row
  execute function public.cleanup_meeting_calendar_event_for_assignee();

-- Backfill: meeting tasks created before this migration existed.
insert into public.calendar_events
  (client_id, task_id, assignee_id, title, event_type, starts_at, ends_at, source, created_by)
select t.client_id, t.id, ta.profile_id, t.title, 'meeting', t.deadline,
       t.deadline + interval '1 hour', t.source, t.created_by
from public.tasks t
join public.task_assignees ta on ta.task_id = t.id
where t.task_type = 'meeting' and t.deadline is not null and t.archived = false
on conflict (task_id, assignee_id) where task_id is not null do nothing;
