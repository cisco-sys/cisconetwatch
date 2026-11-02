import React from 'react';
import AppLayout from '@/components/AppLayout';
import DeviceDetailContent from './components/DeviceDetailContent';

export default function InterfaceDeviceDetailPage() {
  return (
    <AppLayout currentPath="/interface-device-detail">
      <DeviceDetailContent />
    </AppLayout>
  );
}