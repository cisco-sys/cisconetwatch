-- Row Level Security policies for CiscoNetWatch
-- Roles: admin, noc_operator, network_engineer, it_management, read_only

-- Helper: current user's app role
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'read_only'::public.app_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.can_write_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in (
    'admin'::public.app_role,
    'noc_operator'::public.app_role,
    'network_engineer'::public.app_role
  );
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.can_ack_alerts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in (
    'admin'::public.app_role,
    'noc_operator'::public.app_role,
    'network_engineer'::public.app_role,
    'it_management'::public.app_role
  );
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.interfaces enable row level security;
alter table public.collectors enable row level security;
alter table public.alerts enable row level security;
alter table public.events enable row level security;
alter table public.snmp_configs enable row level security;
alter table public.reports enable row level security;

-- PROFILES
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or public.current_app_role() in ('it_management'::public.app_role)
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.can_manage_users())
  with check (public.can_manage_users());

-- DEVICES: all authenticated can read; write for ops roles
drop policy if exists devices_select on public.devices;
create policy devices_select on public.devices
  for select to authenticated
  using (true);

drop policy if exists devices_insert on public.devices;
create policy devices_insert on public.devices
  for insert to authenticated
  with check (public.can_write_ops());

drop policy if exists devices_update on public.devices;
create policy devices_update on public.devices
  for update to authenticated
  using (public.can_write_ops())
  with check (public.can_write_ops());

drop policy if exists devices_delete on public.devices;
create policy devices_delete on public.devices
  for delete to authenticated
  using (public.is_admin() or public.current_app_role() = 'network_engineer');

-- INTERFACES
drop policy if exists interfaces_select on public.interfaces;
create policy interfaces_select on public.interfaces
  for select to authenticated
  using (true);

drop policy if exists interfaces_write on public.interfaces;
create policy interfaces_write on public.interfaces
  for all to authenticated
  using (public.can_write_ops())
  with check (public.can_write_ops());

-- COLLECTORS
drop policy if exists collectors_select on public.collectors;
create policy collectors_select on public.collectors
  for select to authenticated
  using (true);

drop policy if exists collectors_write on public.collectors;
create policy collectors_write on public.collectors
  for all to authenticated
  using (public.can_write_ops())
  with check (public.can_write_ops());

-- ALERTS: read all; ack for can_ack; insert for ops + service
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated
  using (true);

drop policy if exists alerts_insert on public.alerts;
create policy alerts_insert on public.alerts
  for insert to authenticated
  with check (public.can_write_ops());

drop policy if exists alerts_update on public.alerts;
create policy alerts_update on public.alerts
  for update to authenticated
  using (public.can_ack_alerts())
  with check (public.can_ack_alerts());

drop policy if exists alerts_delete on public.alerts;
create policy alerts_delete on public.alerts
  for delete to authenticated
  using (public.is_admin());

-- EVENTS
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (true);

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (public.can_write_ops());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.is_admin());

-- SNMP CONFIGS: sensitive — only ops can read/write (not pure read_only / it_management read of secrets)
drop policy if exists snmp_select on public.snmp_configs;
create policy snmp_select on public.snmp_configs
  for select to authenticated
  using (
    public.can_write_ops()
    or public.current_app_role() = 'it_management'::public.app_role
  );

drop policy if exists snmp_write on public.snmp_configs;
create policy snmp_write on public.snmp_configs
  for all to authenticated
  using (public.can_write_ops())
  with check (public.can_write_ops());

-- REPORTS
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated
  using (true);

drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports
  for all to authenticated
  using (
    public.is_admin()
    or public.current_app_role() in (
      'it_management'::public.app_role,
      'network_engineer'::public.app_role
    )
  )
  with check (
    public.is_admin()
    or public.current_app_role() in (
      'it_management'::public.app_role,
      'network_engineer'::public.app_role
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'read_only'::public.app_role)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
