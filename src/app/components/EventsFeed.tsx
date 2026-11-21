'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Radio, XCircle, Info, Clock, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AlertSeverity } from '@/lib/supabase/database.types';

interface Evt {
  id: string;
  severity: AlertSeverity;
  device_name: string | null;
  message: string;
  protocol: string | null;
  created_at: string;
}

const severityConfig = {
  critical: { icon: <XCircle size={13} />, cls: 'text-danger', bg: 'bg-danger/10 border-danger/20' },
  major: { icon: <AlertTriangle size={13} />, cls: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  minor: { icon: <AlertTriangle size={13} />, cls: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  info: { icon: <Info size={13} />, cls: 'text-info', bg: 'bg-info/10 border-info/20' },
};

function ago(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export default function EventsFeed() {
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'major'>('all');

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('events')
      .select('id,severity,device_name,message,protocol,created_at')
      .order('created_at', { ascending: false })
      .limit(40);
    setEvents((data as Evt[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === 'all' ? events : events.filter((e) => e.severity === filter);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Live Events & Traps</h2>
        </div>
        <div className="flex gap-1">
          {(['all', 'critical', 'major'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded text-xs ${
                filter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground py-10">
          <Loader2 size={16} className="animate-spin" /> Loading events…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-2">
          <Radio size={22} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No events yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Traps and reachability events appear when a collector ingests them into the events table.
          </p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1" style={{ maxHeight: 420 }}>
          {filtered.map((evt) => {
            const sc = severityConfig[evt.severity] ?? severityConfig.info;
            return (
              <div key={evt.id} className={`rounded-lg border p-3 ${sc.bg}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 ${sc.cls}`}>{sc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold truncate">
                        {evt.device_name || '—'}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Clock size={10} />
                        {ago(evt.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{evt.message}</p>
                    <div className="mt-1.5 flex gap-2 text-xs font-mono">
                      <span className={sc.cls}>{evt.severity}</span>
                      {evt.protocol && <span className="text-muted-foreground">{evt.protocol}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
