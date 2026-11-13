# Supabase — CiscoNetWatch

## Migrations (order)
1. `20261103000001_init_schema.sql` — enums, tables, indexes, triggers
2. `20261103000002_rls_policies.sql` — RLS + role helpers + profile on signup
3. `20261103000003_rpc_functions.sql` — RPCs used by the app
4. `20261103000004_seed_demo.sql` — optional demo devices/alerts/collectors
5. `20261103000005_encrypt_snmp_secrets.sql` — **encrypt SNMP secrets at rest** (required if upgrading from plaintext)

## Auth / password reset (required for production)
In **Supabase Dashboard → Authentication → URL Configuration**:

| Setting | Value |
|--------|--------|
| **Site URL** | `https://cisconetwatch-cisco-7ce5.vercel.app` (or your custom domain) |
| **Redirect URLs** | Include all of: |
| | `https://cisconetwatch-cisco-7ce5.vercel.app/**` |
| | `https://cisconetwatch-cisco-7ce5.vercel.app/sign-up-login` |
| | `https://cisconetwatch-cisco-7ce5.vercel.app/sign-up-login?reset=1` |
| | `http://localhost:4028/**` (local dev) |

Also check **Authentication → Emails**: template **Reset password** enabled, and SMTP working (or Supabase default email).

App flow:
1. User clicks **Forgot password?** → `resetPasswordForEmail` with `redirectTo=.../sign-up-login?reset=1`
2. Email link opens the app → recovery session → **Set a new password** form
3. `updateUser({ password })` then redirect to dashboard

## SNMP secrets (important)
`snmp_configs` does **not** store community / auth_password / priv_password / trap_community in plaintext.

| Column | Content |
|--------|--------|
| `community_enc` | `pgp_sym_encrypt` ciphertext |
| `auth_password_enc` | idem |
| `priv_password_enc` | idem |
| `trap_community_enc` | idem |

**Set the encryption key once** (min 16 chars; use a long random secret). Losing it makes existing secrets unreadable:

```sql
-- Supabase SQL editor (as superuser / postgres role)
alter database postgres set app.snmp_encryption_key = 'REPLACE_WITH_LONG_RANDOM_SECRET';
-- reconnect sessions or: select pg_reload_conf();
```

App / UI:
- `rpc('upsert_snmp_config', { ... })` — encrypts on write; returns flags only (`has_community`, …)
- `rpc('get_snmp_config', { p_device_id })` — metadata + flags, **no secrets**

Collectors (backend only, **service role key**):
- `rpc('get_snmp_secrets_for_collector', { p_device_id })` — decrypted values
- Not granted to `anon` / `authenticated`

Direct `select` on `snmp_configs` is revoked for browser roles.

## Roles (`profiles.role`)
| Role | Read | Write devices | Ack alerts | Users |
|------|------|---------------|------------|-------|
| `admin` | all | yes | yes | yes |
| `noc_operator` | all | yes | yes | no |
| `network_engineer` | all | yes | yes | no |
| `it_management` | all (+ snmp meta) | no | yes | no |
| `read_only` | all (no snmp secrets) | no | no | no |

Helpers: `current_app_role()`, `is_admin()`, `can_write_ops()`, `can_ack_alerts()`, `can_manage_users()`.

## Main RPCs
```ts
await supabase.rpc('get_dashboard_metrics')
await supabase.rpc('list_alerts', { p_unacked_only: true, p_limit: 50 })
await supabase.rpc('ack_alert', { p_alert_id: '...' })
await supabase.rpc('list_devices', { p_status: 'down', p_search: 'CORE' })
await supabase.rpc('upsert_device', { p_name: 'SW-1', p_ip: '10.0.0.1' })
await supabase.rpc('update_device_metrics', { p_device_id: '...', p_cpu_pct: 40 })
await supabase.rpc('set_interface_admin', { p_interface_id: '...', p_admin_status: 'disabled' })
await supabase.rpc('get_collector_health')
await supabase.rpc('ingest_event', { p_severity: 'critical', p_message: '...' })
await supabase.rpc('upsert_snmp_config', { p_device_id: '...', p_version: 'v2c', p_community: '...' })
await supabase.rpc('get_snmp_config', { p_device_id: '...' })
// service role only:
// await supabase.rpc('get_snmp_secrets_for_collector', { p_device_id: '...' })
```

## Deploy (Claude)
1. Create Supabase project
2. Run migrations 01→05 in SQL editor (or `supabase db push`)
3. Set `app.snmp_encryption_key` (see above)
4. Configure Auth Site URL + Redirect URLs (see Auth section)
5. Vercel env:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server/collectors only — never in the browser)
6. First user: sign up, then set `profiles.role = 'admin'` in SQL for that user id

## Security notes
- All tables have RLS enabled
- SNMP secrets encrypted at rest; UI never receives plaintext; collectors use service role RPC
- RPCs use role helpers / security definer where appropriate
- Service role key must **never** be exposed to the browser
