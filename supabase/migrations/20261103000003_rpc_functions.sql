-- RPC functions for CiscoNetWatch (callable via supabase.rpc)

-- Dashboard KPI snapshot
create or replace function public.get_dashboard_metrics()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'devices_total', (select count(*) from public.devices),
    'devices_up', (select count(*) from public.devices where status = 'up'),
    'devices_degraded', (select count(*) from public.devices where status = 'degraded'),
    'devices_down', (select count(*) from public.devices where status = 'down'),
    'interfaces_up', (select coalesce(sum(ports_up), 0) from public.devices),
    'interfaces_total', (select coalesce(sum(ports_total), 0) from public.devices),
    'avg_utilization', (select coalesce(round(avg(utilization_pct)::numeric, 1), 0) from public.devices where status <> 'down'),
    'alerts_unacked', (select count(*) from public.alerts where not acknowledged),
    'alerts_critical', (select count(*) from public.alerts where severity = 'critical' and not acknowledged),
    'collectors_active', (select count(*) from public.collectors where status = 'active'),
    'collectors_total', (select count(*) from public.collectors),
    'events_1h', (select count(*) from public.events where created_at > now() - interval '1 hour')
  ) into result;
  return result;
end;
$$;

-- Acknowledge alert
create or replace function public.ack_alert(p_alert_id uuid)
returns public.alerts
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.alerts;
begin
  if not public.can_ack_alerts() then
    raise exception 'not authorized to acknowledge alerts' using errcode = '42501';
  end if;

  update public.alerts
  set
    acknowledged = true,
    acknowledged_by = auth.uid(),
    acknowledged_at = now()
  where id = p_alert_id
  returning * into row;

  if row.id is null then
    raise exception 'alert not found' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

-- Bulk ack alerts by severity or all unacked
create or replace function public.ack_alerts_bulk(
  p_severity public.alert_severity default null,
  p_only_unacked boolean default true
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  n int;
begin
  if not public.can_ack_alerts() then
    raise exception 'not authorized to acknowledge alerts' using errcode = '42501';
  end if;

  update public.alerts
  set
    acknowledged = true,
    acknowledged_by = auth.uid(),
    acknowledged_at = now()
  where (not p_only_unacked or acknowledged = false)
    and (p_severity is null or severity = p_severity);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Upsert device (add or update by IP)
create or replace function public.upsert_device(
  p_name text,
  p_ip inet,
  p_model text default null,
  p_vendor public.vendor_type default 'cisco',
  p_site text default null,
  p_protocol public.protocol_type default 'SNMP',
  p_os text default null,
  p_device_group text default null,
  p_ports_total int default 0
)
returns public.devices
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.devices;
begin
  if not public.can_write_ops() then
    raise exception 'not authorized to manage devices' using errcode = '42501';
  end if;

  insert into public.devices (
    name, ip, model, vendor, site, protocol, os, device_group, ports_total, created_by
  ) values (
    p_name, p_ip, p_model, p_vendor, p_site, p_protocol, p_os, p_device_group, p_ports_total, auth.uid()
  )
  on conflict (ip) do update set
    name = excluded.name,
    model = coalesce(excluded.model, public.devices.model),
    vendor = excluded.vendor,
    site = coalesce(excluded.site, public.devices.site),
    protocol = excluded.protocol,
    os = coalesce(excluded.os, public.devices.os),
    device_group = coalesce(excluded.device_group, public.devices.device_group),
    ports_total = coalesce(nullif(excluded.ports_total, 0), public.devices.ports_total),
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

-- Update device live metrics (from collectors)
create or replace function public.update_device_metrics(
  p_device_id uuid,
  p_status public.device_status default null,
  p_cpu_pct numeric default null,
  p_memory_pct numeric default null,
  p_utilization_pct numeric default null,
  p_ports_up int default null,
  p_ports_down int default null
)
returns public.devices
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.devices;
begin
  if not public.can_write_ops() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.devices set
    status = coalesce(p_status, status),
    cpu_pct = coalesce(p_cpu_pct, cpu_pct),
    memory_pct = coalesce(p_memory_pct, memory_pct),
    utilization_pct = coalesce(p_utilization_pct, utilization_pct),
    ports_up = coalesce(p_ports_up, ports_up),
    ports_down = coalesce(p_ports_down, ports_down),
    last_poll_at = now(),
    updated_at = now()
  where id = p_device_id
  returning * into row;

  if row.id is null then
    raise exception 'device not found' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

-- Toggle interface admin status (port enable/disable)
create or replace function public.set_interface_admin(
  p_interface_id uuid,
  p_admin_status text
)
returns public.interfaces
language plpgsql
security invoker
set search_path = public
as $$
declare
  row public.interfaces;
begin
  if not public.can_write_ops() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_admin_status not in ('enabled', 'disabled') then
    raise exception 'admin_status must be enabled or disabled';
  end if;

  update public.interfaces set
    admin_status = p_admin_status,
    status = case
      when p_admin_status = 'disabled' then 'admin-down'::public.interface_status
      when status = 'admin-down' then 'down'::public.interface_status
      else status
    end,
    last_update_at = now()
  where id = p_interface_id
  returning * into row;

  if row.id is null then
    raise exception 'interface not found' using errcode = 'P0002';
  end if;

  return row;
end;
$$;

-- Recent alerts with optional filters
create or replace function public.list_alerts(
  p_severity public.alert_severity default null,
  p_unacked_only boolean default false,
  p_limit int default 50
)
returns setof public.alerts
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.alerts
  where (p_severity is null or severity = p_severity)
    and (not p_unacked_only or acknowledged = false)
  order by created_at desc
  limit greatest(1, least(p_limit, 200));
$$;

-- Device inventory with filters
create or replace function public.list_devices(
  p_status public.device_status default null,
  p_vendor public.vendor_type default null,
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns setof public.devices
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.devices d
  where (p_status is null or d.status = p_status)
    and (p_vendor is null or d.vendor = p_vendor)
    and (
      p_search is null
      or d.name ilike '%' || p_search || '%'
      or host(d.ip) like '%' || p_search || '%'
      or coalesce(d.model, '') ilike '%' || p_search || '%'
    )
  order by d.name
  limit greatest(1, least(p_limit, 500))
  offset greatest(0, p_offset);
$$;

-- Collector health summary
create or replace function public.get_collector_health()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'protocol', protocol,
      'host', host,
      'status', status,
      'devices_count', devices_count,
      'success_rate', success_rate,
      'avg_poll_ms', avg_poll_ms,
      'errors_24h', errors_24h,
      'last_heartbeat_at', last_heartbeat_at
    )
    order by name
  ), '[]'::jsonb)
  from public.collectors;
$$;

-- Insert event + optional linked alert for critical/major
create or replace function public.ingest_event(
  p_severity public.alert_severity,
  p_message text,
  p_device_id uuid default null,
  p_device_name text default null,
  p_protocol public.protocol_type default null,
  p_trap_oid text default null,
  p_create_alert boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  ev public.events;
  al public.alerts;
begin
  if not public.can_write_ops() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.events (severity, message, device_id, device_name, protocol, trap_oid)
  values (p_severity, p_message, p_device_id, p_device_name, p_protocol, p_trap_oid)
  returning * into ev;

  if p_create_alert or p_severity in ('critical', 'major') then
    insert into public.alerts (severity, title, message, device_id, device_name, protocol, trap_oid)
    values (
      p_severity,
      left(p_message, 120),
      p_message,
      p_device_id,
      p_device_name,
      p_protocol,
      p_trap_oid
    )
    returning * into al;
  end if;

  return jsonb_build_object(
    'event', to_jsonb(ev),
    'alert', to_jsonb(al)
  );
end;
$$;

-- Grant execute on RPCs to authenticated
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_write_ops() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.can_ack_alerts() to authenticated;
grant execute on function public.get_dashboard_metrics() to authenticated;
grant execute on function public.ack_alert(uuid) to authenticated;
grant execute on function public.ack_alerts_bulk(public.alert_severity, boolean) to authenticated;
grant execute on function public.upsert_device(text, inet, text, public.vendor_type, text, public.protocol_type, text, text, int) to authenticated;
grant execute on function public.update_device_metrics(uuid, public.device_status, numeric, numeric, numeric, int, int) to authenticated;
grant execute on function public.set_interface_admin(uuid, text) to authenticated;
grant execute on function public.list_alerts(public.alert_severity, boolean, int) to authenticated;
grant execute on function public.list_devices(public.device_status, public.vendor_type, text, int, int) to authenticated;
grant execute on function public.get_collector_health() to authenticated;
grant execute on function public.ingest_event(public.alert_severity, text, uuid, text, public.protocol_type, text, boolean) to authenticated;
