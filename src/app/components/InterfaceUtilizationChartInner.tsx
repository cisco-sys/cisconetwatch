'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Row = { iface: string; util: number; device: string };

const getColor = (util: number) => {
  if (util >= 90) return 'var(--danger)';
  if (util >= 80) return 'var(--accent)';
  if (util >= 70) return 'var(--warning)';
  return 'var(--primary)';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl px-4 py-3">
      <p className="text-xs font-mono text-muted-foreground">{item.device}</p>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs font-mono text-primary mt-1">{item.util}% utilization</p>
    </div>
  );
};

export default function InterfaceUtilizationChartInner() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: rows } = await supabase
      .from('interfaces')
      .select('name,utilization_pct,device_id,devices(name)')
      .not('utilization_pct', 'is', null)
      .order('utilization_pct', { ascending: false })
      .limit(10);

    const mapped: Row[] = (rows ?? []).map((r: any) => ({
      iface: r.name,
      util: Number(r.utilization_pct) || 0,
      device: r.devices?.name ?? '—',
    }));
    setData(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Top Saturated Interfaces</h2>
        <p className="text-xs text-muted-foreground mt-0.5">From interfaces table · utilization_pct</p>
      </div>
      {loading ? (
        <div className="h-[240px] flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center px-4 space-y-2 border border-dashed border-border rounded-lg">
          <p className="text-sm font-medium text-foreground">No utilization data</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Collectors must populate interface utilization. This chart does not show invented ports.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="iface"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="util" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-util-${index}`} fill={getColor(entry.util)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
