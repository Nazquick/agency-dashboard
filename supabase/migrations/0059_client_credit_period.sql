-- Some clients buy their credits per week rather than per month (e.g. 4 a
-- week). monthly_credit_limit keeps its name but now means "credits per
-- credit_period" — week windows run Monday to Sunday.
alter table public.clients
  add column credit_period text not null default 'month'
  check (credit_period in ('week', 'month'));

comment on column public.clients.monthly_credit_limit is
  'Credits allowed per credit_period (week or month). Null means unlimited.';

update public.clients
  set credit_period = 'week', monthly_credit_limit = 4
  where id in ('94e15fe8-824f-4656-ab15-b3e7087b26c4', '6d916fbe-fd21-4686-ba79-5e4307b40822');
