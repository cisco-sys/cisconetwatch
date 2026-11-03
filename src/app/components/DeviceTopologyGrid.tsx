'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import VendorBadge from '@/components/ui/VendorBadge';
import { Server, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Search } from 'lucide-react';
import { ALL_DEVICES, VENDOR_META, VendorType, DeviceStatus } from '@/lib/vendorData';

const statusConfig = {
  up: { label: 'Reachable', icon: <CheckCircle2 size={13} />, cls: 'text-success', badge: 'success' as const },
  degraded: { label: 'Degraded', icon: <AlertTriangle size={13} />, cls: 'text-warning', badge: 'warning' as const },
  down: { label: 'Unreachable', icon: <XCircle size={13} />, cls: 'text-danger', badge: 'danger' as const },
};

const PAGE_SIZE = 20;

export default function DeviceTopologyGrid() {
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceStatus>('all');
  const [vendorFilter, setVendorFilter] = useState<VendorType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return ALL_DEVICES.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchVendor = vendorFilter === 'all' || d.vendor === vendorFilter;
      const matchSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.ip.includes(search) ||
        d.model.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchVendor && matchSearch;
    });
  }, [statusFilter, vendorFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const vendorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_DEVICES.forEach((d) => {
      counts[d.vendor] = (counts[d.vendor] || 0) + 1;
    });
    return counts;
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { up: 0, degraded: 0, down: 0 };
    ALL_DEVICES.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Device Inventory</h2>
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} devices
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
            className="bg-input border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56 transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(['all', 'up', 'degraded', 'down'] as const).map((s) => (
          <button
            key={`sf-${s}`}
            onClick={() => {
              setStatusFilter(s);
              setPage(0);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
              statusFilter === s
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {s === 'all' ? 'All' : statusConfig[s].label}
            {s !== 'all' && <span className="opacity-60 ml-1">({statusCounts[s] || 0})</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            setVendorFilter('all');
            setPage(0);
          }}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
            vendorFilter === 'all'
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          All vendors
        </button>
        {(Object.keys(VENDOR_META) as VendorType[]).map((v) => (
          <button
            key={`vf-${v}`}
            onClick={() => {
              setVendorFilter(v);
              setPage(0);
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
              vendorFilter === v ? '' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
            style={
              vendorFilter === v
                ? {
                    backgroundColor: VENDOR_META[v].bgColor,
                    borderColor: VENDOR_META[v].borderColor,
                    color: VENDOR_META[v].textColor,
                  }
                : {}
            }
          >
            {VENDOR_META[v].label} <span className="opacity-60">({vendorCounts[v] || 0})</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {['Device', 'Vendor', 'IP', 'Model', 'Site', 'Status', 'Util', 'Protocol', ''].map((h) => (
                <th
                  key={`th-${h}`}
                  className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.map((d) => {
              const sc = statusConfig[d.status];
              return (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{d.name}</td>
                  <td className="px-3 py-2.5">
                    <VendorBadge vendor={d.vendor} />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{d.ip}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.model}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.site}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={sc.badge} dot>
                      {sc.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular-nums">{d.utilization}%</td>
                  <td className="px-3 py-2.5">
                    <ProtocolBadge protocol={d.protocol} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href="/interface-device-detail"
                      className="text-primary hover:text-primary/80 inline-flex items-center gap-0.5 text-xs"
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
