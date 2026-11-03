import React from 'react';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const collectors = [
  {
    id: 'col-snmp-primary',
    name: 'SNMP Collector Primary',
    protocol: 'SNMP' as const,
    host: '10.0.1.50',
    polled: 47,
    success: 44,
    interval: '60s',
    lastPoll: '12s ago',
    status: 'active',
  },
  {
    id: 'col-netconf-01',
    name: 'NETCONF/YANG Agent',
    protocol: 'NETCONF' as const,
    host: '10.0.1.51',
    polled: 18,
    success: 18,
    interval: '30s',
    lastPoll: '8s ago',
    status: 'active',
  },
  {
    id: 'col-ssh-scraper',
    name: 'SSH/CLI Scraper',
    protocol: 'SSH' as const,
    host: '10.0.1.52',
    polled: 12,
    success: 11,
    interval: '120s',
    lastPoll: '45s ago',
    status: 'degraded',
  },
  {
    id: 'col-restconf-01',
    name: 'RESTCONF Poller',
    protocol: 'RESTCONF' as const,
    host: '10.0.1.53',
    polled: 8,
    success: 8,
    interval: '30s',
    lastPoll: '5s ago',
    status: 'active',
  },
  {
    id: 'col-telemetry-01',
    name: 'gRPC Telemetry Stream',
    protocol: 'TELEMETRY' as const,
    host: '10.0.1.54',
    polled: 6,
    success: 0,
    interval: 'stream',
    lastPoll: '4m ago',
    status: 'down',
  },
];

export default function CollectorStatusRow() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Collection Protocol Status</h2>
        <span className="text-xs text-muted-foreground font-mono">5 collectors active</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {collectors.map((c) => {
          const successRate = c.polled > 0 ? Math.round((c.success / c.polled) * 100) : 0;
          const statusIcon =
            c.status === 'active' ? <CheckCircle2 size={14} className="text-success" /> :
            c.status === 'degraded' ? <AlertCircle size={14} className="text-warning" /> :
            <XCircle size={14} className="text-danger" />;
          return (
            <div
              key={c.id}
              className={`rounded-lg border p-3 ${
                c.status === 'active' ? 'border-success/20 bg-success/5' :
                c.status === 'degraded' ? 'border-warning/20 bg-warning/5' : 'border-danger/20 bg-danger/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <ProtocolBadge protocol={c.protocol} active={c.status !== 'down'} />
                {statusIcon}
              </div>
              <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.host}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-sm font-bold font-mono tabular-nums ${
                  successRate >= 95 ? 'text-success' :
                  successRate >= 80 ? 'text-warning' : 'text-danger'
                }`}>
                  {successRate}%
                </span>
                <span className="text-xs text-muted-foreground font-mono">{c.lastPoll}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    successRate >= 95 ? 'bg-success' :
                    successRate >= 80 ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
