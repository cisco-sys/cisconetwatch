-- Default new devices to "unknown" (unverified). Never imply up/reachable without a collector check.
-- Also stop treating inventory insert as a successful ping.

do $$ begin
  alter type public.device_status add value if not exists 'unknown';
exception
  when duplicate_object then null;
end $$;

-- Postgres may require the new enum value committed before use as default in same txn on some versions;
-- use a separate statement block.
alter table public.devices
  alter column status set default 'unknown';

-- Optional: flip existing never-polled demo rows that still say "up" with no last_poll_at
update public.devices
set status = 'unknown'
where last_poll_at is null
  and status = 'up';

-- upsert_device: on insert, force status unknown (do not inherit table default races)
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
    name, ip, model, vendor, site, protocol, os, device_group, ports_total, status, created_by
  ) values (
    p_name, p_ip, p_model, p_vendor, p_site, p_protocol, p_os, p_device_group, p_ports_total,
    'unknown'::public.device_status,
    auth.uid()
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
    -- do not set status to up on upsert; collector owns reachability
    updated_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.upsert_device(text, inet, text, public.vendor_type, text, public.protocol_type, text, text, int) to authenticated;
