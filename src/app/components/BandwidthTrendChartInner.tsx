'use client';
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '00:00', inbound: 2.1, outbound: 1.8 },
  { time: '02:00', inbound: 1.4, outbound: 1.2 },
  { time: '04:00', inbound: 0.9, outbound: 0.7 },
  { time: '06:00', inbound: 1.8, outbound: 1.5 },
  { time: '08:00', inbound: 4.2, outbound: 3.9 },
  { time: '10:00', inbound: 6.8, outbound: 6.1 },
  { time: '12:00', inbound: 7.4, outbound: 6.8 },
  { time: '14:00', inbound: 8.1, outbound: 7.5 },
  { time: '16:00', inbound: 9.3, outbound: 8.7 },
  { time: '18:00', inbound: 7.9, outbound: 7.2 },
  { time: '20:00', inbound: 5.6, outbound: 5.1 },
  { time: '22:00', inbound: 3.2, outbound: 2.9 },
  { time: 'Now', inbound: 4.8, outbound: 4.3 },
];

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

export default function BandwidthTrendChartInner() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Aggregate Bandwidth — 24h</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All interfaces combined · Gbps</p>
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
    </div>
  );
}
