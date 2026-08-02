-- Tracks when a task's priority most recently became 'urgent', so the UI
-- can flag tasks that have been urgent for more than 24h. Maintained by a
-- trigger rather than app code so it stays correct regardless of which
-- code path changes priority (TaskForm create/edit, future paths, etc).

alter table public.tasks add column urgent_since timestamptz;

update public.tasks set urgent_since = created_at where priority = 'urgent';

create or replace function public.track_urgent_since()
returns trigger
language plpgsql
as $$
begin
  if new.priority = 'urgent' and (old is null or old.priority is distinct from 'urgent') then
    new.urgent_since = now();
  elsif new.priority <> 'urgent' then
    new.urgent_since = null;
  end if;
  return new;
end;
$$;

create trigger tasks_track_urgent_since
  before insert or update of priority on public.tasks
  for each row execute function public.track_urgent_since();
