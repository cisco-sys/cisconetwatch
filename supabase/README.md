# Supabase — CiscoNetWatch

## Migrations (order)
1. `20261103000001_init_schema.sql` — enums, tables, indexes, triggers
2. `20261103000002_rls_policies.sql` — RLS + role helpers + profile on signup
3. `20261103000003_rpc_functions.sql` — RPCs used by the app
4. `20261103000004_seed_demo.sql` — optional demo devices/alerts/collectors

## Roles (`profiles.role`)
| Role | Read | Write devices | Ack alerts | Users |
|------|------|---------------|------------|-------|
| `admin` | all | yes | yes | yes |
| `noc_operator` | all | yes | yes | no |
| `network_engineer` | all | yes | yes | no |
| `it_management` | all (+ snmp read) | no | yes | no |
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
```

## Deploy (Claude)
1. Create Supabase project
2. Run migrations 01→04 in SQL editor (or `supabase db push`)
3. Vercel env:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. First user: sign up, then set `profiles.role = 'admin'` in SQL for that user id

## Security notes
- All tables have RLS enabled
- SNMP credentials only readable by ops + it_management
- RPCs use `security invoker` and re-check role helpers
- Service role key must **never** be exposed to the browser
