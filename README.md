# CiscoNetWatch

Next.js 14+ NOC dashboard for multi-vendor network monitoring (Cisco, Aruba, Omada, Juniper, Fortinet, etc.).

## Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Recharts, Lucide
- **Target deploy:** Vercel
- **Target backend:** Supabase (auth, DB, realtime) — wire up via env vars

## Local
```bash
npm install
npm run dev
```

## Env
Copy `.env.example` → `.env.local` and fill Supabase + any API keys.

## Pages
- `/` Dashboard (KPIs, charts, events, collectors, device grid)
- `/ai-incident-analysis` AI incident correlation
- `/topology` Device map
- `/alertas` Alerts
- `/interface-device-detail` Device detail + SNMP OIDs + traffic
- `/device-collector-configuration` Add devices + collector health
- `/recolector-protocolos` Protocol collectors
- `/informes-ejecutivos` Executive reports
- `/user-management` / `/usuarios-roles` Users & roles
- `/sign-up-login` Login (demo credentials on form)

## Deploy (Claude / Vercel)
1. Connect this repo to Vercel
2. Set env from `.env.example`
3. Optional: create Supabase project and map tables for devices/alerts/users
4. Deploy

Demo login accounts are listed on the login page.
