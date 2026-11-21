-- WUG-style discovery wizard: queue jobs (pending) + scan config JSON

alter table public.discovery_scans
  drop constraint if exists discovery_scans_status_check;

alter table public.discovery_scans
  add constraint discovery_scans_status_check
  check (status in ('pending', 'running', 'completed', 'failed', 'cancelled'));

alter table public.discovery_scans
  add column if not exists description text;

alter table public.discovery_scans
  add column if not exists gateway_ip inet;

alter table public.discovery_scans
  add column if not exists config jsonb not null default '{}'::jsonb;

comment on column public.discovery_scans.config is
  'Wizard options: credentials labels (no secrets), expand flags, schedule meta';

comment on column public.discovery_scans.status is
  'pending = queued by UI for LAN collector; running/completed set by collector';
