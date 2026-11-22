'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import VendorBadge from '@/components/ui/VendorBadge';
import InterfaceTable from './InterfaceTable';
import TrafficCharts from './TrafficCharts';
import SNMPOidPanel from './SNMPOidPanel';
import SNMPConfigPanel from './SNMPConfigPanel';
import DeviceEventsFeed from './DeviceEventsFeed';
import PortConfigPanel from './PortConfigPanel';
import RealtimeTrafficChart from './RealtimeTrafficChart';
import { Server, RefreshCw, Activity, Wifi, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Device } from '@/lib/supabase/database.types';
import { STATUS_LABEL, PROTOCOL_LABEL } from '@/lib/i18n/es';

const statusBadge: Record<string, 'success' | 'warning' | 'danger' | 'muted'> = {
  up: 'success',
  degraded: 'warning',
  down: 'danger',
  unknown: 'muted',
};

const tabs = [
  { id: 'tab-interfaces', label: 'Interfaces' },
  { id: 'tab-traffic', label: 'Traffic & Errors' },
  { id: 'tab-realtime', label: 'Live Flow' },
  { id: 'tab-ports', label: 'Port Config' },
  { id: 'tab-snmp-config', label: 'SNMP Config' },
  { id: 'tab-snmp', label: 'SNMP OIDs' },
  { id: 'tab-events', label: 'Events' },
];

export default function DeviceDetailContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get('id');
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tab-interfaces');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !deviceId) {
      setDevice(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from('devices').select('*').eq('id', deviceId).maybeSingle();
    if (error || !data) setDevice(null);
    else setDevice(data as Device);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!deviceId) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-3">
        <Server size={28} className="mx-auto text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Select a device</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Open a device from the inventory on the dashboard. Detail pages load from Supabase — no demo host is hardcoded.
        </p>
        <Link href="/" className="inline-block text-sm text-primary">
          Go to dashboard →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Loading device…
      </div>
    );
  }

  if (!device) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center space-y-2">
        <Server size={28} className="mx-auto text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Device not found</p>
        <p className="text-xs text-muted-foreground">It may belong to another organization or was deleted.</p>
        <Link href="/" className="inline-block text-sm text-primary mt-2">
          Back to inventory
        </Link>
      </div>
    );
  }

  const statusLabel = STATUS_LABEL[device.status] ?? device.status;
  const badgeVariant = statusBadge[device.status] ?? 'muted';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Server size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{device.name}</h1>
                <Badge variant={badgeVariant} dot>
                  {statusLabel}
                </Badge>
                <VendorBadge vendor={device.vendor} />
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                {String(device.ip)}
                {device.model ? ` · ${device.model}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <ProtocolBadge protocol={device.protocol} active={device.status === 'up'} />
                <span className="text-xs text-muted-foreground font-mono">
                  {PROTOCOL_LABEL[device.protocol] ?? device.protocol}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors self-start"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            {
              label: 'CPU',
              value: device.cpu_pct != null ? `${device.cpu_pct}%` : '—',
              sub: 'Last poll',
              color: 'text-foreground',
            },
            {
              label: 'Memory',
              value: device.memory_pct != null ? `${device.memory_pct}%` : '—',
              sub: 'Used',
              color: 'text-foreground',
            },
            {
              label: 'Utilization',
              value: device.utilization_pct != null ? `${device.utilization_pct}%` : '—',
              sub: 'Interfaces avg',
              color: 'text-primary',
            },
            {
              label: 'Ports',
              value:
                device.ports_total != null
                  ? `${device.ports_up ?? 0}/${device.ports_total}`
                  : '—',
              sub: device.ports_down != null ? `${device.ports_down} down` : 'From inventory',
              color: 'text-primary',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/30 border border-border rounded-lg p-2.5 sm:p-3">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
        {device.last_poll_at && (
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Last collector poll: {new Date(device.last_poll_at).toLocaleString()}
          </p>
        )}
        {device.status === 'unknown' && (
          <p className="text-xs text-amber-200/90 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            Status is unverified until a LAN collector pings or polls this device. The browser cannot run ICMP.
          </p>
        )}
      </div>

      <div className="border-b border-border overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.id === 'tab-realtime' && <Activity size={13} />}
              {(tab.id === 'tab-snmp' || tab.id === 'tab-snmp-config') && <Wifi size={13} />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fade-in">
        {activeTab === 'tab-interfaces' && <InterfaceTable deviceId={device.id} />}
        {activeTab === 'tab-traffic' && <TrafficCharts />}
        {activeTab === 'tab-realtime' && (
          <div className="space-y-4 sm:space-y-6">
            <RealtimeTrafficChart isGateway />
            <RealtimeTrafficChart />
          </div>
        )}
        {activeTab === 'tab-ports' && <PortConfigPanel />}
        {activeTab === 'tab-snmp-config' && <SNMPConfigPanel />}
        {activeTab === 'tab-snmp' && <SNMPOidPanel />}
        {activeTab === 'tab-events' && <DeviceEventsFeed />}
      </div>
    </div>
  );
}
