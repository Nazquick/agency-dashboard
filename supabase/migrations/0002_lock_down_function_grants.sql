-- handle_new_user is a trigger-only function; current_role() must stay
-- executable by `authenticated` since RLS policies invoke it under the
-- querying user's session, but neither needs anon access.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.current_role() from public, anon;
