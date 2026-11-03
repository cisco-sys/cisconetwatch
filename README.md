# CiscoNetWatch

Next.js 15 NOC dashboard for multi-vendor network monitoring (Cisco, Aruba, Omada, Juniper, Fortinet, etc.).

## Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind, Recharts, Lucide
- **Backend:** Supabase (Auth, Postgres, **RLS**, **RPC**)
- **Deploy:** Vercel + Supabase

## Repo
https://github.com/cisco-sys/cisconetwatch

## Local
```bash
npm install
cp .env.example .env.local   # fill Supabase keys
npm run dev                 # http://localhost:4028
```

## Supabase (RLS + RPC)
See [`supabase/README.md`](supabase/README.md).

Migrations (run in order in SQL Editor):
1. `supabase/migrations/20261103000001_init_schema.sql`
2. `supabase/migrations/20261103000002_rls_policies.sql`
3. `supabase/migrations/20261103000003_rpc_functions.sql`
4. `supabase/migrations/20261103000004_seed_demo.sql` (optional)

### Roles
`admin` · `noc_operator` · `network_engineer` · `it_management` · `read_only`

### Example RPCs
```ts
import { rpcGetDashboardMetrics, rpcListAlerts, rpcAckAlert } from '@/lib/supabase/rpc'

const metrics = await rpcGetDashboardMetrics()
const alerts = await rpcListAlerts({ unackedOnly: true })
await rpcAckAlert(alertId)
```

Client: `src/lib/supabase/client.ts` (anon key; all access goes through RLS).

## Pages
- `/` Dashboard
- `/ai-incident-analysis` AI correlation
- `/topology` · `/alertas` · `/interface-device-detail`
- `/device-collector-configuration` · `/recolector-protocolos`
- `/informes-ejecutivos` · `/user-management` · `/usuarios-roles`
- `/sign-up-login` (demo credentials on form until Auth is wired)

## Deploy (Claude)
1. Create Supabase project → run migrations 01–04
2. Connect GitHub repo to Vercel
3. Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Sign up first user → `update profiles set role = 'admin' where email = '...'`
5. Deploy
