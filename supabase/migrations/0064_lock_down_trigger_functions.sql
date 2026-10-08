-- Trigger functions are only ever run by triggers; nobody needs to call them
-- over the public API (/rest/v1/rpc/...). handle_new_user is left as-is
-- because it fires when Auth creates a login.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prorettype = 'trigger'::regtype
      and p.proname <> 'handle_new_user'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

alter function public.track_urgent_since() set search_path = '';
