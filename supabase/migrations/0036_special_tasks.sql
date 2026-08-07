-- Special (bounty) tasks: master-key only creates them with a payout
-- attached; they sit open (unassigned) until any team member claims one,
-- delivers it (status -> review), and the admin approves it, choosing an
-- instant payout or adding it to the member's running monthly total.

alter table public.tasks add column is_special boolean not null default false;
alter table public.tasks add column payout_amount numeric(10,2);
alter table public.tasks add column payout_method text check (payout_method in ('instant', 'monthly_invoice'));
alter table public.tasks add column payout_approved_by uuid references public.profiles(id);
alter table public.tasks add column payout_approved_at timestamptz;
alter table public.tasks add column payout_paid boolean not null default false;
alter table public.tasks add column payout_paid_at timestamptz;

-- Claiming an open special task needs to work for any team member, but
-- tasks_update_own_or_leader only allows the leader to touch a task with
-- no assignee yet. Rather than loosen that policy, a narrow security
-- definer RPC does just the one safe thing: assign an unclaimed special
-- task to whoever calls it.
create or replace function public.claim_special_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.tasks;
begin
  if public.current_role() = 'client' then
    raise exception 'Not allowed';
  end if;

  update public.tasks
  set assignee_id = auth.uid()
  where id = p_task_id and is_special and assignee_id is null and not archived
  returning * into result;

  if result.id is null then
    raise exception 'This task is no longer available to claim';
  end if;

  insert into public.task_assignees (task_id, profile_id)
  values (p_task_id, auth.uid())
  on conflict do nothing;

  return result;
end;
$$;

revoke all on function public.claim_special_task(uuid) from public;
grant execute on function public.claim_special_task(uuid) to authenticated;

-- Creating a special task, or changing its special/payout attributes, is
-- master-key only (same trust boundary as company_transactions, which the
-- approval step writes to) — everything else about a task (status,
-- assignee, title, ...) stays governed by the existing RLS policies, so
-- claiming and delivering by a regular member still goes through fine.
create or replace function public.enforce_special_task_master_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_master boolean;
begin
  is_master := (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com';
  if is_master then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_special then
      raise exception 'Only the admin can create special tasks';
    end if;
    return new;
  end if;

  if new.is_special is distinct from old.is_special
    or new.payout_amount is distinct from old.payout_amount
    or new.payout_method is distinct from old.payout_method
    or new.payout_approved_by is distinct from old.payout_approved_by
    or new.payout_approved_at is distinct from old.payout_approved_at
    or new.payout_paid is distinct from old.payout_paid
    or new.payout_paid_at is distinct from old.payout_paid_at
  then
    raise exception 'Only the admin can modify special task payout details';
  end if;

  return new;
end;
$$;

create trigger tasks_enforce_special_master_key
  before insert or update on public.tasks
  for each row execute function public.enforce_special_task_master_key();
