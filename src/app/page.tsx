import React from 'react';
import AppLayout from '@/components/AppLayout';
import MetricsBentoGrid from './components/MetricsBentoGrid';
import BandwidthTrendChart from './components/BandwidthTrendChart';
import InterfaceUtilizationChart from './components/InterfaceUtilizationChart';
import DeviceTopologyGrid from './components/DeviceTopologyGrid';
import EventsFeed from './components/EventsFeed';
import CollectorStatusRow from './components/CollectorStatusRow';

export default function NetworkMonitoringDashboard() {
  return (
    <AppLayout currentPath="/">
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Network Operations Center</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monitoring 200 devices · 1,080 ports · 8 vendors · 10 sites — last polled 12s ago
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-success live-pulse flex-shrink-0" />
            <span className="text-xs font-mono text-success">ALL COLLECTORS ACTIVE</span>
          </div>
        </div>

        {/* KPI Bento Grid */}
        <MetricsBentoGrid />

        {/* Collector protocol status */}
        <CollectorStatusRow />

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <BandwidthTrendChart />
          </div>
          <div className="lg:col-span-1">
            <InterfaceUtilizationChart />
          </div>
        </div>

        {/* Devices + Events */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <DeviceTopologyGrid />
          </div>
          <div className="xl:col-span-1">
            <EventsFeed />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
