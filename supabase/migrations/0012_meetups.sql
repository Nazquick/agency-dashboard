-- Team: "Suggest a meetup" — propose a time/purpose/goal, everyone RSVPs,
-- and once every team member has accepted the meetup auto-confirms and a
-- calendar event is created on each person's calendar.

create type meetup_status as enum ('proposed', 'confirmed', 'cancelled');
create type rsvp_status as enum ('pending', 'accepted', 'declined');

create table public.meetup_proposals (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,
  goal text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status meetup_status not null default 'proposed',
  proposed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint meetup_proposals_valid_range check (ends_at > starts_at)
);

alter table public.meetup_proposals enable row level security;

create policy "meetup_proposals_select_authenticated" on public.meetup_proposals
  for select using (auth.uid() is not null);

create policy "meetup_proposals_insert_authenticated" on public.meetup_proposals
  for insert with check (auth.uid() is not null);

create policy "meetup_proposals_update_leader_or_proposer" on public.meetup_proposals
  for update using (
    public.current_role() = 'team_leader' or proposed_by = auth.uid()
  );

create policy "meetup_proposals_delete_leader_or_proposer" on public.meetup_proposals
  for delete using (
    public.current_role() = 'team_leader' or proposed_by = auth.uid()
  );

create table public.meetup_responses (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.meetup_proposals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  response rsvp_status not null default 'pending',
  responded_at timestamptz,
  unique (proposal_id, profile_id)
);

alter table public.meetup_responses enable row level security;

create policy "meetup_responses_select_authenticated" on public.meetup_responses
  for select using (auth.uid() is not null);

create policy "meetup_responses_insert_authenticated" on public.meetup_responses
  for insert with check (auth.uid() is not null);

create policy "meetup_responses_update_own_or_leader" on public.meetup_responses
  for update using (
    public.current_role() = 'team_leader' or profile_id = auth.uid()
  );

create policy "meetup_responses_delete_leader" on public.meetup_responses
  for delete using (public.current_role() = 'team_leader');

create index meetup_responses_proposal_id_idx on public.meetup_responses(proposal_id);

-- Called after a response is recorded. If every invited member has now
-- accepted, confirms the proposal and books it on each person's calendar.
-- SECURITY DEFINER because a non-leader accepting a meetup needs to create
-- calendar_events rows for every other member too, which the normal
-- calendar_events RLS (leader-or-owner) would otherwise block.
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
