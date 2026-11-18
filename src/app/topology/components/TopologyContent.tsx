'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Network, RefreshCw, Trash2, Pencil, Check, X, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DISCOVERED_VIA_LABEL,
  LINK_TYPE_LABEL,
  PROTOCOL_LABEL,
  STATUS_LABEL,
  T,
  VENDOR_LABEL,
} from '@/lib/i18n/es';

interface Device {
  id: string;
  name: string;
  ip: string;
  model: string | null;
  vendor: string;
  site: string | null;
  status: 'up' | 'degraded' | 'down';
  protocol: string;
}

interface DeviceLink {
  id: string;
  source_device_id: string;
  target_device_id: string;
  source_interface: string | null;
  target_interface: string | null;
  link_type: string;
  discovered_via: string;
  status: 'up' | 'down' | 'degraded';
}

const W = 900;
const H = 620;

const inputClass =
  'w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

const NODE_STROKE: Record<string, string> = {
  up: 'stroke-emerald-400',
  degraded: 'stroke-amber-400',
  down: 'stroke-red-400',
};
const LINK_STROKE: Record<string, string> = {
  up: 'stroke-emerald-500/60',
  degraded: 'stroke-amber-500/70',
  down: 'stroke-red-500/70',
};
const STATUS_TEXT: Record<string, string> = {
  up: 'text-emerald-400',
  degraded: 'text-amber-400',
  down: 'text-red-400',
};

function hasName(d: Device): boolean {
  const n = (d.name ?? '').trim();
  return n.length > 0 && n !== d.ip;
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function computeLayout(devices: Device[], links: DeviceLink[]): Map<string, { x: number; y: number }> {
  const degree = new Map<string, number>();
  for (const l of links) {
    degree.set(l.source_device_id, (degree.get(l.source_device_id) ?? 0) + 1);
    degree.set(l.target_device_id, (degree.get(l.target_device_id) ?? 0) + 1);
  }
  const sorted = [...devices].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  const pos = new Map<string, { x: number; y: number }>();
  const cx = W / 2;
  const cy = H / 2;
  if (sorted.length === 0) return pos;

  pos.set(sorted[0].id, { x: cx, y: cy });
  const rest = sorted.slice(1);
  let index = 0;
  let ring = 1;
  while (index < rest.length) {
    const capacity = ring * 8;
    const slice = rest.slice(index, index + capacity);
    const radius = Math.min(110 + ring * 85, 285);
    slice.forEach((d, k) => {
      const angle = (2 * Math.PI * k) / slice.length - Math.PI / 2 + ring * 0.35;
      pos.set(d.id, { x: cx + radius * Math.cos(angle) * 1.35, y: cy + radius * Math.sin(angle) });
    });
    index += capacity;
    ring += 1;
  }
  return pos;
}

export default function TopologyContent() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [links, setLinks] = useState<DeviceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(T.common.noDatabase);
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    const [devRes, linkRes] = await Promise.all([
      supabase.from('devices').select('id,name,ip,model,vendor,site,status,protocol').order('name'),
      supabase
        .from('device_links')
        .select('id,source_device_id,target_device_id,source_interface,target_interface,link_type,discovered_via,status'),
    ]);
    if (devRes.error || linkRes.error) {
      setError(true);
      toast.error(T.topology.loadError);
    } else {
      setDevices((devRes.data ?? []) as Device[]);
      setLinks((linkRes.data ?? []) as DeviceLink[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const positions = useMemo(() => computeLayout(devices, links), [devices, links]);
  const byId = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const selectedLinks = useMemo(
    () => (selectedId ? links.filter((l) => l.source_device_id === selectedId || l.target_device_id === selectedId) : []),
    [links, selectedId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{T.topology.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {T.topology.subtitle}
            {!loading && !error && devices.length > 0 && (
              <span className="ml-2 text-foreground/70">
                {T.topology.devicesCount(devices.length)} · {T.topology.linksCount(links.length)}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 border border-border rounded-lg px-3.5 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {T.common.refresh}
        </button>
      </div>

      {loading && devices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          {T.common.loading}
        </div>
      ) : error && devices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {T.topology.loadError}
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Network size={28} className="mx-auto text-muted-foreground" />
          <h2 className="mt-3 text-sm font-semibold text-foreground">{T.topology.emptyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{T.topology.emptyBody}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto"
              role="group"
              aria-label={T.topology.title}
              onClick={() => setSelectedId(null)}
            >
              {links.map((l) => {
                const a = positions.get(l.source_device_id);
                const b = positions.get(l.target_device_id);
                if (!a || !b) return null;
                const active = selectedId && (l.source_device_id === selectedId || l.target_device_id === selectedId);
                return (
                  <line
                    key={l.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={`${LINK_STROKE[l.status] ?? LINK_STROKE.up} ${active ? '' : selectedId ? 'opacity-30' : ''}`}
                    strokeWidth={active ? 3 : 2}
                    strokeDasharray={l.status === 'down' ? '6 5' : undefined}
                  />
                );
              })}

              {devices.map((d) => {
                const p = positions.get(d.id);
                if (!p) return null;
                const isSelected = d.id === selectedId;
                const label = hasName(d) ? d.name : 'Sin nombre';
                return (
                  <g
                    key={d.id}
                    transform={`translate(${p.x} ${p.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${label}, ${d.ip}, ${STATUS_LABEL[d.status] ?? d.status}`}
                    aria-pressed={isSelected}
                    className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-[4]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(d.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(d.id);
                      }
                    }}
                  >
                    {isSelected && <circle r={34} className="fill-primary/10 stroke-primary" strokeWidth={1.5} />}
                    <circle r={26} className={`fill-card ${NODE_STROKE[d.status] ?? NODE_STROKE.up}`} strokeWidth={3} />
                    <text textAnchor="middle" dy="0.35em" className="fill-foreground text-[11px] font-semibold select-none">
                      {(VENDOR_LABEL[d.vendor] ?? d.vendor).slice(0, 2).toUpperCase()}
                    </text>
                    <text
                      textAnchor="middle"
                      y={46}
                      className={`text-[12px] font-semibold select-none ${hasName(d) ? 'fill-foreground' : 'fill-muted-foreground italic'}`}
                    >
                      {shorten(label, 18)}
                    </text>
                    <text textAnchor="middle" y={61} className="fill-muted-foreground text-[11px] font-mono select-none">
                      {d.ip}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="px-4 py-3 border-t border-border flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-emerald-500" />
                {T.topology.legendUp}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-5 bg-amber-500" />
                {T.topology.legendDegraded}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 border-t-2 border-dashed border-red-500" />
                {T.topology.legendDown}
              </span>
            </div>
          </div>

          <DetailPanel device={selected} devices={devices} links={selectedLinks} byId={byId} onChanged={load} />
        </div>
      )}
    </div>
  );
}

interface PanelProps {
  device: Device | null;
  devices: Device[];
  links: DeviceLink[];
  byId: Map<string, Device>;
  onChanged: () => void;
}

function DetailPanel({ device, devices, links, byId, onChanged }: PanelProps) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [target, setTarget] = useState('');
  const [sourceIf, setSourceIf] = useState('');
  const [targetIf, setTargetIf] = useState('');
  const [linkType, setLinkType] = useState('ethernet');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    setEditing(false);
    setNameDraft(device && hasName(device) ? device.name : '');
    setTarget('');
    setSourceIf('');
    setTargetIf('');
    setLinkType('ethernet');
  }, [device?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!device) {
    return (
      <aside className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
        {T.topology.selectPrompt}
      </aside>
    );
  }

  const unnamed = !hasName(device);
  const others = devices.filter((d) => d.id !== device.id);

  async function saveName() {
    const supabase = getSupabaseBrowserClient();
    const name = nameDraft.trim();
    if (!supabase || !device || name.length === 0) return;
    setSavingName(true);
    try {
      const { data, error } = await supabase.from('devices').update({ name }).eq('id', device.id).select('id');
      if (error || !data || data.length === 0) {
        toast.error(error && error.code !== '42501' ? T.common.unexpected : T.common.noPermission);
        return;
      }
      toast.success(T.topology.renamed);
      setEditing(false);
      onChanged();
    } catch {
      toast.error(T.common.unexpected);
    } finally {
      setSavingName(false);
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !device || !target) return;
    setSavingLink(true);
    try {
      const { error } = await supabase.from('device_links').insert({
        source_device_id: device.id,
        target_device_id: target,
        source_interface: sourceIf.trim() || null,
        target_interface: targetIf.trim() || null,
        link_type: linkType,
        discovered_via: 'manual',
      });
      if (error) {
        if (error.code === '23505') toast.error(T.topology.linkExists);
        else if (error.code === '42501') toast.error(T.common.noPermission);
        else toast.error(T.common.unexpected);
        return;
      }
      toast.success(T.topology.linkCreated);
      setTarget('');
      setSourceIf('');
      setTargetIf('');
      onChanged();
    } catch {
      toast.error(T.common.unexpected);
    } finally {
      setSavingLink(false);
    }
  }

  async function removeLink(id: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase.from('device_links').delete().eq('id', id).select('id');
    if (error || !data || data.length === 0) {
      toast.error(T.common.noPermission);
      return;
    }
    toast.success(T.topology.linkDeleted);
    onChanged();
  }

  return (
    <aside className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        {editing || unnamed ? (
          <div>
            {unnamed && !editing && (
              <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <p className="text-sm font-medium text-amber-300">{T.topology.unnamedTitle}</p>
                <p className="text-xs text-amber-200/80 mt-0.5">{T.topology.unnamedBody}</p>
              </div>
            )}
            <label htmlFor="device-name" className="sr-only">
              {T.topology.rename}
            </label>
            <div className="flex gap-2">
              <input
                id="device-name"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape' && !unnamed) setEditing(false);
                }}
                placeholder={T.topology.namePlaceholder}
                maxLength={80}
                className={inputClass}
              />
              <button
                type="button"
                onClick={saveName}
                disabled={savingName || nameDraft.trim().length === 0}
                aria-label={T.common.save}
                className="flex items-center justify-center rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {savingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              {!unnamed && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label={T.common.cancel}
                  className="flex items-center justify-center rounded-lg border border-border px-3 text-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">{device.name}</h2>
              <p className="font-mono text-xs text-muted-foreground">{device.ip}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNameDraft(device.name);
                setEditing(true);
              }}
              aria-label={T.topology.rename}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>

      <dl className="px-5 py-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm border-b border-border">
        <dt className="text-muted-foreground">{T.topology.ip}</dt>
        <dd className="text-right font-mono text-foreground">{device.ip}</dd>
        <dt className="text-muted-foreground">{T.topology.model}</dt>
        <dd className="text-right text-foreground">{device.model || '—'}</dd>
        <dt className="text-muted-foreground">{T.topology.vendor}</dt>
        <dd className="text-right text-foreground">{VENDOR_LABEL[device.vendor] ?? device.vendor}</dd>
        <dt className="text-muted-foreground">{T.topology.site}</dt>
        <dd className="text-right text-foreground">{device.site || '—'}</dd>
        <dt className="text-muted-foreground">{T.topology.status}</dt>
        <dd className={`text-right font-medium ${STATUS_TEXT[device.status] ?? ''}`}>
          {STATUS_LABEL[device.status] ?? device.status}
        </dd>
        <dt className="text-muted-foreground">{T.topology.protocol}</dt>
        <dd className="text-right text-foreground">{PROTOCOL_LABEL[device.protocol] ?? device.protocol}</dd>
      </dl>

      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">{T.topology.connections}</h3>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">{T.topology.noConnections}</p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => {
              const outgoing = l.source_device_id === device.id;
              const otherId = outgoing ? l.target_device_id : l.source_device_id;
              const other = byId.get(otherId);
              const localIf = outgoing ? l.source_interface : l.target_interface;
              const remoteIf = outgoing ? l.target_interface : l.source_interface;
              return (
                <li key={l.id} className="rounded-lg border border-border px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-foreground truncate">
                      {other ? (hasName(other) ? other.name : 'Sin nombre') : '—'}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{other?.ip}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(localIf || '?') + ' ↔ ' + (remoteIf || '?')} · {LINK_TYPE_LABEL[l.link_type] ?? l.link_type} ·{' '}
                      {DISCOVERED_VIA_LABEL[l.discovered_via] ?? l.discovered_via}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLink(l.id)}
                    aria-label={`${T.common.delete}: ${other?.name ?? ''}`}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-muted"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={addLink} className="px-5 py-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Link2 size={14} />
          {T.topology.addConnection}
        </h3>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">{T.topology.noOtherDevices}</p>
        ) : (
          <>
            <div>
              <label htmlFor="link-target" className="block text-xs text-muted-foreground mb-1">
                {T.topology.connectTo}
              </label>
              <select id="link-target" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass}>
                <option value="">{T.topology.chooseDevice}</option>
                {others.map((d) => (
                  <option key={d.id} value={d.id}>
                    {hasName(d) ? d.name : 'Sin nombre'} ({d.ip})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="link-source-if" className="block text-xs text-muted-foreground mb-1">
                  {T.topology.localPort}
                </label>
                <input
                  id="link-source-if"
                  value={sourceIf}
                  onChange={(e) => setSourceIf(e.target.value)}
                  placeholder="Gi1/0/1"
                  maxLength={40}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label htmlFor="link-target-if" className="block text-xs text-muted-foreground mb-1">
                  {T.topology.remotePort}
                </label>
                <input
                  id="link-target-if"
                  value={targetIf}
                  onChange={(e) => setTargetIf(e.target.value)}
                  placeholder="Gi0/0"
                  maxLength={40}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="link-type" className="block text-xs text-muted-foreground mb-1">
                {T.topology.linkType}
              </label>
              <select id="link-type" value={linkType} onChange={(e) => setLinkType(e.target.value)} className={inputClass}>
                {Object.entries(LINK_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={savingLink || !target}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {savingLink ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {T.topology.connect}
            </button>
          </>
        )}
      </form>
    </aside>
  );
}
