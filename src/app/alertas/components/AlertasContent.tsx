'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import { AlertTriangle, XCircle, Info, Bell, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcAckAlert, rpcListAlerts } from '@/lib/supabase/rpc';
import type { Alert, AlertSeverity } from '@/lib/supabase/database.types';

const severityConfig: Record<
  AlertSeverity,
  { icon: React.ReactNode; cls: string; badge: 'danger' | 'accent' | 'warning' | 'info'; bg: string }
> = {
  critical: { icon: <XCircle size={14} />, cls: 'text-danger', badge: 'danger', bg: 'bg-danger/10 border-danger/20' },
  major: { icon: <AlertTriangle size={14} />, cls: 'text-accent', badge: 'accent', bg: 'bg-accent/10 border-accent/20' },
  minor: { icon: <AlertTriangle size={14} />, cls: 'text-warning', badge: 'warning', bg: 'bg-warning/10 border-warning/20' },
  info: { icon: <Info size={14} />, cls: 'text-info', badge: 'info', bg: 'bg-info/10 border-info/20' },
};

function ago(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AlertasContent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'major' | 'unacked'>('all');
  const [acking, setAcking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await rpcListAlerts({ limit: 100 });
      setAlerts(rows);
    } catch {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setAlerts((data as Alert[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'unacked') return !a.acknowledged;
    return a.severity === filter;
  });

  const unacked = alerts.filter((a) => !a.acknowledged).length;

  async function ackOne(id: string) {
    setAcking(id);
    try {
      await rpcAckAlert(id);
      toast.success('Alert acknowledged');
      await load();
    } catch {
      toast.error('Could not acknowledge alert');
    } finally {
      setAcking(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Alerts & Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alerts from the database (collector / traps). Nothing is simulated.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 self-start">
          <Bell size={14} className="text-danger" />
          <span className="text-xs font-mono text-danger">{unacked} unacknowledged</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'critical', 'major', 'unacked'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unacked' ? 'Unacked' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Loading alerts…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
          <Bell size={22} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No alerts</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Alerts appear when a collector or trap ingestion writes to the alerts table. This page does not invent incidents.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const sc = severityConfig[alert.severity] ?? severityConfig.info;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${sc.bg} ${alert.acknowledged ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex-shrink-0 ${sc.cls}`}>{sc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{alert.title}</span>
                      <Badge variant={sc.badge}>{alert.severity}</Badge>
                      {alert.acknowledged && <Badge variant="info">Acked</Badge>}
                      <span className="text-xs font-mono text-muted-foreground ml-auto">
                        {ago(alert.created_at)}
                      </span>
                    </div>
                    {alert.device_name && (
                      <p className="text-xs font-mono text-primary mb-1">{alert.device_name}</p>
                    )}
                    {alert.message && <p className="text-sm text-muted-foreground">{alert.message}</p>}
                    {!alert.acknowledged && (
                      <button
                        type="button"
                        onClick={() => ackOne(alert.id)}
                        disabled={acking === alert.id}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted/50 disabled:opacity-60"
                      >
                        {acking === alert.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Acknowledge
                      </button>
                    )}
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
