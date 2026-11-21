'use client';
import React, { useCallback, useEffect, useState } from 'react';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Radio } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProtocolType } from '@/lib/supabase/database.types';

interface Row {
  id: string;
  name: string;
  protocol: ProtocolType;
  host: string;
  status: 'active' | 'degraded' | 'down';
  devices_count: number | null;
  success_rate: number | null;
  last_heartbeat_at: string | null;
}

function ago(iso: string | null): string {
  if (!iso) return 'Never';
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export default function CollectorStatusRow() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc('get_collector_health');
    setRows((Array.isArray(data) ? data : []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Collection Protocol Status</h2>
        <span className="text-xs text-muted-foreground font-mono">
          {loading ? '…' : `${rows.length} in database`}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading collectors…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Radio size={22} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No collectors registered</p>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto">
            Like WhatsUp Gold agents, collectors must run on your LAN and write heartbeats to Supabase.
            This panel will not show simulated SNMP/NETCONF agents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {rows.map((c) => {
            const rate = c.success_rate ?? 0;
            const status = c.status ?? 'down';
            const statusIcon =
              status === 'active' ? (
                <CheckCircle2 size={14} className="text-success" />
              ) : status === 'degraded' ? (
                <AlertCircle size={14} className="text-warning" />
              ) : (
                <XCircle size={14} className="text-danger" />
              );
            return (
              <div
                key={c.id}
                className={`rounded-lg border p-3 ${
                  status === 'active'
                    ? 'border-success/20 bg-success/5'
                    : status === 'degraded'
                      ? 'border-warning/20 bg-warning/5'
                      : 'border-danger/20 bg-danger/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ProtocolBadge protocol={c.protocol} active={status !== 'down'} />
                  {statusIcon}
                </div>
                <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{String(c.host)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span
                    className={`text-sm font-bold font-mono tabular-nums ${
                      rate >= 95 ? 'text-success' : rate >= 80 ? 'text-warning' : 'text-danger'
                    }`}
                  >
                    {rate}%
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{ago(c.last_heartbeat_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
