-- Lets a calendar event have multiple assignees. Same shape as the
-- meeting-task sync (0043): one calendar_events row per assignee, tied
-- together by a shared event_group_id instead of a separate join table —
-- keeps per-assignee conflict-checking, color-coding, and RLS exactly as
-- they are today, since each row still carries its own assignee_id.
--
-- Every existing row gets its own distinct event_group_id (a group of
-- one), so single-assignee events are unaffected.

alter table public.calendar_events
  add column event_group_id uuid not null default gen_random_uuid();

create unique index calendar_events_group_assignee_key
  on public.calendar_events (event_group_id, assignee_id);

-- Any staff member (not just the leader or the specific assignee) needs
-- to be able to add/remove OTHER people as co-assignees on an event —
-- mirrors tasks_update_staff (0038)'s same reasoning: assignment is a
-- work-routing signal, not an access boundary. Delete is widened too,
-- since removing a co-assignee from an event is a delete of their row.
drop policy "calendar_events_insert_own_or_leader" on public.calendar_events;
drop policy "calendar_events_update_own_or_leader" on public.calendar_events;
drop policy "calendar_events_delete_own_or_leader" on public.calendar_events;

create policy "calendar_events_insert_staff" on public.calendar_events
  for insert with check (public.current_role() <> 'client');
create policy "calendar_events_update_staff" on public.calendar_events
  for update using (public.current_role() <> 'client');
create policy "calendar_events_delete_staff" on public.calendar_events
  for delete using (public.current_role() <> 'client');

-- Task-synced meeting events (0043) should group the same way: a task's
-- own id is already a stable per-task uuid, so reuse it directly as the
-- event_group_id instead of generating a fresh one per assignee — that
-- way dragging one location's synced meeting on the calendar moves it
-- for every assignee on that task, not just the one that was dragged.
update public.calendar_events set event_group_id = task_id where task_id is not null;

create or replace function public.sync_meeting_calendar_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_type = 'meeting' and new.deadline is not null and new.archived = false then
    insert into public.calendar_events
      (client_id, task_id, event_group_id, assignee_id, title, event_type, starts_at, ends_at, source, created_by)
    select new.client_id, new.id, new.id, ta.profile_id, new.title, 'meeting', new.deadline,
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
      (client_id, task_id, event_group_id, assignee_id, title, event_type, starts_at, ends_at, source, created_by)
    values
      (v_task.client_id, v_task.id, v_task.id, new.profile_id, v_task.title, 'meeting', v_task.deadline,
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
