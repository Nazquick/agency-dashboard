-- Units sold alongside the existing kr amount, so reports can show sold
-- items in both value and unit count.

alter table public.client_sales add column units integer;
