import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
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
        <DashboardHeader />
        <MetricsBentoGrid />
        <CollectorStatusRow />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <BandwidthTrendChart />
          </div>
          <div className="lg:col-span-1">
            <InterfaceUtilizationChart />
          </div>
        </div>
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
