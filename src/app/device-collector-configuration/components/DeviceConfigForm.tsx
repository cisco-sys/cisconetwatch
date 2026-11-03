'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Loader2, Server } from 'lucide-react';
import { toast } from 'sonner';
import ProtocolBadge from '@/components/ui/ProtocolBadge';

interface FormFields {
  hostname: string;
  ip: string;
  model: string;
  protocol: string;
  community: string;
  username: string;
  password: string;
}

export default function DeviceConfigForm() {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormFields>({
    defaultValues: { protocol: 'SNMP' },
  });

  const onSubmit = async (data: FormFields) => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSaving(false);
    toast.success(`Device ${data.hostname} (${data.ip}) added to inventory`);
    reset();
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Plus size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Add Device</h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {...register('ip', { required: 'Required' })}
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
          </select>
        </div>
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
            {...register('password')}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="••••••••"
          />
        </div>
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
