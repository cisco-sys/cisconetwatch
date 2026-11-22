'use client';
import React, { useState } from 'react';
import { X, Loader2, ChevronRight, ChevronLeft, Play } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

const STEPS = [
  { id: 'start', label: '1. Start' },
  { id: 'credentials', label: '2. Credentials' },
  { id: 'options', label: '3. Options' },
  { id: 'review', label: 'Review & Run' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/** Credential profiles are labels only — secrets live on the LAN collector / encrypted SNMP store. */
const CREDENTIAL_PROFILES = [
  { id: 'icmp-only', name: 'ICMP only (no SNMP)', type: 'ICMP' },
  { id: 'snmp-public-v2c', name: 'public', type: 'SNMP v2c' },
  { id: 'snmp-public-v1', name: 'public', type: 'SNMP v1' },
  { id: 'snmp-netwatch', name: 'netwatch', type: 'SNMP v2c' },
] as const;

const inputClass =
  'w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

interface Props {
  open: boolean;
  onClose: () => void;
  onQueued: () => void;
}

export default function DiscoveryWizard({ open, onClose, onQueued }: Props) {
  const { user } = useCurrentUser();
  const [step, setStep] = useState<StepId>('start');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gatewayIp, setGatewayIp] = useState('192.168.10.1');
  const [cidr, setCidr] = useState('192.168.10.0/24');
  const [extraCidr, setExtraCidr] = useState('');
  const [credentialId, setCredentialId] = useState<string>('icmp-only');
  const [useAllCredentials, setUseAllCredentials] = useState(false);
  const [expandWireless, setExpandWireless] = useState(false);
  const [expandStorage, setExpandStorage] = useState(false);
  const [autoMonitor, setAutoMonitor] = useState(true);

  if (!open) return null;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function next() {
    if (step === 'start') {
      if (!cidr.trim()) {
        toast.error('Indica al menos un CIDR o rango.');
        return;
      }
      setStep('credentials');
    } else if (step === 'credentials') setStep('options');
    else if (step === 'options') setStep('review');
  }

  function back() {
    if (step === 'credentials') setStep('start');
    else if (step === 'options') setStep('credentials');
    else if (step === 'review') setStep('options');
  }

  async function run() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error('Supabase no configurado.');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error('Sesion no valida.');
      return;
    }

    const orgId = user?.orgId;
    if (!orgId) {
      toast.error('Tu usuario no tiene org_id. Asigna organizacion en profiles.');
      return;
    }

    const cred = CREDENTIAL_PROFILES.find((c) => c.id === credentialId);
    const config = {
      gatewayIp: gatewayIp.trim() || null,
      extraRanges: extraCidr
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      credentials: useAllCredentials
        ? CREDENTIAL_PROFILES.map((c) => ({ id: c.id, name: c.name, type: c.type }))
        : cred
          ? [{ id: cred.id, name: cred.name, type: cred.type }]
          : [],
      expand: { wireless: expandWireless, storage: expandStorage },
      autoMonitor,
      // Secrets are NOT stored here — collector uses env / encrypted store
      secretsPolicy: 'collector-side-only',
    };

    setSaving(true);
    try {
      const res = await fetch('/api/collector/discovery', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'queue',
          orgId,
          cidr: cidr.trim(),
          name: name.trim() || `Discovery ${cidr.trim()}`,
          description: description.trim() || null,
          gatewayIp: gatewayIp.trim() || null,
          config,
        }),
      });

      if (res.status === 201 || res.ok) {
        toast.success(
          'Escaneo en cola (pending). El colector LAN debe tomarlo — el navegador no hace ping/SNMP.',
        );
        onQueued();
        onClose();
        return;
      }
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'No se pudo encolar el escaneo.');
    } catch {
      toast.error('Error de red.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Discovery Scan</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-44 sm:w-52 border-r border-border bg-muted/20 py-3 text-sm shrink-0">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`px-4 py-2 ${
                  step === s.id
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </div>
            ))}
          </aside>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {step === 'start' && (
              <>
                <p className="text-sm font-medium text-foreground">Starting set for the scan</p>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Gateway IP</label>
                  <input
                    className={`${inputClass} font-mono`}
                    value={gatewayIp}
                    onChange={(e) => setGatewayIp(e.target.value)}
                    placeholder="192.168.10.1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Local subnet (CIDR)</label>
                  <input
                    className={`${inputClass} font-mono`}
                    value={cidr}
                    onChange={(e) => setCidr(e.target.value)}
                    placeholder="192.168.10.0/24"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Extra ranges (optional, comma-separated)
                  </label>
                  <input
                    className={`${inputClass} font-mono`}
                    value={extraCidr}
                    onChange={(e) => setExtraCidr(e.target.value)}
                    placeholder="192.168.60.0/24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Limit: el colector rechaza rangos de mas de 4096 hosts. El scan real lo ejecuta el PC en la LAN.
                </p>
              </>
            )}

            {step === 'credentials' && (
              <>
                <p className="text-sm font-medium text-foreground">Select credentials for the scan</p>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={useAllCredentials}
                    onChange={(e) => setUseAllCredentials(e.target.checked)}
                  />
                  Use all current credential profiles (labels only)
                </label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-xs text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-left">Sel</th>
                        <th className="px-3 py-2 text-left">Credential Name</th>
                        <th className="px-3 py-2 text-left">Credential Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {CREDENTIAL_PROFILES.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              name="cred"
                              disabled={useAllCredentials}
                              checked={!useAllCredentials && credentialId === c.id}
                              onChange={() => setCredentialId(c.id)}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{c.name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{c.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  Como WhatsUp Gold: aqui solo eliges el <strong>perfil</strong> (ej. community name
                  "public"). El valor secreto SNMP no viaja por el navegador; el colector LAN usa{' '}
                  <code className="font-mono">CNW_SNMP_COMMUNITY</code> o el almacén cifrado.
                </p>
              </>
            )}

            {step === 'options' && (
              <>
                <p className="text-sm font-medium text-foreground">Options</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={expandWireless}
                    onChange={(e) => setExpandWireless(e.target.checked)}
                  />
                  Expand wireless infrastructure (hint for collector)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={expandStorage}
                    onChange={(e) => setExpandStorage(e.target.checked)}
                  />
                  Include storage devices (hint)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoMonitor}
                    onChange={(e) => setAutoMonitor(e.target.checked)}
                  />
                  Auto-Monitoring — al promover, dejar listo para poll ICMP
                </label>
                <p className="text-xs text-muted-foreground">
                  Schedule: en esta version el colector toma jobs <code className="font-mono">pending</code> al
                  ejecutarse (cron/Task Scheduler). No hay motor de calendario en Vercel.
                </p>
              </>
            )}

            {step === 'review' && (
              <>
                <p className="text-sm font-medium text-foreground mb-3">Scan summary</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Name</label>
                    <input
                      className={inputClass}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`Discovery ${cidr}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                    <input
                      className={inputClass}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg border border-border divide-y divide-border text-sm">
                    <div className="px-3 py-2 flex justify-between gap-2">
                      <span className="text-muted-foreground">Gateway IP</span>
                      <span className="font-mono">{gatewayIp || '—'}</span>
                    </div>
                    <div className="px-3 py-2 flex justify-between gap-2">
                      <span className="text-muted-foreground">Local subnet</span>
                      <span className="font-mono">{cidr}</span>
                    </div>
                    {extraCidr.trim() && (
                      <div className="px-3 py-2 flex justify-between gap-2">
                        <span className="text-muted-foreground">Extra ranges</span>
                        <span className="font-mono text-right">{extraCidr}</span>
                      </div>
                    )}
                    <div className="px-3 py-2 flex justify-between gap-2">
                      <span className="text-muted-foreground">Credentials</span>
                      <span className="text-right text-xs">
                        {useAllCredentials
                          ? 'All profiles'
                          : CREDENTIAL_PROFILES.find((c) => c.id === credentialId)?.name +
                            ' (' +
                            CREDENTIAL_PROFILES.find((c) => c.id === credentialId)?.type +
                            ')'}
                      </span>
                    </div>
                    <div className="px-3 py-2 flex justify-between gap-2">
                      <span className="text-muted-foreground">Auto-Monitoring</span>
                      <span>{autoMonitor ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Run</strong> encola el job. Ejecuta en la LAN:{' '}
                    <code className="font-mono">python3 collector/discover.py</code> (tomara jobs pending) o pasa
                    el CIDR manualmente.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {step !== 'review' ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={run}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
