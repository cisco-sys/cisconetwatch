import React from 'react';
import {
  Activity,
  Wifi,
  AlertTriangle,
  Radio,
  TrendingUp,
  Server,
} from 'lucide-react';

const metrics = [
  {
    id: 'metric-device-reachability',
    label: 'Device Reachability',
    value: '44/47',
    sub: '3 unreachable',
    trend: '-2 from 1h ago',
    trendDown: true,
    icon: <Server size={18} />,
    variant: 'warning',
    hero: true,
  },
  {
    id: 'metric-interfaces-up',
    label: 'Interfaces Up',
    value: '312',
    sub: '8 down · 4 admin-down',
    trend: '96.3% up rate',
    trendDown: false,
    icon: <Activity size={18} />,
    variant: 'success',
    hero: false,
  },
  {
    id: 'metric-bandwidth-util',
    label: 'Avg Bandwidth Util',
    value: '67.4%',
    sub: '3 ports >90% saturation',
    trend: '+4.1% vs 1h ago',
    trendDown: true,
    icon: <TrendingUp size={18} />,
    variant: 'warning',
    hero: false,
  },
  {
    id: 'metric-packet-loss',
    label: 'Packet Loss Rate',
    value: '0.23%',
    sub: 'Threshold: 0.10%',
    trend: 'Above threshold',
    trendDown: true,
    icon: <Wifi size={18} />,
    variant: 'danger',
    hero: false,
  },
  {
    id: 'metric-snmp-traps',
    label: 'SNMP Traps (1h)',
    value: '1,847',
    sub: '↑ 340% vs baseline',
    trend: 'Trap storm on SW-CORE-01',
    trendDown: true,
    icon: <Radio size={18} />,
    variant: 'danger',
    hero: false,
  },
  {
    id: 'metric-active-incidents',
    label: 'Active Incidents',
    value: '6',
    sub: '2 critical · 3 major · 1 minor',
    trend: '+2 since last shift',
    trendDown: true,
    icon: <AlertTriangle size={18} />,
    variant: 'accent',
    hero: false,
  },
];

const variantStyles: Record<string, string> = {
  success: 'border-success/20 bg-success/5',
  warning: 'border-warning/20 bg-warning/5',
  danger: 'border-danger/20 bg-danger/5',
  accent: 'border-accent/20 bg-accent/5',
  primary: 'border-primary/20 bg-primary/5',
};

const iconStyles: Record<string, string> = {
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  danger: 'text-danger bg-danger/10',
  accent: 'text-accent bg-accent/10',
  primary: 'text-primary bg-primary/10',
};

const valueStyles: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  accent: 'text-accent',
  primary: 'text-primary',
};

export default function MetricsBentoGrid() {
  const hero = metrics[0];
  const rest = metrics.slice(1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      <div
        className={`col-span-2 rounded-xl border p-4 sm:p-5 ${variantStyles[hero.variant]} transition-all duration-150 hover:shadow-lg`}
      >
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {hero.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{hero.sub}</p>
          </div>
          <span className={`p-2 rounded-lg ${iconStyles[hero.variant]}`}>
            {hero.icon}
          </span>
        </div>
        <p className={`text-4xl sm:text-5xl font-bold tabular-nums font-mono ${valueStyles[hero.variant]}`}>
          {hero.value}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <AlertTriangle size={12} className="text-warning" />
          <span className="text-xs text-warning">{hero.trend}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['SW-CORE-01', 'RTR-EDGE-03', 'FW-DC-02'].map((d) => (
            <span key={`unreachable-${d}`} className="text-xs font-mono bg-danger/10 text-danger border border-danger/20 rounded px-2 py-0.5">
              {d}
            </span>
          ))}
        </div>
      </div>

      {rest.map((m) => (
        <div
          key={m.id}
          className={`rounded-xl border p-3 sm:p-5 ${variantStyles[m.variant]} transition-all duration-150 hover:shadow-lg`}
        >
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest leading-tight">
              {m.label}
            </p>
            <span className={`p-1.5 rounded-lg ${iconStyles[m.variant]} flex-shrink-0`}>
              {m.icon}
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold tabular-nums font-mono ${valueStyles[m.variant]}`}>
            {m.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
          <div className="mt-2 flex items-center gap-1">
            {m.trendDown ? (
              <span className="text-xs text-danger">{m.trend}</span>
            ) : (
              <span className="text-xs text-success">{m.trend}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
