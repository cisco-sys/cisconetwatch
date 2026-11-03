-- Optional demo seed (run after schema). Safe to re-run with ON CONFLICT where possible.

-- Demo devices
insert into public.devices (name, ip, model, vendor, site, status, protocol, os, device_group, cpu_pct, memory_pct, ports_total, ports_up, ports_down, utilization_pct)
values
  ('SW-CORE-01', '10.0.0.1', 'Catalyst 9500-48Y4C', 'cisco', 'DC-Primary', 'degraded', 'SNMP', 'IOS-XE 17.9.3a', 'Core', 34, 61, 48, 46, 2, 67),
  ('SW-CORE-02', '10.0.0.2', 'Catalyst 9500-32C', 'cisco', 'DC-Primary', 'up', 'NETCONF', 'IOS-XE 17.9.3', 'Core', 28, 48, 32, 30, 2, 54),
  ('RTR-EDGE-03', '10.0.2.3', 'ASR 1001-X', 'cisco', 'WAN-Edge', 'degraded', 'SNMP', 'IOS-XE 17.6.4', 'WAN', 62, 71, 8, 6, 2, 88),
  ('FW-DC-02', '10.0.3.2', 'Firepower 4145', 'cisco', 'DC-Primary', 'down', 'SSH', 'FXOS 2.14', 'Security', 0, 0, 16, 0, 16, 0),
  ('SW-DIST-02', '10.0.4.2', 'Catalyst 9300-48P', 'cisco', 'Floor-2', 'up', 'SNMP', 'IOS-XE 17.9.1', 'Distribution', 22, 38, 48, 42, 6, 45),
  ('SW-ACC-07', '10.1.7.1', 'Catalyst 2960-X', 'cisco', 'Floor-1', 'up', 'SNMP', 'IOS 15.2', 'Access', 15, 42, 24, 22, 2, 31),
  ('RTR-WAN-01', '10.0.5.1', 'ISR 4331', 'cisco', 'WAN-Edge', 'up', 'NETCONF', 'IOS-XE 17.6.3', 'WAN', 41, 55, 4, 4, 0, 58),
  ('ARB-001', '172.16.1.1', 'Aruba 2930F-48G', 'aruba', 'Floor-2', 'up', 'SNMP', 'ArubaOS 10.2.0', 'Access-Layer', 18, 35, 48, 40, 8, 28)
on conflict (ip) do nothing;

-- Demo collectors
insert into public.collectors (name, protocol, host, version, devices_count, success_rate, avg_poll_ms, errors_24h, last_heartbeat_at, status)
select * from (values
  ('SNMP Collector Primary', 'SNMP'::public.protocol_type, '10.0.1.50'::inet, 'netwatch-collector 2.4.1', 44, 93.6, 142, 12, now() - interval '5 seconds', 'active'::public.collector_status),
  ('NETCONF/YANG Agent', 'NETCONF'::public.protocol_type, '10.0.1.51'::inet, 'netwatch-collector 2.4.1', 18, 100.0, 318, 0, now() - interval '3 seconds', 'active'::public.collector_status),
  ('SSH/CLI Scraper', 'SSH'::public.protocol_type, '10.0.1.52'::inet, 'netwatch-collector 2.3.8', 12, 91.7, 2140, 34, now() - interval '45 seconds', 'degraded'::public.collector_status),
  ('RESTCONF Poller', 'RESTCONF'::public.protocol_type, '10.0.1.53'::inet, 'netwatch-collector 2.4.1', 8, 100.0, 87, 0, now() - interval '4 seconds', 'active'::public.collector_status),
  ('gRPC Telemetry Stream', 'TELEMETRY'::public.protocol_type, '10.0.1.54'::inet, 'netwatch-collector 2.4.0', 6, 0.0, 0, 288, now() - interval '4 minutes', 'down'::public.collector_status)
) as v(name, protocol, host, version, devices_count, success_rate, avg_poll_ms, errors_24h, last_heartbeat_at, status)
where not exists (select 1 from public.collectors c where c.name = v.name);

-- Demo alerts
insert into public.alerts (severity, title, message, device_name, protocol, acknowledged)
select * from (values
  ('critical'::public.alert_severity, 'Device unreachable', '3 consecutive SNMP poll failures — device marked unreachable', 'FW-DC-02', 'SNMP'::public.protocol_type, false),
  ('critical'::public.alert_severity, 'linkDown trap', 'GigabitEthernet0/7 went operationally down', 'SW-CORE-01', 'SNMP'::public.protocol_type, false),
  ('major'::public.alert_severity, 'High utilization', 'Gi0/1 utilization 94% — threshold 90%', 'SW-CORE-01', 'NETCONF'::public.protocol_type, false),
  ('major'::public.alert_severity, 'Trap storm', '1,847 SNMP traps in last hour — 340% above baseline', 'SW-CORE-01', 'SNMP'::public.protocol_type, true),
  ('minor'::public.alert_severity, 'Packet loss', 'Packet loss 0.34% on Gi0/24 — above 0.10% threshold', 'SW-ACC-07', 'SSH'::public.protocol_type, true)
) as v(severity, title, message, device_name, protocol, acknowledged)
where not exists (select 1 from public.alerts a where a.title = v.title and a.device_name = v.device_name);
