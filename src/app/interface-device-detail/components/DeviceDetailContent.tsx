'use client';
import React, { useState } from 'react';
import Badge from '@/components/ui/Badge';
import ProtocolBadge from '@/components/ui/ProtocolBadge';
import VendorBadge from '@/components/ui/VendorBadge';
import InterfaceTable from './InterfaceTable';
import TrafficCharts from './TrafficCharts';
import SNMPOidPanel from './SNMPOidPanel';
import DeviceEventsFeed from './DeviceEventsFeed';
import RealtimeTrafficChart from './RealtimeTrafficChart';
import { Server, RefreshCw, Activity, Wifi } from 'lucide-react';

const device = {
  hostname: 'SW-CORE-01',
  ip: '10.0.0.1',
  model: 'Cisco Catalyst 9500-48Y4C',
  vendor: 'cisco' as const,
  osVersion: 'IOS-XE 17.9.3a',
  uptime: '47d 12h 34m',
  site: 'DC-Primary',
  status: 'degraded' as const,
  protocols: ['SNMP', 'NETCONF'] as const,
  cpu: 34,
  memory: 61,
  temperature: 42,
  lastPoll: '8s ago',
  interfaces: { up: 46, down: 2, total: 48 },
};

const tabs = [
  { id: 'tab-interfaces', label: 'Interfaces', badge: 48 },
  { id: 'tab-traffic', label: 'Traffic & Errors', badge: null },
  { id: 'tab-realtime', label: 'Live Flow', badge: null },
  { id: 'tab-snmp', label: 'SNMP OIDs', badge: null },
  { id: 'tab-events', label: 'Events', badge: 7 },
];

export default function DeviceDetailContent() {
  const [activeTab, setActiveTab] = useState('tab-interfaces');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

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
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{device.hostname}</h1>
                <Badge variant="warning" dot>Degraded</Badge>
                <VendorBadge vendor={device.vendor} />
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{device.ip} · {device.model}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {device.protocols.map((p) => (
                  <ProtocolBadge key={p} protocol={p} active />
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors self-start"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'CPU', value: `${device.cpu}%`, sub: '5-min avg', color: 'text-warning' },
            { label: 'Memory', value: `${device.memory}%`, sub: 'Used', color: 'text-foreground' },
            { label: 'Temp', value: `${device.temperature}°C`, sub: 'Chassis', color: 'text-success' },
            { label: 'Interfaces', value: `${device.interfaces.up}/${device.interfaces.total}`, sub: `${device.interfaces.down} down`, color: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/30 border border-border rounded-lg p-2.5 sm:p-3">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-border overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.id === 'tab-realtime' && <Activity size={13} />}
              {tab.id === 'tab-snmp' && <Wifi size={13} />}
              {tab.label}
              {tab.badge != null && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-mono ${
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="fade-in">
        {activeTab === 'tab-interfaces' && <InterfaceTable />}
        {activeTab === 'tab-traffic' && <TrafficCharts />}
        {activeTab === 'tab-realtime' && (
          <div className="space-y-4 sm:space-y-6">
            <RealtimeTrafficChart isGateway />
            <RealtimeTrafficChart />
          </div>
        )}
        {activeTab === 'tab-snmp' && <SNMPOidPanel />}
        {activeTab === 'tab-events' && <DeviceEventsFeed />}
      </div>
    </div>
  );
}
