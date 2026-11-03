'use client';
import React from 'react';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const correlationData = [
  { time: '19:00', utilization: 71, packetLoss: 0.00, trapCount: 4, incident: null },
  { time: '19:10', utilization: 74, packetLoss: 0.01, trapCount: 5, incident: null },
  { time: '19:20', utilization: 78, packetLoss: 0.02, trapCount: 7, incident: null },
  { time: '19:30', utilization: 83, packetLoss: 0.05, trapCount: 12, incident: 'Start' },
  { time: '19:40', utilization: 88, packetLoss: 0.12, trapCount: 34, incident: null },
  { time: '19:50', utilization: 91, packetLoss: 0.18, trapCount: 89, incident: null },
  { time: '20:00', utilization: 94, packetLoss: 0.23, trapCount: 187, incident: null },
  { time: '20:08', utilization: 94, packetLoss: 0.34, trapCount: 312, incident: 'Peak' },
  { time: '20:13', utilization: 94, packetLoss: 0.23, trapCount: 247, incident: null },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
      <p className="text-xs font-mono text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={`corr-tt-${p.name}`} className="flex items-center justify-between gap-4 text-xs mb-1">
          <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function CorrelationChartInner() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Incident Correlation Timeline — SW-CORE-01</h3>
        <p className="text-xs text-muted-foreground mt-0.5">19:00–20:13 UTC · Utilization %, Packet Loss %, SNMP Trap Count</p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={correlationData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradUtil" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area yAxisId="left" type="monotone" dataKey="utilization" stroke="var(--primary)" strokeWidth={2} fill="url(#gradUtil)" name="utilization %" />
          <Line yAxisId="left" type="monotone" dataKey="packetLoss" stroke="var(--danger)" strokeWidth={2} dot={false} name="packet loss %" />
          <Bar yAxisId="right" dataKey="trapCount" fill="var(--accent)" opacity={0.5} name="trap count" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded bg-primary inline-block" />Utilization %
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded bg-danger inline-block" />Packet Loss %
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-2 rounded bg-accent opacity-60 inline-block" />SNMP Traps
        </span>
      </div>
    </div>
  );
}
