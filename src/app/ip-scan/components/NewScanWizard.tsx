'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Info, Loader2, Radar, X } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { DEFAULT_CONFIG, MAX_ADDRESSES, ipToInt, parseTargets, type ScanConfig } from '@/lib/ipscan/ipscan';

const STEPS = ['Inicio', 'Límites', 'Opciones', 'Resumen'] as const;
const inputClass =
  'w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  userId: string | null;
  onCreated: () => void;
}

export default function NewScanWizard({ open, onClose, orgId, userId, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState<ScanConfig>(DEFAULT_CONFIG);
  const [targetsText, setTargetsText] = useState('');
  const [exclusionsText, setExclusionsText] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setCfg(DEFAULT_CONFIG);
    setTargetsText('');
    setExclusionsText('');
    setName('');
    setDescription('');
  }, [open]);

  const parsed = useMemo(() => parseTargets(targetsText), [targetsText]);
  const parsedExclusions = useMemo(() => parseTargets(exclusionsText), [exclusionsText]);

  if (!open) return null;

  const gatewayInvalid = cfg.gateway_ip.trim() !== '' && ipToInt(cfg.gateway_ip) === null;
  const tooMany = parsed.total > MAX_ADDRESSES;
  const step0Ok = parsed.entries.length > 0 && parsed.errors.length === 0 && !tooMany && !gatewayInvalid;

  async function run() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error('La conexión con la base de datos no está configurada.');
      return;
    }
    if (!orgId || !userId) {
      toast.error('Tu cuenta no tiene una empresa asignada.');
      return;
    }
    setSaving(true);
    try {
      const config: ScanConfig = {
        ...cfg,
        targets: parsed.entries,
        limits: { ...cfg.limits, exclusions: parsedExclusions.entries },
      };
      const { error } = await supabase.from('discovery_scans').insert({
        org_id: orgId,
        created_by: userId,
        name: name.trim(),
        description: description.trim() || null,
        cidr: parsed.entries.join(', '),
        gateway_ip: cfg.include_gateway && cfg.gateway_ip.trim() ? cfg.gateway_ip.trim() : null,
        status: 'pending',
        config,
      });
      if (error) {
        toast.error(error.code === '42501' ? 'No tienes permiso para crear escaneos.' : 'No se pudo crear el escaneo.');
        return;
      }
      toast.success('Escaneo creado. Queda pendiente hasta que el colector de tu red lo ejecute.');
      onCreated();
      onClose();
    } catch {
      toast.error('Ocurrió un error inesperado.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <div role="dialog" aria-modal="true" className="flex h-[min(640px,94vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Radar size={16} className="text-primary" /> Nuevo escaneo de red
          </h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav className="border-b border-border md:w-44 md:border-b-0 md:border-r p-2">
            <ol className="flex gap-1 overflow-x-auto md:flex-col">
              {STEPS.map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => i <= step && setStep(i)}
                    disabled={i > step}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      i === step ? 'bg-primary/10 font-semibold text-primary' : i < step ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {i < step ? <Check size={12} className="inline mr-1 text-emerald-400" /> : null}
                    {label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {step === 0 && (
              <>
                <div>
                  <label className={labelClass}>Objetivos (IP, rango o CIDR)</label>
                  <textarea
                    value={targetsText}
                    onChange={(e) => setTargetsText(e.target.value)}
                    rows={5}
                    placeholder={'192.168.10.0/24\n10.0.0.1 - 10.0.0.50'}
                    className={inputClass + ' font-mono'}
                  />
                  {parsed.errors.map((e) => (
                    <p key={e} className="text-xs text-red-400 mt-1">{e}</p>
                  ))}
                  {tooMany && <p className="text-xs text-red-400 mt-1">Máximo {MAX_ADDRESSES} direcciones.</p>}
                  <p className="text-xs text-muted-foreground mt-1">{parsed.total} direcciones estimadas</p>
                </div>
                <div>
                  <label className={labelClass}>Gateway (opcional)</label>
                  <input
                    value={cfg.gateway_ip}
                    onChange={(e) => setCfg((c) => ({ ...c, gateway_ip: e.target.value }))}
                    className={inputClass + ' font-mono'}
                    placeholder="192.168.10.1"
                  />
                  {gatewayInvalid && <p className="text-xs text-red-400 mt-1">IP de gateway no válida.</p>}
                </div>
                <p className="flex gap-2 text-xs text-muted-foreground">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  El navegador no hace ping. El colector en tu LAN ejecuta el escaneo y escribe los resultados.
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.limits.private_only}
                    onChange={(e) =>
                      setCfg((c) => ({ ...c, limits: { ...c.limits, private_only: e.target.checked } }))
                    }
                  />
                  Solo direcciones privadas (RFC1918)
                </label>
                <div>
                  <label className={labelClass}>Exclusiones</label>
                  <textarea
                    value={exclusionsText}
                    onChange={(e) => setExclusionsText(e.target.value)}
                    rows={3}
                    className={inputClass + ' font-mono'}
                    placeholder="192.168.10.1"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Hilos máx.</label>
                  <input
                    type="number"
                    min={1}
                    max={128}
                    value={cfg.options.max_threads}
                    onChange={(e) =>
                      setCfg((c) => ({
                        ...c,
                        options: { ...c.options, max_threads: Number(e.target.value) || 40 },
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Timeout ping (ms)</label>
                  <input
                    type="number"
                    min={200}
                    max={10000}
                    value={cfg.options.ping_timeout_ms}
                    onChange={(e) =>
                      setCfg((c) => ({
                        ...c,
                        options: { ...c.options, ping_timeout_ms: Number(e.target.value) || 3000 },
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">
                  Las credenciales SNMP no se guardan en el escaneo (solo etiquetas). El inventario las gestiona por separado.
                </p>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className={labelClass}>Nombre del escaneo</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="LAN piso 2" />
                </div>
                <div>
                  <label className={labelClass}>Descripción</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="text-foreground">Objetivos:</span> {parsed.entries.join(', ') || '—'}
                  </p>
                  <p>
                    <span className="text-foreground">Direcciones:</span> ~{parsed.total}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={(step === 0 && !step0Ok) || (step === 1 && parsedExclusions.errors.length > 0)}
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || name.trim().length < 2 || !step0Ok}
              onClick={run}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Crear escaneo pendiente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
