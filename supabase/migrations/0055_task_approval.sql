-- Approval gate for tasks — separate from the existing 5-value status
-- column (not_started/in_progress/blocked/review/done) so nothing that
-- already keys off status is affected. "Approved" means ready to post;
-- approving is restricted to team leaders at the app layer, mirroring how
-- bounty payouts and task deletes are already leader-gated.

alter table public.tasks
  add column approval_status text not null default 'pending' check (approval_status in ('pending', 'approved')),
  add column approved_by uuid references public.profiles(id),
  add column approved_at timestamptz;
