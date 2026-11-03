'use client';
import React, { useState, useMemo } from 'react';
import Badge from '@/components/ui/Badge';
import { Search, Power, PowerOff, Pencil, Check, X, AlertCircle } from 'lucide-react';

interface Port {
  id: string;
  number: number;
  name: string;
  description: string;
  status: 'up' | 'down' | 'admin-down';
  adminStatus: 'enabled' | 'disabled';
  speed: string;
  duplex: string;
  vlan: string;
  vlanMode: 'access' | 'trunk';
  poe: boolean;
  poeWatts: number;
  connectedDevice: string;
}

function generatePorts(count: number): Port[] {
  const ports: Port[] = [];
  const devices = ['PC-SALES-01', 'PC-ENG-04', 'IP-PHONE-12', 'AP-FLOOR2-03', 'PRINTER-HR', 'SERVER-APP-01', '', '', '', ''];
  const speeds = ['100 Mbps', '1 Gbps', '1 Gbps', '1 Gbps', '10 Gbps'];
  for (let i = 1; i <= count; i++) {
    const r = Math.sin(i * 7.3) * 0.5 + 0.5;
    const r2 = Math.sin(i * 3.7) * 0.5 + 0.5;
    const r3 = Math.sin(i * 11.1) * 0.5 + 0.5;
    const adminEnabled = r > 0.15;
    const connected = r2 > 0.3;
    const status: Port['status'] = !adminEnabled ? 'admin-down' : connected ? 'up' : 'down';
    ports.push({
      id: `port-${i}`,
      number: i,
      name: `GigabitEthernet0/${i}`,
      description: connected ? devices[Math.floor(r2 * devices.length)] || '' : '',
      status,
      adminStatus: adminEnabled ? 'enabled' : 'disabled',
      speed: speeds[Math.floor(r * speeds.length)],
      duplex: status === 'up' ? 'Full' : 'N/A',
      vlan: String(Math.floor(r2 * 50) * 2 + 10),
      vlanMode: r3 > 0.7 ? 'trunk' : 'access',
      poe: r > 0.4,
      poeWatts: r > 0.4 ? Math.floor(r3 * 25) + 3 : 0,
      connectedDevice: connected ? devices[Math.floor(r2 * devices.length)] || '' : '',
    });
  }
  return ports;
}

const PAGE_SIZE = 12;

export default function PortConfigPanel() {
  const [ports, setPorts] = useState(() => generatePorts(48));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editingPort, setEditingPort] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ description: '', vlan: '', vlanMode: 'access' as 'access' | 'trunk' });
  const [confirmAction, setConfirmAction] = useState<{ portId: string; action: 'enable' | 'disable' } | null>(null);

  const filtered = useMemo(
    () =>
      ports.filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase()) ||
          p.vlan.includes(search)
      ),
    [ports, search]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const startEdit = (port: Port) => {
    setEditingPort(port.id);
    setEditValues({ description: port.description, vlan: port.vlan, vlanMode: port.vlanMode });
  };

  const saveEdit = (portId: string) => {
    setPorts((prev) => prev.map((p) => (p.id === portId ? { ...p, ...editValues } : p)));
    setEditingPort(null);
  };

  const toggleAdminStatus = (portId: string) => {
    setPorts((prev) =>
      prev.map((p) => {
        if (p.id !== portId) return p;
        const enabling = p.adminStatus === 'disabled';
        return {
          ...p,
          adminStatus: enabling ? 'enabled' : 'disabled',
          status: enabling ? (p.connectedDevice ? 'up' : 'down') : 'admin-down',
        };
      })
    );
    setConfirmAction(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search port, description, VLAN..."
            className="bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-72"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} ports</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Port', 'Description', 'Status', 'Admin', 'Speed', 'VLAN', 'Mode', 'PoE', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((port) => (
                <tr key={port.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-primary">{port.name}</td>
                  <td className="px-3 py-2.5 text-xs">
                    {editingPort === port.id ? (
                      <input
                        value={editValues.description}
                        onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))}
                        className="bg-input border border-border rounded px-2 py-1 text-xs w-full"
                      />
                    ) : (
                      <span className="text-muted-foreground">{port.description || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={port.status === 'up' ? 'success' : port.status === 'down' ? 'danger' : 'warning'} dot>
                      {port.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={port.adminStatus === 'enabled' ? 'success' : 'warning'}>{port.adminStatus}</Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{port.speed}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {editingPort === port.id ? (
                      <input
                        value={editValues.vlan}
                        onChange={(e) => setEditValues((v) => ({ ...v, vlan: e.target.value }))}
                        className="bg-input border border-border rounded px-2 py-1 text-xs w-16"
                      />
                    ) : (
                      port.vlan
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{port.vlanMode}</td>
                  <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                    {port.poe ? `${port.poeWatts}W` : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      {editingPort === port.id ? (
                        <>
                          <button onClick={() => saveEdit(port.id)} className="p-1.5 rounded text-success hover:bg-success/10" title="Save">
                            <Check size={13} />
                          </button>
                          <button onClick={() => setEditingPort(null)} className="p-1.5 rounded text-muted-foreground hover:bg-muted" title="Cancel">
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(port)} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                portId: port.id,
                                action: port.adminStatus === 'enabled' ? 'disable' : 'enable',
                              })
                            }
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                            title={port.adminStatus === 'enabled' ? 'Disable' : 'Enable'}
                          >
                            {port.adminStatus === 'enabled' ? <PowerOff size={13} /> : <Power size={13} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded text-xs border border-border disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded text-xs border border-border disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={18} className={confirmAction.action === 'disable' ? 'text-danger' : 'text-success'} />
              <h3 className="text-sm font-semibold text-foreground">
                {confirmAction.action === 'disable' ? 'Disable Port?' : 'Enable Port?'}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              {confirmAction.action === 'disable'
                ? 'This will administratively shut down the port. Connected devices will lose network access.'
                : 'This will bring the port out of admin-down state and allow traffic.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={() => toggleAdminStatus(confirmAction.portId)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  confirmAction.action === 'disable'
                    ? 'bg-danger/10 text-danger border border-danger/20'
                    : 'bg-success/10 text-success border border-success/20'
                }`}
              >
                {confirmAction.action === 'disable' ? 'Disable Port' : 'Enable Port'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
