import { getSupabaseBrowserClient } from './client';
import type {
  Alert,
  AlertSeverity,
  DashboardMetrics,
  Device,
  DeviceStatus,
  VendorType,
} from './database.types';

/** Typed helpers for supabase.rpc — respect RLS via session */

export async function rpcGetDashboardMetrics(): Promise<DashboardMetrics | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('get_dashboard_metrics');
  if (error) throw error;
  return data as DashboardMetrics;
}

export async function rpcListAlerts(opts?: {
  severity?: AlertSeverity | null;
  unackedOnly?: boolean;
  limit?: number;
}): Promise<Alert[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('list_alerts', {
    p_severity: opts?.severity ?? null,
    p_unacked_only: opts?.unackedOnly ?? false,
    p_limit: opts?.limit ?? 50,
  });
  if (error) throw error;
  return (data as Alert[]) ?? [];
}

export async function rpcAckAlert(alertId: string): Promise<Alert> {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.rpc('ack_alert', { p_alert_id: alertId });
  if (error) throw error;
  return data as Alert;
}

export async function rpcListDevices(opts?: {
  status?: DeviceStatus | null;
  vendor?: VendorType | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<Device[]> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('list_devices', {
    p_status: opts?.status ?? null,
    p_vendor: opts?.vendor ?? null,
    p_search: opts?.search ?? null,
    p_limit: opts?.limit ?? 100,
    p_offset: opts?.offset ?? 0,
  });
  if (error) throw error;
  return (data as Device[]) ?? [];
}

export async function rpcUpsertDevice(input: {
  name: string;
  ip: string;
  model?: string;
  vendor?: VendorType;
  site?: string;
  protocol?: Device['protocol'];
  os?: string;
  device_group?: string;
  ports_total?: number;
}): Promise<Device> {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.rpc('upsert_device', {
    p_name: input.name,
    p_ip: input.ip,
    p_model: input.model ?? null,
    p_vendor: input.vendor ?? 'cisco',
    p_site: input.site ?? null,
    p_protocol: input.protocol ?? 'SNMP',
    p_os: input.os ?? null,
    p_device_group: input.device_group ?? null,
    p_ports_total: input.ports_total ?? 0,
  });
  if (error) throw error;
  return data as Device;
}

export async function rpcGetCollectorHealth(): Promise<unknown> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc('get_collector_health');
  if (error) throw error;
  return data;
}
