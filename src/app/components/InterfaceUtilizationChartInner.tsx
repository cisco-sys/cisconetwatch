'use client';
import React from 'react';
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

const data = [
  { iface: 'Gi0/1', util: 94, device: 'SW-CORE-01' },
  { iface: 'Te1/0/1', util: 88, device: 'RTR-EDGE-03' },
  { iface: 'Gi0/24', util: 82, device: 'SW-ACC-07' },
  { iface: 'Gi1/0/2', util: 76, device: 'SW-DIST-02' },
  { iface: 'Te0/0/0', util: 71, device: 'RTR-WAN-01' },
  { iface: 'Gi0/8', util: 65, device: 'SW-CORE-02' },
  { iface: 'Gi2/0/1', util: 58, device: 'SW-ACC-12' },
];

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
  return (
    <div className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Top Saturated Interfaces</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Current utilization %</p>
      </div>
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
    </div>
  );
}
