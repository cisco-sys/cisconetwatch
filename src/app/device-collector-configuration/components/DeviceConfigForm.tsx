'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Server } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const PROTOCOLS = ['SNMP', 'NETCONF', 'SSH', 'RESTCONF', 'TELEMETRY', 'ICMP'] as const;
type ProtocolOption = (typeof PROTOCOLS)[number];

interface FormFields {
  hostname: string;
  ip: string;
  model: string;
  protocol: ProtocolOption;
  community: string;
  username: string;
  password: string;
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function isValidIpv6(value: string): boolean {
  if (!value.includes(':') || !/^[0-9a-fA-F:.]+$/.test(value)) return false;
  try {
    // El parser de URL del navegador valida el formato IPv6 completo (::, 8 grupos, IPv4 embebida)
    new URL(`http://[${value}]`);
    return true;
  } catch {
    return false;
  }
}

function isValidIp(value: string): boolean {
  const v = value.trim();
  return IPV4.test(v) || isValidIpv6(v);
}

type CredentialMode = 'none' | 'snmp' | 'userpass';

function credentialMode(protocol: ProtocolOption): CredentialMode {
  if (protocol === 'ICMP') return 'none';
  if (protocol === 'SNMP') return 'snmp';
  return 'userpass'; // NETCONF, SSH, RESTCONF, TELEMETRY
}

const inputClass =
  'w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

export default function DeviceConfigForm() {
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormFields>({
    defaultValues: { protocol: 'SNMP' },
    // Los campos de credenciales se descartan al desmontarse (p. ej. al cambiar de protocolo)
    shouldUnregister: true,
  });

  const protocol = watch('protocol');
  const mode = credentialMode(protocol);

  const onSubmit = async (data: FormFields) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error('Database connection is not configured. Contact your administrator.');
      return;
    }

    setIsSaving(true);
    try {
      const { data: device, error } = await supabase.rpc('upsert_device', {
        p_name: data.hostname.trim(),
        p_ip: data.ip.trim(),
        p_model: data.model?.trim() || undefined,
        p_protocol: data.protocol,
      });

      if (error) {
        if (error.code === '42501') {
          toast.error('You do not have permission to add devices.');
        } else if (error.message?.toLowerCase().includes('invalid input syntax for type inet')) {
          toast.error('The management IP is not valid.');
        } else {
          toast.error('Could not save the device. Please try again.');
        }
        return;
      }

      toast.success(`Device ${device?.name ?? data.hostname} (${data.ip}) saved to inventory`);
      reset({ protocol: data.protocol });
    } catch {
      toast.error('Unexpected error while saving the device.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Plus size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Add Device</h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
        <div>
          <label htmlFor="device-hostname" className={labelClass}>
            Hostname
          </label>
          <input
            id="device-hostname"
            {...register('hostname', {
              required: 'Required',
              validate: (v) => v.trim().length > 0 || 'Required',
            })}
            aria-invalid={!!errors.hostname}
            aria-describedby={errors.hostname ? 'device-hostname-error' : undefined}
            className={inputClass}
            placeholder="SW-CORE-01"
          />
          {errors.hostname && (
            <p id="device-hostname-error" role="alert" className="text-xs text-danger mt-1">
              {errors.hostname.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="device-ip" className={labelClass}>
            Management IP
          </label>
          <input
            id="device-ip"
            {...register('ip', {
              required: 'Required',
              validate: (v) => isValidIp(v) || 'Enter a valid IP address',
            })}
            aria-invalid={!!errors.ip}
            aria-describedby={errors.ip ? 'device-ip-error' : undefined}
            className={`${inputClass} font-mono`}
            placeholder="10.0.0.1"
          />
          {errors.ip && (
            <p id="device-ip-error" role="alert" className="text-xs text-danger mt-1">
              {errors.ip.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="device-model" className={labelClass}>
            Model
          </label>
          <input
            id="device-model"
            {...register('model')}
            className={inputClass}
            placeholder="Catalyst 9300-48P"
          />
        </div>

        <div>
          <label htmlFor="device-protocol" className={labelClass}>
            Protocol
          </label>
          <select id="device-protocol" {...register('protocol')} className={inputClass}>
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>
                {p === 'TELEMETRY' ? 'TELEMETRY (gRPC / MDT)' : p}
              </option>
            ))}
          </select>
        </div>

        {mode === 'snmp' && (
          <>
            <div>
              <label htmlFor="device-community" className={labelClass}>
                SNMP Community / User
              </label>
              <input
                id="device-community"
                autoComplete="off"
                {...register('community')}
                className={`${inputClass} font-mono`}
                placeholder="public / netwatch"
              />
            </div>
            <div>
              <label htmlFor="device-password" className={labelClass}>
                Auth Key
              </label>
              <input
                id="device-password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          </>
        )}

        {mode === 'userpass' && (
          <>
            <div>
              <label htmlFor="device-username" className={labelClass}>
                Username
              </label>
              <input
                id="device-username"
                autoComplete="off"
                {...register('username')}
                className={`${inputClass} font-mono`}
                placeholder="netwatch"
              />
            </div>
            <div>
              <label htmlFor="device-password" className={labelClass}>
                Password
              </label>
              <input
                id="device-password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          </>
        )}

        {mode !== 'none' ? (
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Credentials are not stored yet: only the device record is saved. Credential storage is enabled once
            encrypted storage is configured.
            {protocol === 'TELEMETRY' &&
              ' TELEMETRY uses model-driven telemetry (gRPC), so the collector will need these credentials once storage is enabled.'}
          </p>
        ) : (
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            ICMP only checks reachability (ping), so no credentials are required.
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
            {isSaving ? 'Adding...' : 'Add Device'}
          </button>
        </div>
      </form>
    </div>
  );
}
