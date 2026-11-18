'use client';
import React, { useCallback, useEffect, useState } from 'react';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import { Radio, CheckCircle2, AlertCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
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
  last_heartbeat_at: string | null;
}

function formatHeartbeat(iso: string | null): string {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return new Date(iso).toLocaleString();
}

export default function RecolectorContent() {
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
      toast.error('Could not load collectors.');
      setRows([]);
    } else {
      setRows((Array.isArray(data) ? data : []) as CollectorRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio size={20} className="text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Protocol Collectors</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real agents from the database — not demo cards
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60 self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground bg-card border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
          <Radio size={28} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No protocol collectors online</p>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            There are zero rows in `collectors`. ICMP/SNMP/NETCONF results only come from a collector process
            on your network that heartbeats into Supabase. This page will stay empty until that happens.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => {
            const status = c.status ?? 'down';
            const success = c.success_rate ?? 0;
            const icon =
              status === 'active' ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : status === 'degraded' ? (
                <AlertCircle size={16} className="text-warning" />
              ) : (
                <XCircle size={16} className="text-danger" />
              );
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 ${
                  status === 'active'
                    ? 'border-success/20 bg-success/5'
                    : status === 'degraded'
                      ? 'border-warning/20 bg-warning/5'
                      : 'border-danger/20 bg-danger/5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <ProtocolBadge protocol={c.protocol} active={status !== 'down'} />
                  {icon}
                </div>
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{String(c.host)}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.devices_count ?? 0} devices</span>
                  <span
                    className={`font-mono font-semibold ${
                      success >= 95 ? 'text-success' : success >= 80 ? 'text-warning' : 'text-danger'
                    }`}
                  >
                    {success}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Last: {formatHeartbeat(c.last_heartbeat_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
