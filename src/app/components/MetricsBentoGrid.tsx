'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Radio, Server, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Metrics {
  devices_total: number;
  devices_up: number;
  devices_degraded: number;
  devices_down: number;
  interfaces_up: number;
  interfaces_total: number;
  avg_utilization: number;
  alerts_unacked: number;
  alerts_critical: number;
  collectors_active: number;
  collectors_total: number;
  events_1h: number;
}

const empty: Metrics = {
  devices_total: 0,
  devices_up: 0,
  devices_degraded: 0,
  devices_down: 0,
  interfaces_up: 0,
  interfaces_total: 0,
  avg_utilization: 0,
  alerts_unacked: 0,
  alerts_critical: 0,
  collectors_active: 0,
  collectors_total: 0,
  events_1h: 0,
};

export default function MetricsBentoGrid() {
  const [m, setM] = useState<Metrics>(empty);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc('get_dashboard_metrics');
    if (data && typeof data === 'object') setM({ ...empty, ...(data as Metrics) });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading metrics…
      </div>
    );
  }

  const reach =
    m.devices_total > 0
      ? `${m.devices_up}/${m.devices_total}`
      : '0/0';
  const unreach = m.devices_down + m.devices_degraded;
  const upRate =
    m.interfaces_total > 0
      ? `${((m.interfaces_up / m.interfaces_total) * 100).toFixed(1)}% up`
      : 'No interfaces';

  const cards = [
    {
      id: 'reach',
      label: 'Device Reachability',
      value: reach,
      sub:
        m.devices_total === 0
          ? 'Inventory empty — no collector verification yet'
          : `${unreach} not fully up (down/degraded/unknown)`,
      icon: <Server size={18} />,
      variant: unreach > 0 ? 'warning' : m.devices_total === 0 ? 'primary' : 'success',
      hero: true,
    },
    {
      id: 'ifaces',
      label: 'Interfaces Up',
      value: String(m.interfaces_up),
      sub: `${m.interfaces_total} total · ${upRate}`,
      icon: <Activity size={18} />,
      variant: 'success',
      hero: false,
    },
    {
      id: 'util',
      label: 'Avg Utilization',
      value: `${Number(m.avg_utilization ?? 0).toFixed(1)}%`,
      sub: m.devices_total === 0 ? 'No polled devices' : 'From last collector metrics',
      icon: <Activity size={18} />,
      variant: Number(m.avg_utilization) > 80 ? 'warning' : 'primary',
      hero: false,
    },
    {
      id: 'events',
      label: 'Events (1h)',
      value: String(m.events_1h),
      sub: 'From events table',
      icon: <Radio size={18} />,
      variant: m.events_1h > 50 ? 'danger' : 'primary',
      hero: false,
    },
    {
      id: 'alerts',
      label: 'Unacked Alerts',
      value: String(m.alerts_unacked),
      sub: `${m.alerts_critical} critical`,
      icon: <AlertTriangle size={18} />,
      variant: m.alerts_critical > 0 ? 'danger' : m.alerts_unacked > 0 ? 'warning' : 'success',
      hero: false,
    },
    {
      id: 'cols',
      label: 'Collectors',
      value: `${m.collectors_active}/${m.collectors_total}`,
      sub: m.collectors_total === 0 ? 'None registered in database' : 'Active / total',
      icon: <Radio size={18} />,
      variant: m.collectors_total === 0 ? 'warning' : 'success',
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

  const hero = cards[0];
  const rest = cards.slice(1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className={`col-span-2 rounded-xl border p-4 sm:p-5 ${variantStyles[hero.variant]}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{hero.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{hero.sub}</p>
          </div>
          <span className={`p-2 rounded-lg ${iconStyles[hero.variant]}`}>{hero.icon}</span>
        </div>
        <p className={`text-4xl sm:text-5xl font-bold tabular-nums font-mono ${valueStyles[hero.variant]}`}>
          {hero.value}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Source: Supabase <code className="font-mono">get_dashboard_metrics</code> — not demo values.
        </p>
      </div>
      {rest.map((c) => (
        <div key={c.id} className={`rounded-xl border p-3 sm:p-5 ${variantStyles[c.variant]}`}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{c.label}</p>
            <span className={`p-1.5 rounded-lg ${iconStyles[c.variant]}`}>{c.icon}</span>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold tabular-nums font-mono ${valueStyles[c.variant]}`}>
            {c.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
