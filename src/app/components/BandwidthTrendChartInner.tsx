'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Point = { time: string; inbound: number; outbound: number };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl px-4 py-3">
      <p className="text-xs font-mono text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={`tt-${p.name}`} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-mono font-semibold text-foreground">{p.value} Gbps</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Aggregate bandwidth chart.
 * There is no time-series table yet for interface counters history.
 * We show an honest empty state — never invent Gbps values.
 */
export default function BandwidthTrendChartInner() {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Future: query metrics_timeseries / interface counter samples.
    // Until collectors write history, keep empty (no mock series).
    setData([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Aggregate Bandwidth — 24h</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Requires collector counter history (not simulated)</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-primary inline-block" />
            Inbound
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-accent inline-block" />
            Outbound
          </span>
        </div>
      </div>
      {loading ? (
        <div className="h-[240px] flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center px-4 space-y-2 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium text-foreground">No bandwidth history yet</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            When the LAN collector stores interface counter samples over time, this chart will plot real inbound/outbound
            Gbps. Demo curves are not shown in production mode.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}G`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="inbound" stroke="var(--primary)" strokeWidth={2} fill="url(#gradIn)" />
            <Area type="monotone" dataKey="outbound" stroke="var(--accent)" strokeWidth={2} fill="url(#gradOut)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
