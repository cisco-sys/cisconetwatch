import React from 'react';
import Badge from '@/components/ui/Badge';
import { TrendingUp, AlertTriangle, Radio, Activity, Wifi } from 'lucide-react';

const evidenceCards = [
  {
    id: 'ev-001',
    metric: 'Interface Utilization',
    device: 'SW-CORE-01 · Gi0/1',
    value: '94%',
    baseline: '71%',
    delta: '+23%',
    relevance: 'high',
    icon: <TrendingUp size={14} />,
    detail: 'Spike began at 19:30 UTC, correlates with first user reports',
  },
  {
    id: 'ev-002',
    metric: 'SNMP Trap Count',
    device: 'SW-CORE-01',
    value: '312 traps/5min',
    baseline: '4 traps/5min',
    delta: '+7700%',
    relevance: 'high',
    icon: <Radio size={14} />,
    detail: 'linkDown/linkUp traps dominate — interface flapping confirmed',
  },
  {
    id: 'ev-003',
    metric: 'Packet Loss Rate',
    device: 'SW-CORE-01 · Gi0/1',
    value: '0.34%',
    baseline: '0.00%',
    delta: 'New',
    relevance: 'high',
    icon: <Wifi size={14} />,
    detail: 'Peaked at 20:08 UTC, coincides with linkDown trap',
  },
  {
    id: 'ev-004',
    metric: 'CRC Errors',
    device: 'SW-CORE-01 · Te1/0/2',
    value: '3 errors',
    baseline: '0',
    delta: 'New',
    relevance: 'medium',
    icon: <AlertTriangle size={14} />,
    detail: 'Physical layer issues on fiber interconnect — possible SFP fault',
  },
  {
    id: 'ev-005',
    metric: 'Device Reachability',
    device: 'RTR-EDGE-03',
    value: 'Unreachable',
    baseline: 'Reachable',
    delta: 'Down',
    relevance: 'high',
    icon: <Activity size={14} />,
    detail: 'Upstream router unreachable since 20:07 UTC — 3 poll failures',
  },
];

const relevanceStyle = {
  high: 'border-danger/30 bg-danger/5',
  medium: 'border-warning/30 bg-warning/5',
  low: 'border-border bg-card',
};

export default function MetricEvidenceCards() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Correlated Metric Evidence</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Metrics that match incident description</p>
      </div>
      <div className="p-4 space-y-3">
        {evidenceCards.map((card) => (
          <div
            key={card.id}
            className={`rounded-xl border p-4 ${relevanceStyle[card.relevance as keyof typeof relevanceStyle]}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={card.relevance === 'high' ? 'text-danger' : 'text-warning'}>
                  {card.icon}
                </span>
                <span className="text-xs font-semibold text-foreground">{card.metric}</span>
              </div>
              <Badge variant={card.relevance === 'high' ? 'danger' : 'warning'}>
                {card.relevance === 'high' ? 'High Relevance' : 'Medium'}
              </Badge>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-2">{card.device}</p>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-lg font-bold font-mono tabular-nums ${card.relevance === 'high' ? 'text-danger' : 'text-warning'}`}>
                {card.value}
              </span>
              <div className="text-xs text-muted-foreground">
                <span className="block">Baseline: {card.baseline}</span>
                <span className="text-danger font-mono">{card.delta}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
