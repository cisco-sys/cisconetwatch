'use client';
import React, { useState } from 'react';
import { AlertTriangle, Radio, XCircle, Info, Clock } from 'lucide-react';

const events = [
  { id: 'evt-001', type: 'trap', severity: 'critical', device: 'SW-CORE-01', message: 'linkDown on GigabitEthernet0/1', time: '2m ago', protocol: 'SNMP' },
  { id: 'evt-002', type: 'threshold', severity: 'major', device: 'RTR-EDGE-03', message: 'Interface Te1/0/1 utilization exceeded 90%', time: '4m ago', protocol: 'NETCONF' },
  { id: 'evt-003', type: 'reachability', severity: 'critical', device: 'FW-DC-02', message: 'Device unreachable — 3 consecutive poll failures', time: '7m ago', protocol: 'SNMP' },
  { id: 'evt-004', type: 'trap', severity: 'major', device: 'SW-CORE-01', message: 'coldStart trap received — device rebooted', time: '12m ago', protocol: 'SNMP' },
  { id: 'evt-005', type: 'threshold', severity: 'minor', device: 'SW-ACC-07', message: 'Packet loss rate 0.34% on Gi0/24', time: '18m ago', protocol: 'SSH' },
  { id: 'evt-006', type: 'info', severity: 'info', device: 'RTR-WAN-01', message: 'BGP neighbor 203.0.113.1 state changed to Established', time: '23m ago', protocol: 'NETCONF' },
  { id: 'evt-007', type: 'trap', severity: 'major', device: 'SW-DIST-02', message: 'authenticationFailure trap from 192.168.1.44', time: '31m ago', protocol: 'SNMP' },
  { id: 'evt-008', type: 'info', severity: 'info', device: 'SW-CORE-02', message: 'Spanning tree topology change detected on VLAN 10', time: '45m ago', protocol: 'SNMP' },
];

const severityConfig = {
  critical: { icon: <XCircle size={13} />, cls: 'text-danger', bg: 'bg-danger/10 border-danger/20' },
  major: { icon: <AlertTriangle size={13} />, cls: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  minor: { icon: <AlertTriangle size={13} />, cls: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  info: { icon: <Info size={13} />, cls: 'text-info', bg: 'bg-info/10 border-info/20' },
};

export default function EventsFeed() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'major'>('all');

  const filtered = filter === 'all' ? events : events.filter((e) => e.severity === filter);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Live Events & Traps</h2>
          <span className="w-2 h-2 rounded-full bg-danger live-pulse" />
        </div>
        <div className="flex gap-1">
          {(['all', 'critical', 'major'] as const).map((f) => (
            <button
              key={`evtfilter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto scrollbar-thin flex-1" style={{ maxHeight: 420 }}>
        {filtered.map((evt) => {
          const sc = severityConfig[evt.severity as keyof typeof severityConfig];
          return (
            <div
              key={evt.id}
              className={`rounded-lg border p-3 ${sc.bg} transition-all duration-150 hover:shadow-md`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 flex-shrink-0 ${sc.cls}`}>{sc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-foreground truncate">
                      {evt.device}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono flex-shrink-0 flex items-center gap-1">
                      <Clock size={10} />
                      {evt.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {evt.message}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`text-xs font-mono uppercase tracking-wide ${sc.cls}`}>
                      {evt.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-mono text-muted-foreground">{evt.protocol}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Showing last 60 min</span>
        <button className="text-xs text-primary hover:text-primary/80 transition-colors">
          View all events →
        </button>
      </div>
    </div>
  );
}
