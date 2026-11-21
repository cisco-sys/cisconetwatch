'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Radar, Loader2, RefreshCw, Server, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Scan {
  id: string;
  name: string | null;
  cidr: string;
  status: string;
  hosts_found: number;
  hosts_up: number;
  started_at: string;
  finished_at: string | null;
  collector_id: string | null;
  error_message: string | null;
}

interface Host {
  id: string;
  ip: string;
  hostname: string | null;
  is_up: boolean;
  rtt_ms: number | null;
  mac: string | null;
  vendor_hint: string | null;
  snmp_sysname: string | null;
  promoted_device_id: string | null;
}

async function authHeaders(): Promise<HeadersInit | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-warning/15 text-warning border-warning/30',
    completed: 'bg-success/15 text-success border-success/30',
    failed: 'bg-danger/15 text-danger border-danger/30',
    cancelled: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-0.5 ${map[status] ?? map.cancelled}`}>
      {status === 'running' ? (
        <span className="inline-flex items-center gap-1">
          <Clock size={10} /> {status}
        </span>
      ) : (
        status
      )}
    </span>
  );
}

export default function DiscoverContent() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());

  const loadScans = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/collector/discovery', { headers });
    if (res.ok) {
      const json = await res.json();
      setScans(json.scans ?? []);
    }
    setLoading(false);
  }, []);

  const loadHosts = useCallback(async (scanId: string) => {
    const headers = await authHeaders();
    if (!headers) return;
    setHostsLoading(true);
    setSelected(scanId);
    setSelectedHosts(new Set());
    const res = await fetch(`/api/collector/discovery?scanId=${scanId}`, { headers });
    if (res.ok) {
      const json = await res.json();
      setHosts(json.hosts ?? []);
    } else {
      setHosts([]);
    }
    setHostsLoading(false);
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  async function promoteSelected() {
    if (!selectedHosts.size) {
      toast.error('Selecciona al menos un host.');
      return;
    }
    const headers = await authHeaders();
    if (!headers) return;
    setPromoting(true);
    try {
      const res = await fetch('/api/collector/promote', {
        method: 'POST',
        headers,
        body: JSON.stringify({ hostIds: Array.from(selectedHosts) }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${json.promoted} dispositivo(s) en inventario (estado unverified).`);
        if (selected) loadHosts(selected);
      } else {
        toast.error('No se pudo promover al inventario.');
      }
    } finally {
      setPromoting(false);
    }
  }

  function toggleHost(id: string) {
    setSelectedHosts((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAllUp() {
    setSelectedHosts(new Set(hosts.filter((h) => h.is_up && !h.promoted_device_id).map((h) => h.id)));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2">
          <Radar size={22} className="text-primary mt-0.5" />
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Descubre</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Red descubierta por el colector en tu LAN (estilo WhatsUp Gold / Zabbix proxy). El navegador no hace ping.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadScans}
          disabled={loading}
          className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Como escanear (colector en tu PC / servidor LAN)</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>
            En Vercel define <code className="font-mono text-foreground">COLLECTOR_API_KEY</code> y{' '}
            <code className="font-mono text-foreground">SUPABASE_SERVICE_ROLE_KEY</code>.
          </li>
          <li>
            En el PC de la red ejecuta <code className="font-mono text-foreground">collector/discover.py</code>.
          </li>
          <li>Los hosts aparecen aqui, seleccionalos y pulsa Anadir al inventario.</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden xl:col-span-1">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Historial de escaneos</h2>
          </div>
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="animate-spin text-muted-foreground" size={18} />
            </div>
          ) : scans.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <Radar size={28} className="mx-auto opacity-50" />
              <p>Ningun escaneo aun</p>
              <p className="text-xs">Ejecuta el colector contra tu CIDR (ej. 192.168.10.0/24).</p>
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
              {scans.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => loadHosts(s.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${
                      selected === s.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{s.name || s.cidr}</span>
                      <StatusPill status={s.status} />
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{s.cidr}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.hosts_up}/{s.hosts_found} up · {new Date(s.started_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Hosts descubiertos</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllUp}
                disabled={!hosts.some((h) => h.is_up)}
                className="text-xs border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted disabled:opacity-40"
              >
                Seleccionar UP
              </button>
              <button
                type="button"
                onClick={promoteSelected}
                disabled={promoting || selectedHosts.size === 0}
                className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-lg px-3 py-1.5 font-semibold disabled:opacity-50"
              >
                {promoting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Anadir al inventario ({selectedHosts.size})
              </button>
            </div>
          </div>

          {!selected ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Elige un escaneo a la izquierda</div>
          ) : hostsLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : hosts.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Sin hosts en este scan</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-widest">
                    <th className="px-3 py-2 text-left">Sel</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">Hostname</th>
                    <th className="px-3 py-2 text-left">RTT</th>
                    <th className="px-3 py-2 text-left">Vendor</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">Inventario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hosts.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedHosts.has(h.id)}
                          disabled={!!h.promoted_device_id}
                          onChange={() => toggleHost(h.id)}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{String(h.ip)}</td>
                      <td className="px-3 py-2 text-xs">{h.hostname || h.snmp_sysname || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {h.rtt_ms != null ? `${h.rtt_ms} ms` : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{h.vendor_hint || '—'}</td>
                      <td className="px-3 py-2">
                        {h.is_up ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 size={12} /> Up
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-danger">
                            <XCircle size={12} /> Down
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {h.promoted_device_id ? (
                          <span className="text-success flex items-center gap-1">
                            <Server size={12} /> Si
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
