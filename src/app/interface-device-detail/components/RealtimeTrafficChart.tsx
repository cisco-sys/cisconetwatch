'use client';
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  isGateway?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl px-4 py-3">
      <p className="text-xs font-mono text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={`rt-${p.name}`} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-mono font-semibold text-foreground">{p.value} Mbps</span>
        </div>
      ))}
    </div>
  );
};

function generatePoint(t: number) {
  const base = 400 + Math.sin(t / 5) * 200;
  return {
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    inbound: Math.max(50, Math.round(base + Math.random() * 100)),
    outbound: Math.max(40, Math.round(base * 0.9 + Math.random() * 80)),
  };
}

export default function RealtimeTrafficChart({ isGateway = false }: Props) {
  const [data, setData] = useState(() =>
    Array.from({ length: 20 }, (_, i) => generatePoint(i))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => [...prev.slice(-19), generatePoint(Date.now() / 1000)]);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Realtime Traffic</h3>
          <p className="text-xs text-muted-foreground">{isGateway ? 'Gateway aggregate' : 'Selected port'} · Mbps</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-success live-pulse" />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradIn-${isGateway ? 'gw' : 'port'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`gradOut-${isGateway ? 'gw' : 'port'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="inbound" stroke="var(--primary)" strokeWidth={2} fill={`url(#gradIn-${isGateway ? 'gw' : 'port'})`} isAnimationActive={false} />
          <Area type="monotone" dataKey="outbound" stroke="var(--accent)" strokeWidth={2} fill={`url(#gradOut-${isGateway ? 'gw' : 'port'})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded bg-primary inline-block" />Ingress (In)
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-0.5 rounded bg-accent inline-block" />Egress (Out)
        </span>
        <span className="text-xs text-muted-foreground ml-auto font-mono">Updates every 1.5s</span>
      </div>
    </div>
  );
}
