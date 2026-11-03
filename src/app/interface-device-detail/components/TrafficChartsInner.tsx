'use client';
import React from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const bandwidthData = [
  { time: '00:00', inbound: 312, outbound: 287 },
  { time: '04:00', inbound: 124, outbound: 108 },
  { time: '08:00', inbound: 654, outbound: 612 },
  { time: '12:00', inbound: 876, outbound: 845 },
  { time: '16:00', inbound: 947, outbound: 923 },
  { time: '20:00', inbound: 712, outbound: 689 },
  { time: 'Now', inbound: 847, outbound: 923 },
];

const packetLossData = [
  { time: '00:00', loss: 0.00 },
  { time: '08:00', loss: 0.00 },
  { time: '14:00', loss: 0.05 },
  { time: '18:00', loss: 0.34 },
  { time: 'Now', loss: 0.00 },
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
          <span className="font-mono font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function TrafficChartsInner() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Interface Bandwidth — 24h</h3>
        <p className="text-xs text-muted-foreground mb-4">Mbps · Inbound / Outbound</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={bandwidthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBwIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradBwOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="inbound" stroke="var(--primary)" strokeWidth={2} fill="url(#gradBwIn)" />
            <Area type="monotone" dataKey="outbound" stroke="var(--accent)" strokeWidth={2} fill="url(#gradBwOut)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Packet Loss — 24h</h3>
        <p className="text-xs text-muted-foreground mb-4">Percentage</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={packetLossData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="loss" stroke="var(--danger)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
