-- CiscoNetWatch initial schema
-- Enums, tables, indexes for devices, alerts, collectors, interfaces, profiles

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.vendor_type as enum (
    'cisco','aruba','omada','juniper','fortinet','ubiquiti','mikrotik','huawei'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.device_status as enum ('up','degraded','down');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.protocol_type as enum ('SNMP','NETCONF','SSH','RESTCONF','TELEMETRY','ICMP');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alert_severity as enum ('critical','major','minor','info');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.collector_status as enum ('active','degraded','down');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.app_role as enum (
    'admin','noc_operator','network_engineer','it_management','read_only'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.interface_status as enum ('up','down','admin-down');
exception when duplicate_object then null; end $$;

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'read_only',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Devices
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ip inet not null,
  model text,
  vendor public.vendor_type not null default 'cisco',
  site text,
  status public.device_status not null default 'up',
  protocol public.protocol_type not null default 'SNMP',
  os text,
  device_group text,
  cpu_pct numeric(5,2) default 0,
  memory_pct numeric(5,2) default 0,
  ports_total int default 0,
  ports_up int default 0,
  ports_down int default 0,
  utilization_pct numeric(5,2) default 0,
  serial_number text,
  location text,
  last_poll_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ip)
);

create index if not exists idx_devices_status on public.devices(status);
create index if not exists idx_devices_vendor on public.devices(vendor);
create index if not exists idx_devices_site on public.devices(site);

-- Interfaces / ports
create table if not exists public.interfaces (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  if_index int,
  name text not null,
  description text,
  status public.interface_status not null default 'down',
  admin_status text not null default 'enabled' check (admin_status in ('enabled','disabled')),
  speed text,
  duplex text,
  vlan text,
  vlan_mode text check (vlan_mode is null or vlan_mode in ('access','trunk')),
  utilization_pct numeric(5,2) default 0,
  in_errors bigint default 0,
  out_errors bigint default 0,
  in_octets bigint default 0,
  out_octets bigint default 0,
  poe boolean default false,
  poe_watts numeric(6,2) default 0,
  connected_device text,
  mac_address text,
  last_update_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_interfaces_device on public.interfaces(device_id);
create index if not exists idx_interfaces_status on public.interfaces(status);

-- Collectors
create table if not exists public.collectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protocol public.protocol_type not null,
  host inet not null,
  version text,
  devices_count int default 0,
  success_rate numeric(5,2) default 0,
  avg_poll_ms int default 0,
  errors_24h int default 0,
  last_heartbeat_at timestamptz,
  status public.collector_status not null default 'active',
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Alerts
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  severity public.alert_severity not null default 'info',
  title text not null,
  message text,
  device_id uuid references public.devices(id) on delete set null,
  device_name text,
  protocol public.protocol_type,
  trap_oid text,
  acknowledged boolean not null default false,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_alerts_severity on public.alerts(severity);
create index if not exists idx_alerts_ack on public.alerts(acknowledged);
create index if not exists idx_alerts_created on public.alerts(created_at desc);

-- Events / traps feed
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  severity public.alert_severity not null default 'info',
  device_id uuid references public.devices(id) on delete set null,
  device_name text,
  message text not null,
  protocol public.protocol_type,
  trap_oid text,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_created on public.events(created_at desc);

-- SNMP config per device
create table if not exists public.snmp_configs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique references public.devices(id) on delete cascade,
  version text not null default 'v2c' check (version in ('v1','v2c','v3')),
  community text,
  username text,
  auth_protocol text,
  auth_password text,
  priv_protocol text,
  priv_password text,
  poll_interval_s int default 60,
  timeout_s int default 5,
  retries int default 3,
  trap_enabled boolean default true,
  trap_community text,
  updated_at timestamptz not null default now()
);

-- Reports metadata
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period text,
  status text not null default 'ready' check (status in ('ready','generating','failed')),
  file_size text,
  storage_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_devices_updated on public.devices;
create trigger trg_devices_updated
  before update on public.devices
  for each row execute function public.set_updated_at();

drop trigger if exists trg_collectors_updated on public.collectors;
create trigger trg_collectors_updated
  before update on public.collectors
  for each row execute function public.set_updated_at();
