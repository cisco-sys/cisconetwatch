import React from 'react';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';

const collectors = [
  { id: 'colt-001', name: 'SNMP Collector Primary', protocol: 'SNMP' as const, host: '10.0.1.50', version: 'netwatch-collector 2.4.1', devices: 44, successRate: 93.6, avgPollMs: 142, lastHeartbeat: '5s ago', status: 'active', errors24h: 12 },
  { id: 'colt-002', name: 'NETCONF/YANG Agent', protocol: 'NETCONF' as const, host: '10.0.1.51', version: 'netwatch-collector 2.4.1', devices: 18, successRate: 100, avgPollMs: 318, lastHeartbeat: '3s ago', status: 'active', errors24h: 0 },
  { id: 'colt-003', name: 'SSH/CLI Scraper', protocol: 'SSH' as const, host: '10.0.1.52', version: 'netwatch-collector 2.3.8', devices: 12, successRate: 91.7, avgPollMs: 2140, lastHeartbeat: '45s ago', status: 'degraded', errors24h: 34 },
  { id: 'colt-004', name: 'RESTCONF Poller', protocol: 'RESTCONF' as const, host: '10.0.1.53', version: 'netwatch-collector 2.4.1', devices: 8, successRate: 100, avgPollMs: 87, lastHeartbeat: '4s ago', status: 'active', errors24h: 0 },
  { id: 'colt-005', name: 'gRPC Telemetry Stream', protocol: 'TELEMETRY' as const, host: '10.0.1.54', version: 'netwatch-collector 2.4.0', devices: 6, successRate: 0, avgPollMs: 0, lastHeartbeat: '4m ago', status: 'down', errors24h: 288 },
];

export default function CollectorHealthTable() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Active Collectors</h2>
        <span className="text-xs text-muted-foreground">{collectors.length} collectors registered</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {['Collector', 'Protocol', 'Host', 'Version', 'Devices', 'Success Rate', 'Avg Poll', 'Errors (24h)', 'Last Heartbeat', 'Status'].map((h) => (
                <th key={`colt-th-${h}`} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {collectors.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{c.name}</td>
                <td className="px-4 py-3"><ProtocolBadge protocol={c.protocol} active={c.status !== 'down'} /></td>
                <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{c.host}</span></td>
                <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{c.version}</span></td>
                <td className="px-4 py-3"><span className="font-mono tabular-nums text-foreground">{c.devices}</span></td>
                <td className="px-4 py-3">
                  <span className={`font-mono tabular-nums font-semibold ${c.successRate >= 98 ? 'text-success' : c.successRate >= 85 ? 'text-warning' : 'text-danger'}`}>
                    {c.successRate}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono tabular-nums text-muted-foreground text-xs">
                    {c.avgPollMs > 0 ? `${c.avgPollMs}ms` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono tabular-nums text-xs ${c.errors24h > 0 ? 'text-danger font-semibold' : 'text-muted-foreground'}`}>
                    {c.errors24h}
                  </span>
                </td>
                <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{c.lastHeartbeat}</span></td>
                <td className="px-4 py-3">
                  <Badge
                    variant={c.status === 'active' ? 'success' : c.status === 'degraded' ? 'warning' : 'danger'}
                    dot
                  >
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
