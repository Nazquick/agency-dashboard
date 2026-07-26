-- Team members can't be hard-deleted once they have any historical tasks,
-- content, reports, etc. attributed to them — those foreign keys are
-- intentionally NO ACTION so history survives. This adds a soft-deactivate
-- flag instead: revoke sign-in, keep every record they ever touched intact.

alter table public.profiles add column active boolean not null default true;
