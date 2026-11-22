// Utilidades del módulo IP Scan. Sin dependencias externas.

export const MAX_ADDRESSES = 4096;

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScanConfig {
  targets: string[];
  gateway_ip: string;
  include_gateway: boolean;
  local_subnet: boolean;
  expand: {
    virtualization: boolean;
    wireless: boolean;
    wireless_clients: boolean;
    storage: boolean;
    seed: boolean;
  };
  limits: {
    exclusions: string[];
    max_devices: number | null;
    max_ips: number | null;
    private_only: boolean;
  };
  /** Solo etiquetas (nombre y tipo). NUNCA secretos. */
  credentials: { name: string; type: string }[];
  options: {
    connectivity: 'ping' | 'ping_tcp_credential' | 'ping_tcp';
    dns_lookup: boolean;
    prefer_sysname: boolean;
    max_threads: number;
    ping_timeout_ms: number;
    ping_retries: number;
    snmp_timeout_ms: number;
    snmp_retries: number;
  };
  auto_promote: boolean;
  schedule: { mode: 'once' | 'hourly' | 'daily' | 'weekly' };
}

export const DEFAULT_CONFIG: ScanConfig = {
  targets: [],
  gateway_ip: '',
  include_gateway: true,
  local_subnet: false,
  expand: { virtualization: false, wireless: false, wireless_clients: false, storage: false, seed: false },
  limits: { exclusions: [], max_devices: null, max_ips: null, private_only: true },
  credentials: [{ name: 'public', type: 'SNMP v1' }],
  options: {
    connectivity: 'ping_tcp_credential',
    dns_lookup: true,
    prefer_sysname: true,
    max_threads: 40,
    ping_timeout_ms: 3000,
    ping_retries: 1,
    snmp_timeout_ms: 3000,
    snmp_retries: 1,
  },
  auto_promote: false,
  schedule: { mode: 'once' },
};

export function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim());
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function isPrivateIp(ip: string): boolean {
  const n = ipToInt(ip);
  if (n === null) return false;
  return (
    (n >= ipToInt('10.0.0.0')! && n <= ipToInt('10.255.255.255')!) ||
    (n >= ipToInt('172.16.0.0')! && n <= ipToInt('172.31.255.255')!) ||
    (n >= ipToInt('192.168.0.0')! && n <= ipToInt('192.168.255.255')!)
  );
}

export interface ParsedTargets {
  entries: string[];
  total: number;
  errors: string[];
  hasPublic: boolean;
}

/** Acepta, una por línea (o separadas por coma): IP, rango "a - b", o CIDR. */
export function parseTargets(text: string): ParsedTargets {
  const entries: string[] = [];
  const errors: string[] = [];
  let total = 0;
  let hasPublic = false;

  const items = text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const item of items) {
    const cidr = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(item);
    const range = /^(\d+\.\d+\.\d+\.\d+)\s*-\s*(\d+\.\d+\.\d+\.\d+|\d{1,3})$/.exec(item);

    if (cidr) {
      const base = ipToInt(cidr[1]);
      const prefix = Number(cidr[2]);
      if (base === null || prefix < 16 || prefix > 32) {
        errors.push(`"${item}": CIDR no válido (usa una máscara entre /16 y /32).`);
        continue;
      }
      const size = 2 ** (32 - prefix);
      total += size > 2 ? size - 2 : size;
      if (!isPrivateIp(cidr[1])) hasPublic = true;
      entries.push(item);
    } else if (range) {
      const start = ipToInt(range[1]);
      let end = ipToInt(range[2]);
      if (end === null && /^\d{1,3}$/.test(range[2]) && start !== null) {
        end = (start & 0xffffff00) + Number(range[2]);
      }
      if (start === null || end === null || end < start || Number(range[2]) > 255) {
        errors.push(`"${item}": rango no válido.`);
        continue;
      }
      total += end - start + 1;
      if (!isPrivateIp(range[1])) hasPublic = true;
      entries.push(item);
    } else if (ipToInt(item) !== null) {
      total += 1;
      if (!isPrivateIp(item)) hasPublic = true;
      entries.push(item);
    } else {
      errors.push(`"${item}": no es una IP, rango ni CIDR (los nombres de host no se admiten aquí).`);
    }
  }

  return { entries, total, errors, hasPublic };
}

/** Para pintar el mapa de la subred: solo un CIDR único de /22 a /30. */
export function cidrCells(cidr: string): { base: number; size: number } | null {
  const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(cidr.trim());
  if (!m) return null;
  const prefix = Number(m[2]);
  const ip = ipToInt(m[1]);
  if (ip === null || prefix < 22 || prefix > 30) return null;
  const size = 2 ** (32 - prefix);
  const base = (ip & (~(size - 1) >>> 0)) >>> 0;
  return { base, size };
}

export function cleanInet(ip: string): string {
  return ip.replace(/\/\d+$/, '');
}

export function compareIp(a: string, b: string): number {
  return (ipToInt(cleanInet(a)) ?? 0) - (ipToInt(cleanInet(b)) ?? 0);
}

export const VENDORS = ['cisco', 'aruba', 'omada', 'juniper', 'fortinet', 'ubiquiti', 'mikrotik', 'huawei'] as const;

export function vendorFromHint(hint: string | null | undefined): (typeof VENDORS)[number] | undefined {
  const h = (hint ?? '').toLowerCase();
  return VENDORS.find((v) => h.includes(v));
}
