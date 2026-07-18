-- Team tab: add phone number, and close a privilege-escalation gap.
--
-- profiles_update_own_or_leader allows a user to update their own row, but
-- placed no restriction on *which* columns — meaning any team member could
-- currently PATCH their own `role` to 'team_leader' via a direct API call.
-- A trigger is more reliable here than a WITH CHECK subquery (no ambiguity
-- about pre/post-update visibility of the same row within one statement).

alter table public.profiles add column phone text;

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
  return new;
end;
$$;

revoke execute on function public.prevent_self_role_escalation() from public, anon, authenticated;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();
