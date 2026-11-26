'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Badge from '@/components/ui/Badge';
import { Save, Loader2, Wifi, Shield, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SnmpFields {
  version: string;
  community: string;
  username: string;
  authProtocol: string;
  authPassword: string;
  privProtocol: string;
  privPassword: string;
  pollInterval: string;
  timeout: string;
  retries: string;
  trapEnabled: boolean;
  trapCommunity: string;
}

interface Meta {
  version?: string;
  username?: string | null;
  auth_protocol?: string | null;
  priv_protocol?: string | null;
  poll_interval_s?: number;
  timeout_s?: number;
  retries?: number;
  trap_enabled?: boolean;
  has_community?: boolean;
  has_auth_password?: boolean;
  has_priv_password?: boolean;
  has_trap_community?: boolean;
  updated_at?: string;
}

interface Props {
  deviceId: string;
  deviceName?: string;
}

export default function SNMPConfigPanel({ deviceId, deviceName }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { register, handleSubmit, watch, reset } = useForm<SnmpFields>({
    defaultValues: {
      version: 'v2c',
      community: '',
      username: '',
      authProtocol: 'SHA',
      authPassword: '',
      privProtocol: 'AES',
      privPassword: '',
      pollInterval: '60',
      timeout: '5',
      retries: '3',
      trapEnabled: true,
      trapCommunity: '',
    },
  });

  const version = watch('version');

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !deviceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.rpc('get_snmp_config', { p_device_id: deviceId });
    if (error) {
      setMeta(null);
      const msg = error.message || '';
      if (
        msg.includes('Could not find the function') ||
        msg.includes('function public.get_snmp_config') ||
        error.code === 'PGRST202' ||
        error.code === '42883'
      ) {
        setLoadError(
          'RPC get_snmp_config no existe en la base. Aplica la migracion supabase/migrations/20261103000005_encrypt_snmp_secrets.sql y configura app.snmp_encryption_key (ver docs/GO_LIVE.md).',
        );
      } else if (msg.includes('snmp_encryption_key')) {
        setLoadError('Falta app.snmp_encryption_key en Postgres. Ver docs/GO_LIVE.md seccion C.');
      } else if (error.code === '42501') {
        setLoadError('Sin permiso para ver configuracion SNMP.');
      } else {
        setLoadError(msg || 'No se pudo cargar SNMP config');
      }
    } else if (data) {
      const m = data as Meta;
      setMeta(m);
      reset({
        version: m.version ?? 'v2c',
        community: '',
        username: m.username ?? '',
        authProtocol: m.auth_protocol ?? 'SHA',
        authPassword: '',
        privProtocol: m.priv_protocol ?? 'AES',
        privPassword: '',
        pollInterval: String(m.poll_interval_s ?? 60),
        timeout: String(m.timeout_s ?? 5),
        retries: String(m.retries ?? 3),
        trapEnabled: m.trap_enabled ?? true,
        trapCommunity: '',
      });
    }
    setLoading(false);
  }, [deviceId, reset]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (data: SnmpFields) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error('Database not configured');
      return;
    }
    setIsSaving(true);
    try {
      const { data: result, error } = await supabase.rpc('upsert_snmp_config', {
        p_device_id: deviceId,
        p_version: data.version,
        p_community: data.community.trim() || null,
        p_username: data.username.trim() || null,
        p_auth_protocol: data.authProtocol || null,
        p_auth_password: data.authPassword || null,
        p_priv_protocol: data.privProtocol || null,
        p_priv_password: data.privPassword || null,
        p_poll_interval_s: Number(data.pollInterval) || 60,
        p_timeout_s: Number(data.timeout) || 5,
        p_retries: Number(data.retries) || 3,
        p_trap_enabled: data.trapEnabled,
        p_trap_community: data.trapCommunity.trim() || null,
      });
      if (error) {
        if (error.code === '42501') toast.error('You do not have permission to manage SNMP config');
        else if (error.message?.includes('snmp_encryption_key')) {
          toast.error('Encryption key not set on database. Ask the administrator to set app.snmp_encryption_key.');
        } else if (
          error.message?.includes('Could not find the function') ||
          error.code === 'PGRST202' ||
          error.code === '42883'
        ) {
          toast.error('RPC upsert_snmp_config missing — apply migration 05 (docs/GO_LIVE.md).');
        } else toast.error(error.message || 'Could not save SNMP config');
        return;
      }
      setMeta(result as Meta);
      setLoadError(null);
      reset({
        version: data.version,
        community: '',
        username: data.username,
        authProtocol: data.authProtocol,
        authPassword: '',
        privProtocol: data.privProtocol,
        privPassword: '',
        pollInterval: data.pollInterval,
        timeout: data.timeout,
        retries: data.retries,
        trapEnabled: data.trapEnabled,
        trapCommunity: '',
      });
      toast.success('SNMP config saved (secrets encrypted at rest)');
    } catch {
      toast.error('Unexpected error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading SNMP config…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-card border border-amber-500/40 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
          <AlertTriangle size={16} />
          SNMP no disponible
        </div>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <button
          type="button"
          onClick={() => load()}
          className="text-xs text-primary hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-2">
          <Wifi size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">SNMP Agent Configuration</h2>
          {deviceName && <Badge variant="primary">{deviceName}</Badge>}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock size={12} />
            Secrets encrypted (pgcrypto) — never returned to the browser
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {(meta?.has_community || meta?.has_auth_password || meta?.has_priv_password || meta?.has_trap_community) && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Stored secrets present:{' '}
              {[
                meta.has_community && 'community',
                meta.has_auth_password && 'auth password',
                meta.has_priv_password && 'priv password',
                meta.has_trap_community && 'trap community',
              ]
                .filter(Boolean)
                .join(', ')}
              . Leave password fields empty to keep existing values.
              {meta.updated_at && (
                <span className="block mt-1 font-mono">Updated {new Date(meta.updated_at).toLocaleString()}</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">SNMP Version</label>
              <select
                {...register('version')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="v1">SNMPv1</option>
                <option value="v2c">SNMPv2c</option>
                <option value="v3">SNMPv3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Poll Interval (s)</label>
              <input
                type="number"
                {...register('pollInterval')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Timeout (s) / Retries</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  {...register('timeout')}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  {...register('retries')}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {(version === 'v1' || version === 'v2c') && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Community String (RO)
                {meta?.has_community && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">· leave blank to keep</span>
                )}
              </label>
              <input
                type="password"
                autoComplete="off"
                {...register('community')}
                placeholder={meta?.has_community ? '•••••••• (stored encrypted)' : 'public'}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {version === 'v3' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <div className="sm:col-span-2 flex items-center gap-2 mb-1">
                <Shield size={14} className="text-primary" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-widest">SNMPv3 Security</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
                <input
                  {...register('username')}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Auth Protocol</label>
                <select
                  {...register('authProtocol')}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="MD5">MD5</option>
                  <option value="SHA">SHA</option>
                  <option value="SHA256">SHA-256</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Auth Password
                  {meta?.has_auth_password && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">· leave blank to keep</span>
                  )}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('authPassword')}
                  placeholder={meta?.has_auth_password ? '••••••••' : ''}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Priv Protocol</label>
                <select
                  {...register('privProtocol')}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="DES">DES</option>
                  <option value="AES">AES</option>
                  <option value="AES256">AES-256</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Priv Password
                  {meta?.has_priv_password && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">· leave blank to keep</span>
                  )}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('privPassword')}
                  placeholder={meta?.has_priv_password ? '••••••••' : ''}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" {...register('trapEnabled')} id="trapEnabled" className="rounded border-border" />
              <label htmlFor="trapEnabled" className="text-sm text-foreground">
                Enable trap reception
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Trap Community
                {meta?.has_trap_community && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">· leave blank to keep</span>
                )}
              </label>
              <input
                type="password"
                autoComplete="off"
                {...register('trapCommunity')}
                placeholder={meta?.has_trap_community ? '••••••••' : ''}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving…' : 'Save SNMP Config (encrypted)'}
          </button>
        </form>
      </div>
    </div>
  );
}
