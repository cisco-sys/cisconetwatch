'use client';
import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import VendorBadge from '@/components/ui/VendorBadge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import { ALL_DEVICES } from '@/lib/vendorData';
import { Network, Server, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const statusIcon = {
  up: <CheckCircle2 size={14} className="text-success" />,
  degraded: <AlertTriangle size={14} className="text-warning" />,
  down: <XCircle size={14} className="text-danger" />,
};

export default function TopologyContent() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDevice = ALL_DEVICES.find((d) => d.id === selected);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Network Topology</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logical view of managed devices by site and role · {ALL_DEVICES.length} nodes
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 self-start">
          <Network size={14} className="text-primary" />
          <span className="text-xs font-mono text-primary">Live topology</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 min-h-[400px]">
          <h2 className="text-sm font-semibold text-foreground mb-4">Device Map</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_DEVICES.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={`text-left rounded-xl border p-3 transition-all hover:shadow-md ${
                  selected === d.id
                    ? 'border-primary bg-primary/5'
                    : d.status === 'down'
                    ? 'border-danger/30 bg-danger/5'
                    : d.status === 'degraded'
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {statusIcon[d.status]}
                  <VendorBadge vendor={d.vendor} />
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{d.ip}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.site}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Node Detail</h2>
          {selectedDevice ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Server size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedDevice.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedDevice.ip}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="text-foreground">{selectedDevice.model}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Site</span><span className="text-foreground">{selectedDevice.site}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">OS</span><span className="font-mono text-xs">{selectedDevice.os}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPU / Mem</span><span className="font-mono">{selectedDevice.cpu}% / {selectedDevice.memory}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Util</span><span className="font-mono">{selectedDevice.utilization}%</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={selectedDevice.status === 'up' ? 'success' : selectedDevice.status === 'degraded' ? 'warning' : 'danger'} dot>
                    {selectedDevice.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Protocol</span>
                  <ProtocolBadge protocol={selectedDevice.protocol} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a device on the map to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
