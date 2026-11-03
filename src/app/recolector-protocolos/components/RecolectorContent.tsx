'use client';
import React from 'react';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import { Radio, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const collectors = [
  { id: 'c1', name: 'SNMP Collector Primary', protocol: 'SNMP' as const, host: '10.0.1.50', devices: 44, success: 93.6, status: 'active', last: '5s ago' },
  { id: 'c2', name: 'NETCONF/YANG Agent', protocol: 'NETCONF' as const, host: '10.0.1.51', devices: 18, success: 100, status: 'active', last: '3s ago' },
  { id: 'c3', name: 'SSH/CLI Scraper', protocol: 'SSH' as const, host: '10.0.1.52', devices: 12, success: 91.7, status: 'degraded', last: '45s ago' },
  { id: 'c4', name: 'RESTCONF Poller', protocol: 'RESTCONF' as const, host: '10.0.1.53', devices: 8, success: 100, status: 'active', last: '4s ago' },
  { id: 'c5', name: 'gRPC Telemetry Stream', protocol: 'TELEMETRY' as const, host: '10.0.1.54', devices: 6, success: 0, status: 'down', last: '4m ago' },
];

export default function RecolectorContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Radio size={20} className="text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Protocol Collectors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Status of SNMP, NETCONF, SSH, RESTCONF and telemetry agents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collectors.map((c) => {
          const icon =
            c.status === 'active' ? <CheckCircle2 size={16} className="text-success" /> :
            c.status === 'degraded' ? <AlertCircle size={16} className="text-warning" /> :
            <XCircle size={16} className="text-danger" />;
          return (
            <div
              key={c.id}
              className={`rounded-xl border p-4 ${
                c.status === 'active' ? 'border-success/20 bg-success/5' :
                c.status === 'degraded' ? 'border-warning/20 bg-warning/5' :
                'border-danger/20 bg-danger/5'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <ProtocolBadge protocol={c.protocol as any} active={c.status !== 'down'} />
                {icon}
              </div>
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.host}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.devices} devices</span>
                <span className={`font-mono font-semibold ${
                  c.success >= 95 ? 'text-success' : c.success >= 80 ? 'text-warning' : 'text-danger'
                }`}>
                  {c.success}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">Last: {c.last}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
