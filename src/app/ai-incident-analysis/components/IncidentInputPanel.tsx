'use client';
import React from 'react';
import { useForm } from 'react-hook-form';
import { BrainCircuit, Loader2, AlertCircle, Clock, Server, AlertTriangle } from 'lucide-react';
import { IncidentContext } from './AIIncidentContent';

interface Props {
  onAnalyze: (ctx: IncidentContext) => void;
  isAnalyzing: boolean;
}

interface FormFields {
  description: string;
  device: string;
  timeWindow: string;
  severity: string;
}

const recentIncidents = [
  { id: 'ri-001', label: 'SW-CORE-01 trap storm + Gi0/1 utilization spike', device: 'SW-CORE-01', time: '2m ago' },
  { id: 'ri-002', label: 'RTR-EDGE-03 unreachable — BGP sessions dropped', device: 'RTR-EDGE-03', time: '7m ago' },
  { id: 'ri-003', label: 'TenGigabitEthernet1/0/2 CRC errors escalating', device: 'SW-CORE-01', time: '18m ago' },
];

export default function IncidentInputPanel({ onAnalyze, isAnalyzing }: Props) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormFields>({
    defaultValues: {
      timeWindow: '1h',
      severity: 'major',
    },
  });

  const description = watch('description', '');

  const loadRecent = (ri: typeof recentIncidents[0]) => {
    setValue('description', ri.label);
    setValue('device', ri.device);
  };

  const onSubmit = (data: FormFields) => {
    onAnalyze(data);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <AlertTriangle size={16} className="text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Incident Description</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Describe the incident in plain language
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Include symptoms you observe — interface flaps, high utilization, packet drops, slow application response, etc.
          </p>
          <textarea
            {...register('description', { required: 'Incident description is required', minLength: { value: 20, message: 'Provide at least 20 characters for accurate correlation' } })}
            rows={5}
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
            placeholder="e.g. Users on Floor-2 are reporting intermittent connectivity drops every 3–5 minutes. The issue started around 19:30 UTC..."
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-danger flex items-center gap-1"><AlertCircle size={12} />{errors.description.message}</p>
            ) : (
              <span className="text-xs text-muted-foreground">{description.length} characters</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Server size={12} className="inline mr-1" />
              Affected Device
            </label>
            <select
              {...register('device', { required: 'Select an affected device' })}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="">Select...</option>
              <option value="SW-CORE-01">SW-CORE-01</option>
              <option value="RTR-EDGE-03">RTR-EDGE-03</option>
              <option value="FW-DC-02">FW-DC-02</option>
              <option value="SW-DIST-02">SW-DIST-02</option>
              <option value="SW-ACC-07">SW-ACC-07</option>
              <option value="RTR-WAN-01">RTR-WAN-01</option>
              <option value="All Devices">All Devices</option>
            </select>
            {errors.device && <p className="mt-1 text-xs text-danger flex items-center gap-1"><AlertCircle size={12} />{errors.device.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Clock size={12} className="inline mr-1" />
              Time Window
            </label>
            <select
              {...register('timeWindow')}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="4h">Last 4 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <AlertTriangle size={12} className="inline mr-1" />
              Severity
            </label>
            <select
              {...register('severity')}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              <option value="critical">Critical — Service Down</option>
              <option value="major">Major — Significant Impact</option>
              <option value="minor">Minor — Degraded Performance</option>
              <option value="informational">Informational</option>
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Recent Active Incidents</p>
          <div className="space-y-2">
            {recentIncidents.map((ri) => (
              <button
                key={ri.id}
                type="button"
                onClick={() => loadRecent(ri)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{ri.label}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{ri.device} · {ri.time}</p>
                </div>
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-3 flex-shrink-0">
                  Load →
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Correlating metrics & generating diagnosis...
            </>
          ) : (
            <>
              <BrainCircuit size={16} />
              Analyze Incident with AI
            </>
          )}
        </button>
      </form>
    </div>
  );
}
