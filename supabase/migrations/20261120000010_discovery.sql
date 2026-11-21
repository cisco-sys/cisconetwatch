-- Network discovery scans + hosts (filled by LAN collector, not the browser)

create table if not exists public.discovery_scans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text,
  cidr text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'cancelled')),
  hosts_found int not null default 0,
  hosts_up int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  collector_id text,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.discovery_hosts (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.discovery_scans(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  ip inet not null,
  hostname text,
  is_up boolean not null default false,
  rtt_ms numeric(10, 2),
  mac text,
  vendor_hint text,
  open_ports int[] default '{}',
  snmp_sysname text,
  snmp_sysdescr text,
  promoted_device_id uuid references public.devices(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (scan_id, ip)
);

create index if not exists idx_discovery_scans_org on public.discovery_scans(org_id);
create index if not exists idx_discovery_scans_started on public.discovery_scans(started_at desc);
create index if not exists idx_discovery_hosts_scan on public.discovery_hosts(scan_id);
create index if not exists idx_discovery_hosts_org on public.discovery_hosts(org_id);
create index if not exists idx_discovery_hosts_ip on public.discovery_hosts(ip);

alter table public.discovery_scans enable row level security;
alter table public.discovery_hosts enable row level security;

drop policy if exists discovery_scans_select on public.discovery_scans;
create policy discovery_scans_select on public.discovery_scans
  for select to authenticated
  using (public.same_org(org_id) or public.is_platform_admin());

drop policy if exists discovery_scans_write on public.discovery_scans;
create policy discovery_scans_write on public.discovery_scans
  for all to authenticated
  using (public.can_write_ops() and public.same_org(org_id))
  with check (public.can_write_ops() and (org_id = public.my_org_id() or public.same_org(org_id)));

drop policy if exists discovery_hosts_select on public.discovery_hosts;
create policy discovery_hosts_select on public.discovery_hosts
  for select to authenticated
  using (public.same_org(org_id) or public.is_platform_admin());

drop policy if exists discovery_hosts_write on public.discovery_hosts;
create policy discovery_hosts_write on public.discovery_hosts
  for all to authenticated
  using (public.can_write_ops() and public.same_org(org_id))
  with check (public.can_write_ops() and (org_id = public.my_org_id() or public.same_org(org_id)));
