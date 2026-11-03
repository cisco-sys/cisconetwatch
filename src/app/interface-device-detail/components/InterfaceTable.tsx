'use client';
import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import { Search } from 'lucide-react';

const interfaces = [
  { id: 'if-1', name: 'GigabitEthernet0/1', description: 'Uplink to RTR-EDGE-03', status: 'up', admin: 'up', speed: '1 Gbps', util: 94, inErrors: 0, outErrors: 0, vlan: 'trunk' },
  { id: 'if-2', name: 'GigabitEthernet0/2', description: 'To SW-DIST-02', status: 'up', admin: 'up', speed: '1 Gbps', util: 45, inErrors: 0, outErrors: 0, vlan: 'trunk' },
  { id: 'if-3', name: 'GigabitEthernet0/7', description: 'Access port Floor-2', status: 'down', admin: 'up', speed: '1 Gbps', util: 0, inErrors: 12, outErrors: 0, vlan: '20' },
  { id: 'if-4', name: 'TenGigabitEthernet1/0/1', description: 'WAN uplink', status: 'up', admin: 'up', speed: '10 Gbps', util: 67, inErrors: 0, outErrors: 2, vlan: 'trunk' },
  { id: 'if-5', name: 'TenGigabitEthernet1/0/2', description: 'Fiber interconnect', status: 'up', admin: 'up', speed: '10 Gbps', util: 52, inErrors: 3, outErrors: 1, vlan: 'trunk' },
  { id: 'if-6', name: 'GigabitEthernet0/24', description: 'Mgmt', status: 'up', admin: 'up', speed: '1 Gbps', util: 8, inErrors: 0, outErrors: 0, vlan: '99' },
  { id: 'if-7', name: 'GigabitEthernet0/3', description: 'Access Floor-1', status: 'up', admin: 'up', speed: '1 Gbps', util: 22, inErrors: 0, outErrors: 0, vlan: '10' },
  { id: 'if-8', name: 'GigabitEthernet0/8', description: 'Unused', status: 'down', admin: 'down', speed: '1 Gbps', util: 0, inErrors: 0, outErrors: 0, vlan: '—' },
];

export default function InterfaceTable() {
  const [search, setSearch] = useState('');

  const filtered = interfaces.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search interfaces..."
            className="bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-colors"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} interfaces</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Interface', 'Description', 'Status', 'Admin', 'Speed', 'Util %', 'In Err', 'Out Err', 'VLAN'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((iface) => (
                <tr key={iface.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-medium whitespace-nowrap">{iface.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{iface.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant={iface.status === 'up' ? 'success' : 'danger'} dot>
                      {iface.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={iface.admin === 'up' ? 'success' : 'warning'}>
                      {iface.admin}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{iface.speed}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs tabular-nums font-semibold ${
                      iface.util >= 90 ? 'text-danger' : iface.util >= 70 ? 'text-warning' : 'text-foreground'
                    }`}>
                      {iface.util}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">{iface.inErrors}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">{iface.outErrors}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{iface.vlan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
