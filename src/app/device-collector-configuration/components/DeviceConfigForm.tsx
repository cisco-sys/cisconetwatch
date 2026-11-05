'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Server } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type ProtocolOption = 'SNMP' | 'NETCONF' | 'SSH' | 'RESTCONF' | 'ICMP';

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
const IPV6 = /^[0-9a-fA-F:]+$/;

function isValidIp(value: string): boolean {
  const v = value.trim();
  return IPV4.test(v) || (v.includes(':') && IPV6.test(v));
}

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
  });

  const protocol = watch('protocol');
  const usesCredentials = protocol !== 'ICMP';

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
        p_model: data.model.trim() || undefined,
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
          <label className="block text-sm font-medium text-foreground mb-1.5">Hostname</label>
          <input
            {...register('hostname', { required: 'Required' })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="SW-CORE-01"
          />
          {errors.hostname && <p className="text-xs text-danger mt-1">{errors.hostname.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Management IP</label>
          <input
            {...register('ip', {
              required: 'Required',
              validate: (v) => isValidIp(v) || 'Enter a valid IP address',
            })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="10.0.0.1"
          />
          {errors.ip && <p className="text-xs text-danger mt-1">{errors.ip.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Model</label>
          <input
            {...register('model')}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Catalyst 9300-48P"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Protocol</label>
          <select
            {...register('protocol')}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="SNMP">SNMP</option>
            <option value="NETCONF">NETCONF</option>
            <option value="SSH">SSH</option>
            <option value="RESTCONF">RESTCONF</option>
            <option value="ICMP">ICMP</option>
          </select>
        </div>

        {usesCredentials ? (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">SNMP Community / User</label>
              <input
                {...register('community')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="public / netwatch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password / Auth Key</label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Credentials are not stored yet: only the device record is saved. Credential storage is enabled once encrypted storage is configured.
            </p>
          </>
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
