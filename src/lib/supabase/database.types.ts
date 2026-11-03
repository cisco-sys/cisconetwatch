/** Generated-style types matching supabase/migrations schema */

export type VendorType =
  | 'cisco'
  | 'aruba'
  | 'omada'
  | 'juniper'
  | 'fortinet'
  | 'ubiquiti'
  | 'mikrotik'
  | 'huawei';

export type DeviceStatus = 'up' | 'degraded' | 'down';
export type ProtocolType = 'SNMP' | 'NETCONF' | 'SSH' | 'RESTCONF' | 'TELEMETRY' | 'ICMP';
export type AlertSeverity = 'critical' | 'major' | 'minor' | 'info';
export type CollectorStatus = 'active' | 'degraded' | 'down';
export type AppRole =
  | 'admin'
  | 'noc_operator'
  | 'network_engineer'
  | 'it_management'
  | 'read_only';
export type InterfaceStatus = 'up' | 'down' | 'admin-down';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  model: string | null;
  vendor: VendorType;
  site: string | null;
  status: DeviceStatus;
  protocol: ProtocolType;
  os: string | null;
  device_group: string | null;
  cpu_pct: number | null;
  memory_pct: number | null;
  ports_total: number | null;
  ports_up: number | null;
  ports_down: number | null;
  utilization_pct: number | null;
  serial_number: string | null;
  location: string | null;
  last_poll_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterfaceRow {
  id: string;
  device_id: string;
  if_index: number | null;
  name: string;
  description: string | null;
  status: InterfaceStatus;
  admin_status: 'enabled' | 'disabled';
  speed: string | null;
  duplex: string | null;
  vlan: string | null;
  vlan_mode: 'access' | 'trunk' | null;
  utilization_pct: number | null;
  in_errors: number | null;
  out_errors: number | null;
  in_octets: number | null;
  out_octets: number | null;
  poe: boolean | null;
  poe_watts: number | null;
  connected_device: string | null;
  mac_address: string | null;
  last_update_at: string | null;
  created_at: string;
}

export interface Collector {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  version: string | null;
  devices_count: number | null;
  success_rate: number | null;
  avg_poll_ms: number | null;
  errors_24h: number | null;
  last_heartbeat_at: string | null;
  status: CollectorStatus;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string | null;
  device_id: string | null;
  device_name: string | null;
  protocol: ProtocolType | null;
  trap_oid: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  severity: AlertSeverity;
  device_id: string | null;
  device_name: string | null;
  message: string;
  protocol: ProtocolType | null;
  trap_oid: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  devices_total: number;
  devices_up: number;
  devices_degraded: number;
  devices_down: number;
  interfaces_up: number;
  interfaces_total: number;
  avg_utilization: number;
  alerts_unacked: number;
  alerts_critical: number;
  collectors_active: number;
  collectors_total: number;
  events_1h: number;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>; Update: Partial<Profile> };
      devices: { Row: Device; Insert: Partial<Device> & Pick<Device, 'name' | 'ip'>; Update: Partial<Device> };
      interfaces: { Row: InterfaceRow; Insert: Partial<InterfaceRow> & Pick<InterfaceRow, 'device_id' | 'name'>; Update: Partial<InterfaceRow> };
      collectors: { Row: Collector; Insert: Partial<Collector> & Pick<Collector, 'name' | 'protocol' | 'host'>; Update: Partial<Collector> };
      alerts: { Row: Alert; Insert: Partial<Alert> & Pick<Alert, 'title' | 'severity'>; Update: Partial<Alert> };
      events: { Row: EventRow; Insert: Partial<EventRow> & Pick<EventRow, 'message' | 'severity'>; Update: Partial<EventRow> };
    };
    Functions: {
      get_dashboard_metrics: { Args: Record<string, never>; Returns: DashboardMetrics };
      ack_alert: { Args: { p_alert_id: string }; Returns: Alert };
      ack_alerts_bulk: { Args: { p_severity?: AlertSeverity | null; p_only_unacked?: boolean }; Returns: number };
      list_alerts: { Args: { p_severity?: AlertSeverity | null; p_unacked_only?: boolean; p_limit?: number }; Returns: Alert[] };
      list_devices: {
        Args: {
          p_status?: DeviceStatus | null;
          p_vendor?: VendorType | null;
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Device[];
      };
      get_collector_health: { Args: Record<string, never>; Returns: unknown };
      upsert_device: {
        Args: {
          p_name: string;
          p_ip: string;
          p_model?: string | null;
          p_vendor?: VendorType;
          p_site?: string | null;
          p_protocol?: ProtocolType;
          p_os?: string | null;
          p_device_group?: string | null;
          p_ports_total?: number;
        };
        Returns: Device;
      };
      update_device_metrics: {
        Args: {
          p_device_id: string;
          p_status?: DeviceStatus | null;
          p_cpu_pct?: number | null;
          p_memory_pct?: number | null;
          p_utilization_pct?: number | null;
          p_ports_up?: number | null;
          p_ports_down?: number | null;
        };
        Returns: Device;
      };
      set_interface_admin: { Args: { p_interface_id: string; p_admin_status: string }; Returns: InterfaceRow };
      ingest_event: {
        Args: {
          p_severity: AlertSeverity;
          p_message: string;
          p_device_id?: string | null;
          p_device_name?: string | null;
          p_protocol?: ProtocolType | null;
          p_trap_oid?: string | null;
          p_create_alert?: boolean;
        };
        Returns: { event: EventRow; alert: Alert | null };
      };
      current_app_role: { Args: Record<string, never>; Returns: AppRole };
    };
  };
};
