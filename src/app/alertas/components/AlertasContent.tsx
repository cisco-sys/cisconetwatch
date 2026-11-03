'use client';
import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { AlertTriangle, XCircle, Info, Bell, Filter } from 'lucide-react';

const alerts = [
  { id: 'a1', severity: 'critical', title: 'Device unreachable', device: 'FW-DC-02', message: '3 consecutive SNMP poll failures — device marked unreachable', time: '7m ago', ack: false },
  { id: 'a2', severity: 'critical', title: 'linkDown trap', device: 'SW-CORE-01', message: 'GigabitEthernet0/7 went operationally down', time: '2m ago', ack: false },
  { id: 'a3', severity: 'major', title: 'High utilization', device: 'SW-CORE-01', message: 'Gi0/1 utilization 94% — threshold 90%', time: '4m ago', ack: false },
  { id: 'a4', severity: 'major', title: 'Trap storm', device: 'SW-CORE-01', message: '1,847 SNMP traps in last hour — 340% above baseline', time: '12m ago', ack: true },
  { id: 'a5', severity: 'major', title: 'Upstream degraded', device: 'RTR-EDGE-03', message: 'BGP sessions unstable — peer flapping detected', time: '18m ago', ack: false },
  { id: 'a6', severity: 'minor', title: 'Packet loss', device: 'SW-ACC-07', message: 'Packet loss 0.34% on Gi0/24 — above 0.10% threshold', time: '25m ago', ack: true },
  { id: 'a7', severity: 'info', title: 'Topology change', device: 'SW-CORE-02', message: 'STP topology change on VLAN 10', time: '45m ago', ack: true },
  { id: 'a8', severity: 'info', title: 'BGP established', device: 'RTR-WAN-01', message: 'BGP neighbor 203.0.113.1 state Established', time: '1h ago', ack: true },
];

const severityConfig = {
  critical: { icon: <XCircle size={14} />, cls: 'text-danger', badge: 'danger' as const, bg: 'bg-danger/10 border-danger/20' },
  major: { icon: <AlertTriangle size={14} />, cls: 'text-accent', badge: 'accent' as const, bg: 'bg-accent/10 border-accent/20' },
  minor: { icon: <AlertTriangle size={14} />, cls: 'text-warning', badge: 'warning' as const, bg: 'bg-warning/10 border-warning/20' },
  info: { icon: <Info size={14} />, cls: 'text-info', badge: 'info' as const, bg: 'bg-info/10 border-info/20' },
};

export default function AlertasContent() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'major' | 'unacked'>('all');

  const filtered = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'unacked') return !a.ack;
    return a.severity === filter;
  });

  const unacked = alerts.filter((a) => !a.ack).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Alerts & Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active and recent alerts across the managed network
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 self-start">
          <Bell size={14} className="text-danger" />
          <span className="text-xs font-mono text-danger">{unacked} unacknowledged</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'critical', 'major', 'unacked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unacked' ? 'Unacked' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => {
          const sc = severityConfig[alert.severity as keyof typeof severityConfig];
          return (
            <div
              key={alert.id}
              className={`rounded-xl border p-4 ${sc.bg} ${alert.ack ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex-shrink-0 ${sc.cls}`}>{sc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{alert.title}</span>
                    <Badge variant={sc.badge}>{alert.severity}</Badge>
                    {alert.ack && <Badge variant="info">Acked</Badge>}
                    <span className="text-xs font-mono text-muted-foreground ml-auto">{alert.time}</span>
                  </div>
                  <p className="text-xs font-mono text-primary mb-1">{alert.device}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
