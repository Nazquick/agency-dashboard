-- Replaces the client_group_id tagging approach (a task pinned to one real
-- location, tagged as "really for the whole group") with an actual pseudo
-- client per group, e.g. "JØNK (ALL)". A task assigned to it is just one
-- normal task under one normal client_id — no more duplicate-looking rows
-- per location. Credit is still deducted from a real location, tracked via
-- the new tasks.credit_client_id column instead of client_id itself.

alter table public.clients add column is_group_all boolean not null default false;
alter table public.client_groups add column all_client_id uuid references public.clients(id) unique;
alter table public.tasks add column credit_client_id uuid references public.clients(id);

-- Grant client-master-account portal logins visibility into their group's
-- pseudo client too (it deliberately has clients.group_id = null so it
-- never shows up as a "member" in ordinary group-membership lookups
-- throughout the app — this is the one place that needs an explicit
-- carve-out for it).
create or replace function public.accessible_client_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.clients
  where id = public.current_client_id()
     or group_id = public.current_client_group_id()
     or id = (select all_client_id from public.client_groups where id = public.current_client_group_id())
$$;

-- Backfill: create the "(ALL)" pseudo client for every existing group, and
-- migrate any tasks already tagged via the old client_group_id column onto
-- the new model — credit stays with whichever real location was picked at
-- the time (client_id), the task's own client becomes the group's pseudo
-- client.
do $$
declare
  g record;
  new_client_id uuid;
begin
  for g in select id, name from public.client_groups where all_client_id is null loop
    insert into public.clients (name, monthly_credit_limit, is_group_all)
    values (g.name || ' (ALL)', null, true)
    returning id into new_client_id;

    update public.client_groups set all_client_id = new_client_id where id = g.id;

    update public.tasks
    set credit_client_id = client_id,
        client_id = new_client_id
    where client_group_id = g.id;
  end loop;
end $$;

alter table public.tasks drop column client_group_id;
