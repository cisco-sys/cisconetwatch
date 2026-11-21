'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import VendorBadge from '@/components/ui/VendorBadge';
import { Server, ChevronRight, Search, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Device, DeviceStatus, VendorType } from '@/lib/supabase/database.types';

const statusConfig: Record<
  string,
  { label: string; badge: 'success' | 'warning' | 'danger' | 'muted' }
> = {
  up: { label: 'Reachable', badge: 'success' },
  degraded: { label: 'Degraded', badge: 'warning' },
  down: { label: 'Unreachable', badge: 'danger' },
  unknown: { label: 'Unverified', badge: 'muted' },
};

const PAGE_SIZE = 20;

export default function DeviceTopologyGrid() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.rpc('list_devices', { p_limit: 500, p_offset: 0 });
    setDevices((Array.isArray(data) ? data : []) as Device[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        String(d.ip).includes(q) ||
        (d.model ?? '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [devices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { up: 0, degraded: 0, down: 0, unknown: 0 };
    devices.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, [devices]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Device Inventory</h2>
          <span className="text-xs text-muted-foreground font-mono">
            {loading ? '…' : `${filtered.length} devices`}
          </span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, IP, model..."
            className="bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm w-56 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'up', 'degraded', 'down', 'unknown'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatusFilter(s);
              setPage(0);
            }}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'border-transparent text-muted-foreground hover:bg-muted/40'
            }`}
          >
            {s === 'all' ? 'All' : statusConfig[s]?.label ?? s}
            {s !== 'all' && <span className="opacity-60 ml-1">({statusCounts[s] || 0})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading inventory…
        </div>
      ) : devices.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Server size={28} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No devices in inventory</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Add devices under Device Config, or connect a LAN collector for discovery (WhatsUp Gold–style
            scan). Nothing is simulated here.
          </p>
          <Link href="/device-collector-configuration" className="inline-block text-xs text-primary mt-2">
            Go to Device Config →
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['Device', 'Vendor', 'IP', 'Model', 'Site', 'Status', 'Util', 'Protocol', ''].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((d) => {
                  const sc = statusConfig[d.status] ?? statusConfig.unknown;
                  return (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-medium">{d.name}</td>
                      <td className="px-3 py-2.5">
                        <VendorBadge vendor={d.vendor as VendorType} />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{String(d.ip)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.model ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.site ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={sc.badge} dot>
                          {sc.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {d.utilization_pct != null ? `${d.utilization_pct}%` : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <ProtocolBadge protocol={d.protocol} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/interface-device-detail?id=${d.id}`}
                          className="text-primary text-xs inline-flex items-center gap-0.5"
                        >
                          Detail <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 rounded text-xs border border-border disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded text-xs border border-border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
