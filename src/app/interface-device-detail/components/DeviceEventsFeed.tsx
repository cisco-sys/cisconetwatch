import React from 'react';
import Badge from '@/components/ui/Badge';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

const deviceEvents = [
  { id: 'dev-evt-001', severity: 'critical', message: 'linkDown trap on GigabitEthernet0/7 — interface went operationally down', time: '2026-09-30 20:08:12', protocol: 'SNMP', trapOid: '1.3.6.1.6.3.1.1.5.3' },
  { id: 'dev-evt-002', severity: 'major', message: 'Interface GigabitEthernet0/1 utilization exceeded 90% threshold (current: 94%)', time: '2026-09-30 19:55:40', protocol: 'NETCONF', trapOid: 'N/A' },
  { id: 'dev-evt-003', severity: 'major', message: 'CRC error rate increasing on TenGigabitEthernet1/0/2 — 3 CRC errors in last 5 minutes', time: '2026-09-30 19:42:18', protocol: 'SNMP', trapOid: '1.3.6.1.2.1.2.2.1.14' },
  { id: 'dev-evt-004', severity: 'minor', message: 'Packet loss 0.34% detected on TenGigabitEthernet1/0/2 — above 0.10% threshold', time: '2026-09-30 18:30:05', protocol: 'SSH', trapOid: 'N/A' },
  { id: 'dev-evt-005', severity: 'info', message: 'Spanning tree topology change detected on VLAN 20 — port Gi0/3 transitioned to Forwarding', time: '2026-09-30 15:12:44', protocol: 'SNMP', trapOid: '1.3.6.1.2.1.17.0.1' },
  { id: 'dev-evt-006', severity: 'info', message: 'OSPF neighbor 10.0.0.2 adjacency re-established on GigabitEthernet0/5', time: '2026-09-30 12:08:30', protocol: 'NETCONF', trapOid: 'N/A' },
  { id: 'dev-evt-007', severity: 'major', message: 'coldStart trap — device SW-CORE-01 rebooted (power cycle detected)', time: '2026-09-13 06:15:00', protocol: 'SNMP', trapOid: '1.3.6.1.6.3.1.1.5.1' },
];

const severityConfig = {
  critical: { icon: <XCircle size={14} />, cls: 'text-danger', badge: 'danger' as const },
  major: { icon: <AlertTriangle size={14} />, cls: 'text-accent', badge: 'accent' as const },
  minor: { icon: <AlertTriangle size={14} />, cls: 'text-warning', badge: 'warning' as const },
  info: { icon: <Info size={14} />, cls: 'text-info', badge: 'info' as const },
};

export default function DeviceEventsFeed() {
  return (
    <div className="space-y-3">
      {deviceEvents.map((evt) => {
        const sc = severityConfig[evt.severity as keyof typeof severityConfig];
        return (
          <div
            key={evt.id}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex-shrink-0 ${sc.cls}`}>{sc.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                  <Badge variant={sc.badge}>{evt.severity.toUpperCase()}</Badge>
                  <span className="text-xs font-mono text-muted-foreground">{evt.time}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{evt.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                    {evt.protocol}
                  </span>
                  {evt.trapOid !== 'N/A' && (
                    <span className="text-xs font-mono text-muted-foreground">
                      OID: {evt.trapOid}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
