-- External collaborators: assignable to tasks and visible on the Team page
-- and in reports, but never able to sign in to the dashboard.

alter table public.profiles add column is_external boolean not null default false;
