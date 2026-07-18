-- confirm_meetup_if_all_accepted() writes to meetup_proposals and
-- calendar_events, so unlike the read-only current_role() helper it must
-- not be callable by anonymous/unauthenticated requests.

revoke execute on function public.confirm_meetup_if_all_accepted(uuid) from public;
revoke execute on function public.confirm_meetup_if_all_accepted(uuid) from anon;

create or replace function public.confirm_meetup_if_all_accepted(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal record;
  v_pending_count integer;
begin
  if auth.uid() is null then
    return;
  end if;

  select * into v_proposal from public.meetup_proposals where id = p_proposal_id;
  if v_proposal is null or v_proposal.status <> 'proposed' then
    return;
  end if;

  select count(*) into v_pending_count
  from public.meetup_responses
  where proposal_id = p_proposal_id and response <> 'accepted';

  if v_pending_count = 0 then
    update public.meetup_proposals set status = 'confirmed' where id = p_proposal_id;

    insert into public.calendar_events (assignee_id, title, event_type, starts_at, ends_at, source)
    select profile_id, v_proposal.purpose, 'meeting', v_proposal.starts_at, v_proposal.ends_at, 'manual'
    from public.meetup_responses
    where proposal_id = p_proposal_id;
  end if;
end;
$$;

grant execute on function public.confirm_meetup_if_all_accepted(uuid) to authenticated;
