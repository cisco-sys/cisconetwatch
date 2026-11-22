# CiscoNetWatch — Production ops (credentials, backups, monitoring)

## 4. Credential storage (SNMP secrets)

### Design
- Table `snmp_configs` stores **only ciphertext** (`community_enc`, `auth_password_enc`, `priv_password_enc`, `trap_community_enc`) via `pgcrypto` (`pgp_sym_encrypt`).
- Browser never receives plaintext or ciphertext. UI uses:
  - `get_snmp_config(device_id)` → metadata + `has_*` flags
  - `upsert_snmp_config(...)` → accepts plaintext once, encrypts server-side
- Collectors decrypt with service role only:
  - `get_snmp_secrets_for_collector(device_id)` — **not** granted to `authenticated` / `anon`

### Required one-time setup (Supabase)
Generate a long random key (≥32 chars) and set it **once**. Losing it makes existing secrets unreadable.

```sql
-- Supabase SQL editor (as postgres) or Database settings custom GUC
ALTER DATABASE postgres SET app.snmp_encryption_key = 'REPLACE_WITH_LONG_RANDOM_SECRET_MIN_32_CHARS';
```

Then reload / reconnect. Verify:

```sql
SELECT length(current_setting('app.snmp_encryption_key', true));
```

Store the same key in your password manager / org secrets vault. Document who can rotate it.

### App usage
1. Open **Device Detail** → tab **SNMP Config**.
2. Save community / v3 passwords. Empty password fields keep existing ciphertext.
3. Confirm toast: “secrets encrypted at rest”.
4. In SQL, confirm no plaintext columns:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'snmp_configs' AND (column_name LIKE '%password%' OR column_name LIKE '%community%');
-- Expect: *_enc only
```

### Collector access
Use `SUPABASE_SERVICE_ROLE_KEY` only on the LAN collector host (never in Vercel `NEXT_PUBLIC_*`).

```text
CNW_API_URL=https://your-app.vercel.app
CNW_COLLECTOR_KEY=...
# Backend that calls get_snmp_secrets_for_collector must use service role
```

---

## 5. Backups and monitoring

### Supabase backups
1. **Dashboard → Project Settings → Database → Backups**
   - Pro+: enable **Point-in-Time Recovery (PITR)** if available.
   - Confirm daily automatic backups and retention (7+ days recommended).
2. Optional: scheduled `pg_dump` to object storage for offline copy of critical tables (`devices`, `profiles`, `snmp_configs`, `discovery_*`).
3. Test restore once on a staging project before go-live.

### Encryption key backup
- The `app.snmp_encryption_key` value is **not** inside table dumps as recoverable plaintext for secrets.
- Back up the key separately (sealed note / vault). Without it, `*_enc` columns are useless after restore.

### Vercel
1. **Project → Settings → Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — no `NEXT_PUBLIC_`)
   - Optional collector shared secret if used by API routes
2. **Deployments →** watch build logs after each push to `main`.
3. **Runtime logs** for `/api/collector/*` and `/api/admin/*` (auth failures, 5xx).

### Collector health (application monitoring)
- Heartbeats land in `collectors` via `/api/collector/heartbeat`.
- Dashboard **Collection Protocol Status** reads `get_collector_health`.
- Alert if:
  - `last_heartbeat_at` older than 5–15 minutes for a registered collector
  - `success_rate` sustained under threshold
  - zero collectors while inventory is non-empty

### Suggested alert checklist
| Signal | Source | Action |
|--------|--------|--------|
| Collector silent | `collectors.last_heartbeat_at` | Page NOC / restart Windows task |
| Auth spikes 401/403 | Vercel logs | Check RLS / revoked users |
| Migration drift | Supabase migration history | Do not re-run applied migrations |
| Empty metrics forever | No collector traffic | Deploy LAN collector with `CNW_*` env |

### Windows collector (quick)
```powershell
$env:CNW_API_URL = "https://your-app.vercel.app"
$env:CNW_COLLECTOR_KEY = "..."
$env:CNW_ORG_ID = "uuid-of-org"
python collector/poll_inventory.py
python collector/discover.py
```

Schedule with Task Scheduler every 1–5 minutes for poll; discovery can poll pending scans on demand.

---

## Production readiness summary

| Item | Status |
|------|--------|
| Auth + roles + RLS org isolation | Implemented |
| Mocks removed from core NOC views | Implemented |
| SNMP secrets encrypted + RPC-only | Migration + UI wired |
| Encryption key set in prod DB | **Operator must set** |
| Supabase automated backups / PITR | **Operator must enable** |
| Collector heartbeat monitored | UI present; ops process required |
| Service role never in client bundle | Enforced by naming + docs |
