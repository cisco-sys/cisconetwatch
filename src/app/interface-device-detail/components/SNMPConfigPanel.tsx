'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Badge from '@/components/ui/Badge';
import { Save, Loader2, Wifi, Shield } from 'lucide-react';
import { toast } from 'sonner';

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

export default function SNMPConfigPanel() {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, watch } = useForm<SnmpFields>({
    defaultValues: {
      version: 'v2c',
      community: 'netwatch-ro',
      username: 'netwatch',
      authProtocol: 'SHA',
      privProtocol: 'AES',
      pollInterval: '60',
      timeout: '5',
      retries: '3',
      trapEnabled: true,
      trapCommunity: 'netwatch-traps',
    },
  });

  const version = watch('version');

  const onSubmit = async (data: SnmpFields) => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSaving(false);
    toast.success(`SNMP ${data.version} configuration saved`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Wifi size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">SNMP Agent Configuration</h2>
          <Badge variant="primary">SW-CORE-01</Badge>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">SNMP Version</label>
              <select {...register('version')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="v1">SNMPv1</option>
                <option value="v2c">SNMPv2c</option>
                <option value="v3">SNMPv3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Poll Interval (s)</label>
              <input type="number" {...register('pollInterval')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Timeout (s) / Retries</label>
              <div className="flex gap-2">
                <input type="number" {...register('timeout')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                <input type="number" {...register('retries')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>

          {(version === 'v1' || version === 'v2c') && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Community String (RO)</label>
              <input {...register('community')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
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
                <input {...register('username')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Auth Protocol</label>
                <select {...register('authProtocol')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="MD5">MD5</option>
                  <option value="SHA">SHA</option>
                  <option value="SHA256">SHA-256</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Auth Password</label>
                <input type="password" {...register('authPassword')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Priv Protocol</label>
                <select {...register('privProtocol')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="DES">DES</option>
                  <option value="AES">AES</option>
                  <option value="AES256">AES-256</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">Priv Password</label>
                <input type="password" {...register('privPassword')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" {...register('trapEnabled')} id="trapEnabled" className="rounded border-border" />
              <label htmlFor="trapEnabled" className="text-sm text-foreground">Enable trap reception</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Trap Community</label>
              <input {...register('trapCommunity')} className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save SNMP Config'}
          </button>
        </form>
      </div>
    </div>
  );
}
