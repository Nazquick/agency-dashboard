-- Rough, manually-logged sales figures per client, so Analytics can plot
-- sales against posting dates and show a quick estimate on the compare cards.

create table public.client_sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(12, 2) not null,
  sale_date date not null default current_date,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.client_sales enable row level security;

create policy "client_sales_select_authenticated" on public.client_sales
  for select using (auth.uid() is not null);

create policy "client_sales_insert_authenticated" on public.client_sales
  for insert with check (auth.uid() is not null);

create policy "client_sales_update_leader" on public.client_sales
  for update using (public.current_role() = 'team_leader');

create policy "client_sales_delete_leader" on public.client_sales
  for delete using (public.current_role() = 'team_leader');

create index client_sales_client_id_idx on public.client_sales(client_id);
