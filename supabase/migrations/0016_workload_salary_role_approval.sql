-- Team page: per-role workload balancing + salary tracking + a
-- master-key approval gate on promotions to team_leader.
--
-- Salaries live in their own table (not a profiles column) so RLS can
-- restrict them to team leaders without a column-level policy, which
-- Postgres RLS doesn't support natively.

create table public.profile_salaries (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  monthly_salary numeric(10, 2) not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.profile_salaries enable row level security;

create policy "profile_salaries_select_leader" on public.profile_salaries
  for select using (public.current_role() = 'team_leader');

create policy "profile_salaries_insert_leader" on public.profile_salaries
  for insert with check (public.current_role() = 'team_leader');

create policy "profile_salaries_update_leader" on public.profile_salaries
  for update using (public.current_role() = 'team_leader');

-- role_change_requests -----------------------------------------------------
-- Any team leader can propose promoting someone to team_leader, but only
-- the master-key user (nasir@thequickstyle.com) can approve/reject it.

create table public.role_change_requests (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  requested_role user_role not null,
  requested_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index role_change_requests_one_pending_per_target
  on public.role_change_requests(target_user_id)
  where status = 'pending';

alter table public.role_change_requests enable row level security;

create policy "role_change_requests_select_leader" on public.role_change_requests
  for select using (public.current_role() = 'team_leader');

create policy "role_change_requests_insert_leader" on public.role_change_requests
  for insert with check (
    public.current_role() = 'team_leader' and requested_by = auth.uid()
  );

create policy "role_change_requests_update_master_key" on public.role_change_requests
  for update using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

-- Gate direct promotion to team_leader behind the same master key, so the
-- request/approval flow above can't be bypassed with a raw profiles update.

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and (select role from public.profiles where id = auth.uid()) <> 'team_leader' then
    raise exception 'Only team leaders can change roles';
  end if;

  if new.role = 'team_leader' and old.role is distinct from new.role
     and (select email from public.profiles where id = auth.uid()) <> 'nasir@thequickstyle.com' then
    raise exception 'Promoting to Team Leader requires approval from nasir@thequickstyle.com';
  end if;

  return new;
end;
$$;
