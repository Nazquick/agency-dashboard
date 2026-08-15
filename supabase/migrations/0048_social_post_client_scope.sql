-- Lets a client view (never edit) Post Plan posts tagged to their own
-- client/group — mirrors the accessible_client_ids() scoping already used
-- everywhere else client-portal-facing. Insert/update/delete stay
-- staff-only (untouched), so "view" is enforced structurally, not just by
-- hiding UI.

alter table public.social_posts add column client_id uuid references public.clients(id);

create index social_posts_client_id_idx on public.social_posts(client_id);

drop policy "social_posts_select_staff" on public.social_posts;
create policy "social_posts_select" on public.social_posts
  for select using (
    public.current_role() <> 'client' or client_id in (select public.accessible_client_ids())
  );

create or replace function public.can_view_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.social_posts p
    where p.id = p_post_id
      and (public.current_role() <> 'client' or p.client_id in (select public.accessible_client_ids()))
  )
$$;

drop policy "social_post_credits_select_staff" on public.social_post_credits;
create policy "social_post_credits_select" on public.social_post_credits
  for select using (public.can_view_post(post_id));

drop policy "social_post_attachments_select_staff" on public.social_post_attachments;
create policy "social_post_attachments_select" on public.social_post_attachments
  for select using (public.can_view_post(post_id));

drop policy "social_post_attachments_storage_select" on storage.objects;
create policy "social_post_attachments_storage_select" on storage.objects
  for select using (
    bucket_id = 'social-post-attachments'
    and public.can_view_post((storage.foldername(name))[1]::uuid)
  );
