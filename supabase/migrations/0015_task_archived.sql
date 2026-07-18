alter table public.tasks
  add column archived boolean not null default false;
