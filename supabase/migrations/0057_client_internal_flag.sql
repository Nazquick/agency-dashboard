-- DYOR (and any future internal-work client) should be selectable for task
-- assignment like a real client, but must never show up on the public
-- marketing landing page's client showcase.
alter table public.clients
  add column is_internal boolean not null default false;

update public.clients set is_internal = true where name = 'DYOR';
