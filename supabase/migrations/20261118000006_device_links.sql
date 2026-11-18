-- Device topology links (manual or discovered via CDP/LLDP/SNMP)

create table if not exists public.device_links (
  id uuid primary key default gen_random_uuid(),
  source_device_id uuid not null references public.devices(id) on delete cascade,
  target_device_id uuid not null references public.devices(id) on delete cascade,
  source_interface text,
  target_interface text,
  link_type text not null default 'ethernet'
    check (link_type in ('ethernet', 'fibra', 'wan', 'inalambrico')),
  discovered_via text not null default 'manual'
    check (discovered_via in ('manual', 'cdp', 'lldp', 'snmp')),
  status text not null default 'up'
    check (status in ('up', 'down', 'degraded')),
  created_at timestamptz not null default now(),
  constraint device_links_no_self check (source_device_id <> target_device_id),
  constraint device_links_unique_pair unique (source_device_id, target_device_id)
);

create index if not exists idx_device_links_source on public.device_links(source_device_id);
create index if not exists idx_device_links_target on public.device_links(target_device_id);

alter table public.device_links enable row level security;

drop policy if exists device_links_select on public.device_links;
create policy device_links_select on public.device_links
  for select to authenticated
  using (true);

drop policy if exists device_links_write on public.device_links;
create policy device_links_write on public.device_links
  for all to authenticated
  using (public.can_write_ops())
  with check (public.can_write_ops());
