'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import { Loader2, RefreshCw, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProtocolType } from '@/lib/supabase/database.types';

interface CollectorRow {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  status: 'active' | 'degraded' | 'down';
  devices_count: number | null;
  success_rate: number | null;
  avg_poll_ms: number | null;
  errors_24h: number | null;
  last_heartbeat_at: string | null;
  version?: string | null;
}

function formatHeartbeat(iso: string | null): string {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function CollectorHealthTable() {
  const [rows, setRows] = useState<CollectorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_collector_health');
    if (error) {
      toast.error('Could not load collectors from the database.');
      setRows([]);
    } else {
      const list = (Array.isArray(data) ? data : []) as CollectorRow[];
      setRows(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Active Collectors</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live data from Supabase (`collectors` / `get_collector_health`). No simulated agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {loading ? '…' : `${rows.length} registered`}
          </span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading collectors…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <Radio size={28} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No collectors registered</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            The `collectors` table is empty. Heartbeats, success rates and ICMP/SNMP reachability only appear
            after a real collector inside your network writes rows and metrics. This UI will not invent them.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Collector', 'Protocol', 'Host', 'Devices', 'Success Rate', 'Avg Poll', 'Errors (24h)', 'Last Heartbeat', 'Status'].map(
                  (h) => (
                    <th
                      key={`colt-th-${h}`}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => {
                const rate = c.success_rate ?? 0;
                const status = c.status ?? 'down';
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{c.name}</td>
                    <td className="px-4 py-3">
                      <ProtocolBadge protocol={c.protocol} active={status !== 'down'} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{String(c.host)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono tabular-nums text-foreground">{c.devices_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          rate >= 98 ? 'text-success' : rate >= 85 ? 'text-warning' : 'text-danger'
                        }`}
                      >
                        {rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono tabular-nums text-muted-foreground text-xs">
                        {c.avg_poll_ms && c.avg_poll_ms > 0 ? `${c.avg_poll_ms}ms` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono tabular-nums text-xs ${
                          (c.errors_24h ?? 0) > 0 ? 'text-danger font-semibold' : 'text-muted-foreground'
                        }`}
                      >
                        {c.errors_24h ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatHeartbeat(c.last_heartbeat_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={status === 'active' ? 'success' : status === 'degraded' ? 'warning' : 'danger'}
                        dot
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
