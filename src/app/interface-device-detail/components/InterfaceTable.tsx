'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import { Search, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { InterfaceRow } from '@/lib/supabase/database.types';

interface Props {
  deviceId: string;
}

export default function InterfaceTable({ deviceId }: Props) {
  const [rows, setRows] = useState<InterfaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !deviceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('interfaces')
      .select('*')
      .eq('device_id', deviceId)
      .order('name');
    setRows((data as InterfaceRow[]) ?? []);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading interfaces…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">No interfaces in database</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Interfaces appear when a collector writes SNMP ifTable (or similar) rows for this device. Nothing is invented here.
        </p>
      </div>
    );
  }

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
                {['Interface', 'Description', 'Status', 'Admin', 'Speed', 'Util %', 'In Err', 'Out Err', 'VLAN'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((iface) => (
                <tr key={iface.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-medium whitespace-nowrap">
                    {iface.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{iface.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={iface.status === 'up' ? 'success' : 'danger'} dot>
                      {iface.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={iface.admin_status === 'enabled' ? 'success' : 'warning'}>
                      {iface.admin_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{iface.speed ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-xs tabular-nums font-semibold ${
                        (iface.utilization_pct ?? 0) >= 90
                          ? 'text-danger'
                          : (iface.utilization_pct ?? 0) >= 70
                            ? 'text-warning'
                            : 'text-foreground'
                      }`}
                    >
                      {iface.utilization_pct != null ? `${iface.utilization_pct}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {iface.in_errors ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                    {iface.out_errors ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{iface.vlan ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
