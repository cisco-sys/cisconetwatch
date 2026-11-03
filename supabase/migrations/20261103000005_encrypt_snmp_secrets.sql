-- Encrypt SNMP secrets at rest (community, auth/priv passwords, trap community).
-- Plaintext columns are removed. App/collectors use RPCs only.
-- Requires: create extension pgcrypto (already in 01_init_schema).
--
-- BEFORE applying in production, set the encryption key once:
--   alter database postgres set app.snmp_encryption_key = 'GENERATE_A_LONG_RANDOM_SECRET';
-- Or in Supabase Dashboard → Database → Settings / custom config, then reload.
-- Keep the same key forever (or rotate with a re-encrypt job). Losing it = unreadable secrets.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Key helper: never hardcode secrets in SQL source.
-- ---------------------------------------------------------------------------
create or replace function public.snmp_encryption_key()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  k text;
begin
  begin
    k := nullif(current_setting('app.snmp_encryption_key', true), '');
  exception when others then
    k := null;
  end;

  if k is null or length(k) < 16 then
    raise exception
      'app.snmp_encryption_key is not set or too short (min 16 chars). Set it with: ALTER DATABASE postgres SET app.snmp_encryption_key = ''...'';
      using errcode = 'P0001';
  end if;

  return k;
end;
$$;

revoke all on function public.snmp_encryption_key() from public;
revoke all on function public.snmp_encryption_key() from anon, authenticated;
-- Only security definer helpers below call it.

create or replace function public.encrypt_snmp_secret(p_plain text)
returns bytea
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_plain is null or p_plain = '' then
    return null;
  end if;
  return pgp_sym_encrypt(p_plain, public.snmp_encryption_key());
end;
$$;

create or replace function public.decrypt_snmp_secret(p_cipher bytea)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_cipher is null then
    return null;
  end if;
  return pgp_sym_decrypt(p_cipher, public.snmp_encryption_key());
exception
  when others then
    raise exception 'failed to decrypt SNMP secret (wrong key or corrupt ciphertext)'
      using errcode = 'P0001';
end;
$$;

revoke all on function public.encrypt_snmp_secret(text) from public, anon, authenticated;
revoke all on function public.decrypt_snmp_secret(bytea) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schema: replace plaintext secret columns with encrypted bytea
-- ---------------------------------------------------------------------------
do $$
begin
  -- Add encrypted columns if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'snmp_configs' and column_name = 'community_enc'
  ) then
    alter table public.snmp_configs
      add column community_enc bytea,
      add column auth_password_enc bytea,
      add column priv_password_enc bytea,
      add column trap_community_enc bytea;
  end if;
end $$;

-- Migrate existing plaintext → ciphertext (only if key is set and plaintext still present)
do $$
declare
  has_plain boolean;
  k text;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'snmp_configs' and column_name = 'community'
  ) into has_plain;

  if not has_plain then
    return;
  end if;

  begin
    k := public.snmp_encryption_key();
  exception when others then
    raise notice 'Skipping plaintext→ciphertext migration: set app.snmp_encryption_key and re-run UPDATE manually if needed.';
    return;
  end;

  update public.snmp_configs set
    community_enc = case
      when community is not null and community <> '' then pgp_sym_encrypt(community, k)
      else community_enc
    end,
    auth_password_enc = case
      when auth_password is not null and auth_password <> '' then pgp_sym_encrypt(auth_password, k)
      else auth_password_enc
    end,
    priv_password_enc = case
      when priv_password is not null and priv_password <> '' then pgp_sym_encrypt(priv_password, k)
      else priv_password_enc
    end,
    trap_community_enc = case
      when trap_community is not null and trap_community <> '' then pgp_sym_encrypt(trap_community, k)
      else trap_community_enc
    end;
end $$;

-- Drop plaintext secret columns if they still exist
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'snmp_configs' and column_name = 'community'
  ) then
    alter table public.snmp_configs
      drop column community,
      drop column auth_password,
      drop column priv_password,
      drop column trap_community;
  end if;
end $$;

comment on column public.snmp_configs.community_enc is 'pgp_sym_encrypt ciphertext; never select from clients';
comment on column public.snmp_configs.auth_password_enc is 'pgp_sym_encrypt ciphertext; never select from clients';
comment on column public.snmp_configs.priv_password_enc is 'pgp_sym_encrypt ciphertext; never select from clients';
comment on column public.snmp_configs.trap_community_enc is 'pgp_sym_encrypt ciphertext; never select from clients';

-- ---------------------------------------------------------------------------
-- Harden table access: no direct SELECT of ciphertext for browser roles.
-- Ops manage config via RPCs; collectors use service_role + decrypt RPC.
-- ---------------------------------------------------------------------------
alter table public.snmp_configs enable row level security;

drop policy if exists snmp_select on public.snmp_configs;
drop policy if exists snmp_write on public.snmp_configs;

-- Authenticated: no direct row access (RPCs are security definer / controlled)
-- Service role bypasses RLS (collectors / backend jobs).

revoke all on table public.snmp_configs from anon, authenticated;
grant select, insert, update, delete on table public.snmp_configs to service_role;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Upsert config: accepts plaintext secrets, stores only ciphertext.
create or replace function public.upsert_snmp_config(
  p_device_id uuid,
  p_version text default 'v2c',
  p_community text default null,
  p_username text default null,
  p_auth_protocol text default null,
  p_auth_password text default null,
  p_priv_protocol text default null,
  p_priv_password text default null,
  p_poll_interval_s int default 60,
  p_timeout_s int default 5,
  p_retries int default 3,
  p_trap_enabled boolean default true,
  p_trap_community text default null,
  -- if false, empty string means "leave existing secret unchanged"; null same
  p_clear_community boolean default false,
  p_clear_auth_password boolean default false,
  p_clear_priv_password boolean default false,
  p_clear_trap_community boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row public.snmp_configs;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not public.can_write_ops() then
    raise exception 'not authorized to manage SNMP config' using errcode = '42501';
  end if;
  if p_version is null or p_version not in ('v1', 'v2c', 'v3') then
    raise exception 'version must be v1, v2c or v3';
  end if;
  if not exists (select 1 from public.devices d where d.id = p_device_id) then
    raise exception 'device not found' using errcode = 'P0002';
  end if;

  insert into public.snmp_configs (
    device_id, version, username, auth_protocol, priv_protocol,
    poll_interval_s, timeout_s, retries, trap_enabled,
    community_enc, auth_password_enc, priv_password_enc, trap_community_enc,
    updated_at
  ) values (
    p_device_id,
    p_version,
    p_username,
    p_auth_protocol,
    p_priv_protocol,
    coalesce(p_poll_interval_s, 60),
    coalesce(p_timeout_s, 5),
    coalesce(p_retries, 3),
    coalesce(p_trap_enabled, true),
    public.encrypt_snmp_secret(p_community),
    public.encrypt_snmp_secret(p_auth_password),
    public.encrypt_snmp_secret(p_priv_password),
    public.encrypt_snmp_secret(p_trap_community),
    now()
  )
  on conflict (device_id) do update set
    version = excluded.version,
    username = coalesce(excluded.username, public.snmp_configs.username),
    auth_protocol = coalesce(excluded.auth_protocol, public.snmp_configs.auth_protocol),
    priv_protocol = coalesce(excluded.priv_protocol, public.snmp_configs.priv_protocol),
    poll_interval_s = coalesce(excluded.poll_interval_s, public.snmp_configs.poll_interval_s),
    timeout_s = coalesce(excluded.timeout_s, public.snmp_configs.timeout_s),
    retries = coalesce(excluded.retries, public.snmp_configs.retries),
    trap_enabled = coalesce(excluded.trap_enabled, public.snmp_configs.trap_enabled),
    -- Secrets: new non-empty value replaces; clear flags wipe; otherwise keep
    community_enc = case
      when p_clear_community then null
      when p_community is not null and p_community <> '' then public.encrypt_snmp_secret(p_community)
      else public.snmp_configs.community_enc
    end,
    auth_password_enc = case
      when p_clear_auth_password then null
      when p_auth_password is not null and p_auth_password <> '' then public.encrypt_snmp_secret(p_auth_password)
      else public.snmp_configs.auth_password_enc
    end,
    priv_password_enc = case
      when p_clear_priv_password then null
      when p_priv_password is not null and p_priv_password <> '' then public.encrypt_snmp_secret(p_priv_password)
      else public.snmp_configs.priv_password_enc
    end,
    trap_community_enc = case
      when p_clear_trap_community then null
      when p_trap_community is not null and p_trap_community <> '' then public.encrypt_snmp_secret(p_trap_community)
      else public.snmp_configs.trap_community_enc
    end,
    updated_at = now()
  returning * into row;

  -- Never return ciphertext or plaintext secrets to the client
  return jsonb_build_object(
    'id', row.id,
    'device_id', row.device_id,
    'version', row.version,
    'username', row.username,
    'auth_protocol', row.auth_protocol,
    'priv_protocol', row.priv_protocol,
    'poll_interval_s', row.poll_interval_s,
    'timeout_s', row.timeout_s,
    'retries', row.retries,
    'trap_enabled', row.trap_enabled,
    'has_community', row.community_enc is not null,
    'has_auth_password', row.auth_password_enc is not null,
    'has_priv_password', row.priv_password_enc is not null,
    'has_trap_community', row.trap_community_enc is not null,
    'updated_at', row.updated_at
  );
end;
$$;

-- UI-safe read: metadata + flags only (no secrets)
create or replace function public.get_snmp_config(p_device_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  row public.snmp_configs;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  -- Same audience as former snmp_select policy
  if not (public.can_write_ops() or public.current_app_role() = 'it_management'::public.app_role) then
    raise exception 'not authorized to view SNMP config' using errcode = '42501';
  end if;

  select * into row from public.snmp_configs where device_id = p_device_id;
  if row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', row.id,
    'device_id', row.device_id,
    'version', row.version,
    'username', row.username,
    'auth_protocol', row.auth_protocol,
    'priv_protocol', row.priv_protocol,
    'poll_interval_s', row.poll_interval_s,
    'timeout_s', row.timeout_s,
    'retries', row.retries,
    'trap_enabled', row.trap_enabled,
    'has_community', row.community_enc is not null,
    'has_auth_password', row.auth_password_enc is not null,
    'has_priv_password', row.priv_password_enc is not null,
    'has_trap_community', row.trap_community_enc is not null,
    'updated_at', row.updated_at
  );
end;
$$;

-- Collector / backend only: returns decrypted secrets.
-- Callable with service_role key (RLS bypass + this grant). Not for browser anon key.
create or replace function public.get_snmp_secrets_for_collector(p_device_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  row public.snmp_configs;
  jwt_role text;
begin
  -- Block browser JWT roles even if someone grants execute by mistake
  jwt_role := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
  if jwt_role in ('anon', 'authenticated') then
    raise exception 'collectors must use the service role' using errcode = '42501';
  end if;

  select * into row from public.snmp_configs where device_id = p_device_id;
  if row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'device_id', row.device_id,
    'version', row.version,
    'username', row.username,
    'auth_protocol', row.auth_protocol,
    'priv_protocol', row.priv_protocol,
    'poll_interval_s', row.poll_interval_s,
    'timeout_s', row.timeout_s,
    'retries', row.retries,
    'trap_enabled', row.trap_enabled,
    'community', public.decrypt_snmp_secret(row.community_enc),
    'auth_password', public.decrypt_snmp_secret(row.auth_password_enc),
    'priv_password', public.decrypt_snmp_secret(row.priv_password_enc),
    'trap_community', public.decrypt_snmp_secret(row.trap_community_enc)
  );
end;
$$;

grant execute on function public.upsert_snmp_config(
  uuid, text, text, text, text, text, text, text, int, int, int, boolean, text,
  boolean, boolean, boolean, boolean
) to authenticated;

grant execute on function public.get_snmp_config(uuid) to authenticated;

-- Intentionally NOT granted to authenticated/anon — only service_role (default superuser path)
revoke all on function public.get_snmp_secrets_for_collector(uuid) from public, anon, authenticated;
grant execute on function public.get_snmp_secrets_for_collector(uuid) to service_role;
