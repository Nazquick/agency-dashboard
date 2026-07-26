-- Admin page: consolidate master-key-only tools.
--
-- Two existing capabilities were only gated to team_leader (so both Nasir
-- and Yasmin could use them) but should be master-key-only per Nasir's
-- decision — this tightens the RLS itself, not just the UI, reusing the
-- inline master-key pattern from 0016_workload_salary_role_approval.sql.

drop policy "clients_insert_leader" on public.clients;
create policy "clients_insert_leader" on public.clients
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "profile_salaries_select_leader" on public.profile_salaries;
create policy "profile_salaries_select_leader" on public.profile_salaries
  for select using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "profile_salaries_insert_leader" on public.profile_salaries;
create policy "profile_salaries_insert_leader" on public.profile_salaries
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

drop policy "profile_salaries_update_leader" on public.profile_salaries;
create policy "profile_salaries_update_leader" on public.profile_salaries
  for update using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

-- company_transactions: manual income/expense ledger, master-key only.
create table public.company_transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(10, 2) not null,
  description text,
  transaction_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index company_transactions_date_idx on public.company_transactions(transaction_date desc);

alter table public.company_transactions enable row level security;

create policy "company_transactions_all_master_key" on public.company_transactions
  for all using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  ) with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

-- email_broadcasts: a record of each "email all clients/members" send,
-- master-key only. Sends happen synchronously through Resend — this is a
-- log, not a queue.
create table public.email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('clients', 'members')),
  subject text not null,
  body text not null,
  recipient_count integer not null,
  sent_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.email_broadcasts enable row level security;

create policy "email_broadcasts_select_master_key" on public.email_broadcasts
  for select using (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );

create policy "email_broadcasts_insert_master_key" on public.email_broadcasts
  for insert with check (
    (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com'
  );
