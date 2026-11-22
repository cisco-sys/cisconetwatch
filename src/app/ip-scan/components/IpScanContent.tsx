'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Radar,
  RefreshCw,
  Plus,
  Loader2,
  Terminal,
  Copy,
  Check,
  Trash2,
  Ban,
  Search,
  CircleCheck,
  CircleX,
  AlertTriangle,
  DownloadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import NewScanWizard from './NewScanWizard';
import { cidrCells, compareIp, intToIp, vendorFromHint } from '@/lib/ipscan/ipscan';

interface ScanRow {
  id: string;
  name: string | null;
  description: string | null;
  cidr: string;
  status: string;
  hosts_found: number | null;
  hosts_up: number | null;
  started_at: string | null;
  error_message: string | null;
  collector_id: string | null;
  org_id: string | null;
}

interface HostRow {
  id: string;
  ip: string;
  hostname: string | null;
  is_up: boolean;
  rtt_ms: number | null;
  mac: string | null;
  vendor_hint: string | null;
  open_ports: number[] | null;
  snmp_sysname: string | null;
  promoted_device_id: string | null;
}

const WRITE_ROLES = new Set(['admin', 'noc_operator', 'network_engineer']);
const inputClass =
  'bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'border-amber-500/40 text-amber-300',
    running: 'border-sky-500/40 text-sky-300',
    completed: 'border-emerald-500/40 text-emerald-300',
    failed: 'border-red-500/40 text-red-300',
    cancelled: 'border-border text-muted-foreground',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${map[status] ?? map.cancelled}`}>
      {status}
    </span>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  return `hace ${Math.floor(s / 3600)}h`;
}

export default function IpScanContent() {
  const { user, loading: userLoading } = useCurrentUser();
  const canWrite = user ? WRITE_ROLES.has(user.role) : false;
  const orgId = user?.orgId ?? null;

  const [scans, setScans] = useState<ScanRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'up' | 'down' | 'new'>('all');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [shell, setShell] = useState<'ps' | 'sh'>('ps');
  const [copied, setCopied] = useState(false);

  const loadScans = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('discovery_scans')
      .select('id,name,description,cidr,status,hosts_found,hosts_up,started_at,error_message,collector_id,org_id')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) toast.error('No se pudieron cargar los escaneos.');
    else {
      setScans((data as ScanRow[]) ?? []);
      if (!selectedId && data?.[0]?.id) setSelectedId(data[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  const loadHosts = useCallback(async (scanId: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setLoadingHosts(true);
    const { data, error } = await supabase
      .from('discovery_hosts')
      .select('id,ip,hostname,is_up,rtt_ms,mac,vendor_hint,open_ports,snmp_sysname,promoted_device_id')
      .eq('scan_id', scanId)
      .order('ip');
    if (error) toast.error('No se pudieron cargar los equipos.');
    else setHosts(((data as HostRow[]) ?? []).sort((a, b) => compareIp(a.ip, b.ip)));
    setLoadingHosts(false);
  }, []);

  useEffect(() => {
    if (!userLoading) loadScans();
  }, [userLoading, loadScans]);

  useEffect(() => {
    if (selectedId) {
      setPicked(new Set());
      loadHosts(selectedId);
    } else setHosts([]);
  }, [selectedId, loadHosts]);

  const selected = useMemo(() => scans.find((s) => s.id === selectedId) ?? null, [scans, selectedId]);

  useEffect(() => {
    if (!selected || (selected.status !== 'pending' && selected.status !== 'running')) return;
    const t = setInterval(() => {
      loadScans();
      if (selectedId) loadHosts(selectedId);
    }, 10000);
    return () => clearInterval(t);
  }, [selected, selectedId, loadScans, loadHosts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hosts.filter((h) => {
      if (filter === 'up' && !h.is_up) return false;
      if (filter === 'down' && h.is_up) return false;
      if (filter === 'new' && h.promoted_device_id) return false;
      if (!q) return true;
      return [h.ip, h.hostname, h.mac, h.snmp_sysname, h.vendor_hint].some((x) => (x ?? '').toLowerCase().includes(q));
    });
  }, [hosts, query, filter]);

  const selectable = filtered.filter((h) => h.is_up && !h.promoted_device_id);
  const grid = selected ? cidrCells(selected.cidr.split(',')[0]?.trim() ?? '') : null;
  const byIp = useMemo(() => new Map(hosts.map((h) => [h.ip, h])), [hosts]);
  const stalePending =
    selected?.status === 'pending' &&
    selected.started_at &&
    Date.now() - new Date(selected.started_at).getTime() > 10 * 60 * 1000;

  const command =
    shell === 'ps'
      ? `$env:CNW_API_URL="${typeof window !== 'undefined' ? window.location.origin : 'https://TU_APP.vercel.app'}"\n$env:CNW_COLLECTOR_KEY="<TU_COLLECTOR_API_KEY>"\n$env:CNW_ORG_ID="${orgId ?? '<ORG_ID>'}"\npython collector/discover.py`
      : `export CNW_API_URL="${typeof window !== 'undefined' ? window.location.origin : 'https://TU_APP.vercel.app'}"\nexport CNW_COLLECTOR_KEY="<TU_COLLECTOR_API_KEY>"\nexport CNW_ORG_ID="${orgId ?? '<ORG_ID>'}"\npython3 collector/discover.py`;

  async function cancelScan(id: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from('discovery_scans').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast.error('No se pudo cancelar.');
    else {
      toast.success('Escaneo cancelado.');
      loadScans();
    }
  }

  async function deleteScan(id: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from('discovery_scans').delete().eq('id', id);
    if (error) toast.error('No se pudo eliminar.');
    else {
      toast.success('Escaneo eliminado.');
      if (selectedId === id) setSelectedId(null);
      loadScans();
    }
  }

  async function addToInventory(rows: HostRow[]) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || rows.length === 0) return;
    setAdding(true);
    let ok = 0;
    for (const h of rows) {
      const vendor = vendorFromHint(h.vendor_hint) ?? 'cisco';
      const { data, error } = await supabase.rpc('upsert_device', {
        p_name: (h.snmp_sysname || h.hostname || h.ip).trim(),
        p_ip: h.ip,
        p_protocol: 'ICMP',
        p_vendor: vendor,
      });
      if (error) continue;
      const deviceId = (data as { id?: string })?.id;
      if (deviceId) {
        await supabase.from('discovery_hosts').update({ promoted_device_id: deviceId }).eq('id', h.id);
        ok += 1;
      }
    }
    setAdding(false);
    toast.success(ok ? `${ok} equipo(s) añadidos (estado sin verificar).` : 'No se pudo añadir ningún equipo.');
    if (selectedId) loadHosts(selectedId);
  }

  function copyCommand() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (userLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" size={16} /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Radar size={22} className="text-primary" /> IP Scan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Encola escaneos para el colector de tu LAN. El navegador no hace ping; los equipos nuevos quedan sin verificar hasta el colector.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => loadScans()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <RefreshCw size={14} /> Actualizar
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus size={14} /> Nuevo escaneo
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">Escaneos</div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Cargando…
            </div>
          ) : scans.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Aún no hay escaneos.</p>
          ) : (
            <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
              {scans.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted/40 ${s.id === selectedId ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{s.name || s.cidr}</span>
                      <StatusChip status={s.status} />
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{s.cidr}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.hosts_up ?? 0}/{s.hosts_found ?? 0} respondieron · {timeAgo(s.started_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          {!selected ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Elige un escaneo de la izquierda.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{selected.name || selected.cidr}</h2>
                      <StatusChip status={selected.status} />
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{selected.cidr}</p>
                    {selected.description && <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>}
                  </div>
                  {canWrite && (
                    <div className="flex gap-2">
                      {(selected.status === 'pending' || selected.status === 'running') && (
                        <button type="button" onClick={() => cancelScan(selected.id)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs">
                          <Ban size={12} /> Cancelar
                        </button>
                      )}
                      {selected.status !== 'pending' && selected.status !== 'running' && (
                        <button type="button" onClick={() => deleteScan(selected.id)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-red-400">
                          <Trash2 size={12} /> Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {selected.status === 'failed' && selected.error_message && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{selected.error_message}</div>
                )}
                {stalePending && (
                  <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                    <AlertTriangle size={16} className="shrink-0" />
                    Ningún colector ha tomado este escaneo en más de 10 minutos. Revisa el colector y la clave.
                  </div>
                )}
              </div>

              {selected.status === 'pending' && (
                <div className="rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Terminal size={14} /> Ejecutar el colector en tu red
                    </span>
                    <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
                      {(['ps', 'sh'] as const).map((k) => (
                        <button key={k} type="button" onClick={() => setShell(k)} className={`rounded-md px-2.5 py-1 ${shell === k ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                          {k === 'ps' ? 'Windows' : 'Linux / Mac'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <pre className="overflow-x-auto px-4 py-3 font-mono text-xs">{command}</pre>
                  <div className="flex justify-end border-t border-border px-4 py-2">
                    <button type="button" onClick={copyCommand} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs">
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              {grid && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">Mapa de la subred</h3>
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${grid.size > 256 ? 32 : 16}, minmax(0,1fr))` }}>
                    {Array.from({ length: grid.size }, (_, i) => {
                      const ip = intToIp(grid.base + i);
                      const h = byIp.get(ip);
                      return (
                        <div
                          key={ip}
                          title={ip}
                          className={`aspect-square rounded-[3px] ${!h ? 'bg-muted' : h.is_up ? 'bg-emerald-500' : 'bg-red-500/80'}`}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Gris = sin dato del colector (no implica libre).</p>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                  <h3 className="mr-auto text-sm font-semibold">Equipos descubiertos</h3>
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className={`${inputClass} w-48 pl-8`} />
                  </div>
                  <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={inputClass}>
                    <option value="all">Todos</option>
                    <option value="up">Respondieron</option>
                    <option value="down">No respondieron</option>
                    <option value="new">Sin añadir</option>
                  </select>
                  {canWrite && (
                    <button
                      type="button"
                      disabled={adding || picked.size === 0}
                      onClick={() => addToInventory(hosts.filter((h) => picked.has(h.id)))}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      {adding ? <Loader2 size={12} className="animate-spin" /> : <DownloadCloud size={12} />}
                      Añadir al inventario ({picked.size})
                    </button>
                  )}
                </div>
                {loadingHosts ? (
                  <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" /> Cargando…
                  </div>
                ) : hosts.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    {selected.status === 'pending'
                      ? 'Esperando al colector…'
                      : selected.status === 'running'
                        ? 'El colector está escaneando…'
                        : 'Este escaneo no encontró equipos.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="w-10 px-4 py-2" />
                          <th className="px-3 py-2">IP</th>
                          <th className="px-3 py-2">Nombre</th>
                          <th className="px-3 py-2">MAC</th>
                          <th className="px-3 py-2">RTT</th>
                          <th className="px-3 py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((h) => (
                          <tr key={h.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2">
                              {canWrite && !h.promoted_device_id && h.is_up && (
                                <input
                                  type="checkbox"
                                  checked={picked.has(h.id)}
                                  onChange={(e) =>
                                    setPicked((p) => {
                                      const n = new Set(p);
                                      if (e.target.checked) n.add(h.id);
                                      else n.delete(h.id);
                                      return n;
                                    })
                                  }
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono">{h.ip}</td>
                            <td className="px-3 py-2">{h.snmp_sysname || h.hostname || '—'}</td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{h.mac || '—'}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{h.rtt_ms != null ? `${h.rtt_ms} ms` : '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 text-xs ${h.is_up ? 'text-emerald-400' : 'text-red-400'}`}>
                                {h.is_up ? <CircleCheck size={13} /> : <CircleX size={13} />}
                                {h.is_up ? 'Respondió' : 'No respondió'}
                              </span>
                              {h.promoted_device_id && (
                                <span className="ml-2 rounded-full border border-border px-1.5 text-[10px] text-muted-foreground">En inventario</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <NewScanWizard open={wizardOpen} onClose={() => setWizardOpen(false)} orgId={orgId} userId={user?.id ?? null} onCreated={() => loadScans()} />
    </div>
  );
}
