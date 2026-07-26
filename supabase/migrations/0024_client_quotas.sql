-- Client quota system: 4 tasks/assets per week standard credit, checked at
-- 16/month and 40/quarter. monthly_task_limit already existed (unset for
-- every client except one leftover test value) with a visual-only "over
-- plan limit" flag on the internal Analytics comparison grid — this adds
-- the missing quarterly threshold, sets both as real defaults, backfills
-- existing clients, and adds a per-task flag so the new overage-billing
-- action (Admin page) can't double-charge the same task.

alter table public.clients add column quarterly_task_limit integer default 40;
alter table public.clients alter column monthly_task_limit set default 16;

update public.clients set monthly_task_limit = 16 where monthly_task_limit is null;
update public.clients set quarterly_task_limit = 40 where quarterly_task_limit is null;

alter table public.tasks add column overage_charged boolean not null default false;
