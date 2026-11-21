'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Metrics {
  devices_total: number;
  devices_up: number;
  devices_down: number;
  devices_degraded: number;
  interfaces_total: number;
  collectors_active: number;
  collectors_total: number;
}

export default function DashboardHeader() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc('get_dashboard_metrics');
    if (data && typeof data === 'object') setM(data as Metrics);
    else setM(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = m?.devices_total ?? 0;
  const ports = m?.interfaces_total ?? 0;
  const colActive = m?.collectors_active ?? 0;
  const colTotal = m?.collectors_total ?? 0;

  const allOk = colTotal > 0 && colActive === colTotal;
  const none = colTotal === 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Network Operations Center</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {loading
            ? 'Loading inventory…'
            : total === 0
              ? 'No devices in inventory yet — add devices or run discovery from a LAN collector'
              : `${total} devices · ${ports} ports tracked · ${colActive}/${colTotal} collectors active`}
        </p>
      </div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border self-start sm:self-auto ${
          none
            ? 'bg-muted/30 border-border'
            : allOk
              ? 'bg-success/10 border-success/20'
              : 'bg-warning/10 border-warning/20'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            none ? 'bg-muted-foreground' : allOk ? 'bg-success live-pulse' : 'bg-warning'
          }`}
        />
        <span
          className={`text-xs font-mono ${
            none ? 'text-muted-foreground' : allOk ? 'text-success' : 'text-warning'
          }`}
        >
          {none ? 'NO COLLECTORS' : allOk ? 'COLLECTORS OK' : 'COLLECTORS DEGRADED'}
        </span>
      </div>
    </div>
  );
}
