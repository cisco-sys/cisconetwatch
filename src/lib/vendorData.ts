'use client';

export type VendorType = 'cisco' | 'aruba' | 'omada' | 'juniper' | 'fortinet' | 'ubiquiti' | 'mikrotik' | 'huawei';
export type DeviceStatus = 'up' | 'degraded' | 'down';
export type ProtocolType = 'SNMP' | 'NETCONF' | 'SSH' | 'RESTCONF';

export interface VendorDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  vendor: VendorType;
  site: string;
  status: DeviceStatus;
  interfaces: { up: number; down: number; total: number };
  utilization: number;
  protocol: ProtocolType;
  os: string;
  group: string;
  cpu: number;
  memory: number;
  ports: number;
}

export const VENDOR_META: Record<VendorType, { label: string; color: string; bgColor: string; borderColor: string; textColor: string }> = {
  cisco: { label: 'Cisco', color: '#00BCEB', bgColor: 'rgba(0,188,235,0.12)', borderColor: 'rgba(0,188,235,0.3)', textColor: '#00BCEB' },
  aruba: { label: 'Aruba', color: '#FF8300', bgColor: 'rgba(255,131,0,0.12)', borderColor: 'rgba(255,131,0,0.3)', textColor: '#FF8300' },
  omada: { label: 'Omada', color: '#4CAF50', bgColor: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.3)', textColor: '#4CAF50' },
  juniper: { label: 'Juniper', color: '#84CC16', bgColor: 'rgba(132,204,22,0.12)', borderColor: 'rgba(132,204,22,0.3)', textColor: '#84CC16' },
  fortinet: { label: 'Fortinet', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)', textColor: '#EF4444' },
  ubiquiti: { label: 'Ubiquiti', color: '#A78BFA', bgColor: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.3)', textColor: '#A78BFA' },
  mikrotik: { label: 'MikroTik', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)', textColor: '#F59E0B' },
  huawei: { label: 'Huawei', color: '#EC4899', bgColor: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.3)', textColor: '#EC4899' },
};

export const CISCO_MODELS = [
  'Catalyst 2960-X', 'Catalyst 3850-48P', 'Catalyst 9300-48P', 'Catalyst 9500-48Y4C',
  'Nexus 9300-48T', 'ISR 4331', 'ASR 1001-X', 'Firepower 4145', 'Meraki MS250',
];

export const ALL_DEVICES: VendorDevice[] = [
  { id: 'dev-1', name: 'SW-CORE-01', ip: '10.0.1.1', model: 'Catalyst 9500-48Y4C', vendor: 'cisco', site: 'DC-Primary', status: 'up', interfaces: { up: 44, down: 4, total: 48 }, utilization: 67, protocol: 'SNMP', os: 'IOS-XE 17.9.3', group: 'Core', cpu: 34, memory: 52, ports: 48 },
  { id: 'dev-2', name: 'SW-CORE-02', ip: '10.0.1.2', model: 'Catalyst 9500-32C', vendor: 'cisco', site: 'DC-Primary', status: 'up', interfaces: { up: 30, down: 2, total: 32 }, utilization: 54, protocol: 'NETCONF', os: 'IOS-XE 17.9.3', group: 'Core', cpu: 28, memory: 48, ports: 32 },
  { id: 'dev-3', name: 'RTR-EDGE-03', ip: '10.0.2.3', model: 'ASR 1001-X', vendor: 'cisco', site: 'WAN-Edge', status: 'degraded', interfaces: { up: 6, down: 2, total: 8 }, utilization: 88, protocol: 'SNMP', os: 'IOS-XE 17.6.4', group: 'WAN', cpu: 62, memory: 71, ports: 8 },
  { id: 'dev-4', name: 'FW-DC-02', ip: '10.0.3.2', model: 'Firepower 4145', vendor: 'cisco', site: 'DC-Primary', status: 'down', interfaces: { up: 0, down: 16, total: 16 }, utilization: 0, protocol: 'SSH', os: 'FXOS 2.14', group: 'Security', cpu: 0, memory: 0, ports: 16 },
  { id: 'dev-5', name: 'SW-DIST-02', ip: '10.0.4.2', model: 'Catalyst 9300-48P', vendor: 'cisco', site: 'Floor-2', status: 'up', interfaces: { up: 42, down: 6, total: 48 }, utilization: 45, protocol: 'SNMP', os: 'IOS-XE 17.9.1', group: 'Distribution', cpu: 22, memory: 38, ports: 48 },
  { id: 'dev-6', name: 'SW-ACC-07', ip: '10.1.7.1', model: 'Catalyst 2960-X', vendor: 'cisco', site: 'Floor-1', status: 'up', interfaces: { up: 22, down: 2, total: 24 }, utilization: 31, protocol: 'SNMP', os: 'IOS 15.2', group: 'Access', cpu: 15, memory: 42, ports: 24 },
  { id: 'dev-7', name: 'RTR-WAN-01', ip: '10.0.5.1', model: 'ISR 4331', vendor: 'cisco', site: 'WAN-Edge', status: 'up', interfaces: { up: 4, down: 0, total: 4 }, utilization: 58, protocol: 'NETCONF', os: 'IOS-XE 17.6.3', group: 'WAN', cpu: 41, memory: 55, ports: 4 },
  { id: 'dev-8', name: 'ARB-001', ip: '172.16.1.1', model: 'Aruba 2930F-48G', vendor: 'aruba', site: 'Floor-2', status: 'up', interfaces: { up: 40, down: 8, total: 48 }, utilization: 28, protocol: 'SNMP', os: 'ArubaOS 10.2.0', group: 'Access-Layer', cpu: 18, memory: 35, ports: 48 },
  { id: 'dev-9', name: 'OMA-001', ip: '192.168.1.10', model: 'Omada TL-SG3452', vendor: 'omada', site: 'Branch-A', status: 'up', interfaces: { up: 20, down: 4, total: 24 }, utilization: 22, protocol: 'SNMP', os: 'Omada OS 5.2.1', group: 'Access-Layer', cpu: 12, memory: 28, ports: 24 },
  { id: 'dev-10', name: 'JUN-001', ip: '10.20.1.1', model: 'EX4300-48T', vendor: 'juniper', site: 'DC-Secondary', status: 'up', interfaces: { up: 44, down: 4, total: 48 }, utilization: 39, protocol: 'NETCONF', os: 'Junos 21.4R3', group: 'Access', cpu: 25, memory: 44, ports: 48 },
  { id: 'dev-11', name: 'FTN-001', ip: '10.30.1.1', model: 'FortiGate 600E', vendor: 'fortinet', site: 'DC-Primary', status: 'up', interfaces: { up: 12, down: 0, total: 12 }, utilization: 48, protocol: 'SSH', os: 'FortiOS 7.2.5', group: 'Security', cpu: 35, memory: 50, ports: 12 },
  { id: 'dev-12', name: 'UBQ-001', ip: '10.40.1.1', model: 'UniFi Switch Pro 48', vendor: 'ubiquiti', site: 'Branch-B', status: 'up', interfaces: { up: 36, down: 12, total: 48 }, utilization: 18, protocol: 'SNMP', os: 'UniFi OS 3.1', group: 'Access', cpu: 10, memory: 22, ports: 48 },
];

export const TOTAL_PORTS = ALL_DEVICES.reduce((sum, d) => sum + d.ports, 0);
