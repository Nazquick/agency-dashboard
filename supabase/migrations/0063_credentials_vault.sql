-- Client logins used to store passwords and 2FA codes as plain text, and the
-- Admin page loaded every row (secrets included) into the browser. Now:
--   * secrets live in Supabase Vault (encrypted at rest);
--   * the table only holds non-secret fields and references to Vault;
--   * secrets are read one at a time through reveal_client_credential(),
--     which logs every view to activity_log;
--   * everything requires the admin account AND a verified 2FA (TOTP)
--     session (JWT aal = aal2).

do $$
begin
  if exists (select 1 from public.client_credentials) then
    raise exception 'client_credentials still has plaintext rows; move them into Vault before dropping the plaintext columns';
  end if;
end $$;

alter table public.client_credentials
  drop column password,
  drop column auth_code,
  add column password_secret_id uuid not null,
  add column auth_code_secret_id uuid;

create or replace function public.is_admin_with_mfa() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
           (select email from public.profiles where id = auth.uid()) = 'nasir@thequickstyle.com',
           false
         )
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

drop policy "client_credentials_all_master_key" on public.client_credentials;
create policy "client_credentials_all_admin_mfa" on public.client_credentials
  for all using (public.is_admin_with_mfa()) with check (public.is_admin_with_mfa());

create or replace function public.save_client_credential(
  p_id uuid,
  p_client_id uuid,
  p_platform text,
  p_login text,
  p_password text,
  p_auth_code text,
  p_remove_auth_code boolean default false
) returns public.client_credentials
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.client_credentials;
  v_ac_id uuid;
begin
  if not public.is_admin_with_mfa() then
    raise exception 'Two-factor verification required' using errcode = '42501';
  end if;

  if p_id is null then
    if coalesce(p_password, '') = '' then
      raise exception 'Password is required';
    end if;
    if coalesce(p_auth_code, '') <> '' then
      v_ac_id := vault.create_secret(p_auth_code, 'cred_ac_' || gen_random_uuid()::text, 'client login auth code');
    end if;
    insert into public.client_credentials
      (client_id, platform, login, password_secret_id, auth_code_secret_id, created_by)
    values (
      p_client_id, p_platform, p_login,
      vault.create_secret(p_password, 'cred_pw_' || gen_random_uuid()::text, 'client login password'),
      v_ac_id, auth.uid()
    )
    returning * into v_row;
  else
    select * into v_row from public.client_credentials where id = p_id for update;
    if not found then
      raise exception 'Login not found';
    end if;

    if coalesce(p_password, '') <> '' then
      perform vault.update_secret(v_row.password_secret_id, p_password);
    end if;

    v_ac_id := v_row.auth_code_secret_id;
    if p_remove_auth_code and v_ac_id is not null then
      delete from vault.secrets where id = v_ac_id;
      v_ac_id := null;
    elsif coalesce(p_auth_code, '') <> '' then
      if v_ac_id is null then
        v_ac_id := vault.create_secret(p_auth_code, 'cred_ac_' || gen_random_uuid()::text, 'client login auth code');
      else
        perform vault.update_secret(v_ac_id, p_auth_code);
      end if;
    end if;

    update public.client_credentials
      set platform = p_platform, login = p_login, auth_code_secret_id = v_ac_id, updated_at = now()
      where id = p_id
      returning * into v_row;
  end if;

  insert into public.activity_log (actor_id, action, summary, entity_type, entity_id)
  values (
    auth.uid(), 'credential_saved',
    'Saved ' || v_row.platform || ' login for ' ||
      coalesce((select name from public.clients where id = v_row.client_id), 'a client'),
    'client_credential', v_row.id
  );

  return v_row;
end;
$$;

create or replace function public.reveal_client_credential(p_id uuid, p_field text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.client_credentials;
  v_secret_id uuid;
  v_secret text;
begin
  if not public.is_admin_with_mfa() then
    raise exception 'Two-factor verification required' using errcode = '42501';
  end if;
  if p_field not in ('password', 'auth_code') then
    raise exception 'Unknown field';
  end if;

  select * into v_row from public.client_credentials where id = p_id;
  if not found then
    raise exception 'Login not found';
  end if;

  v_secret_id := case p_field when 'password' then v_row.password_secret_id else v_row.auth_code_secret_id end;
  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where id = v_secret_id;

  insert into public.activity_log (actor_id, action, summary, entity_type, entity_id)
  values (
    auth.uid(), 'credential_viewed',
    'Viewed ' || replace(p_field, '_', ' ') || ' for ' || v_row.platform || ' (' ||
      coalesce((select name from public.clients where id = v_row.client_id), 'a client') || ')',
    'client_credential', v_row.id
  );

  return v_secret;
end;
$$;

create or replace function public.delete_credential_secrets() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from vault.secrets where id in (old.password_secret_id, old.auth_code_secret_id);
  return old;
end;
$$;

create trigger client_credentials_delete_secrets
  after delete on public.client_credentials
  for each row execute function public.delete_credential_secrets();

revoke all on function public.save_client_credential(uuid, uuid, text, text, text, text, boolean) from public, anon;
revoke all on function public.reveal_client_credential(uuid, text) from public, anon;
grant execute on function public.save_client_credential(uuid, uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.reveal_client_credential(uuid, text) to authenticated;
