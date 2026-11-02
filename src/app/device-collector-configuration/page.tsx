import React from 'react';
import AppLayout from '@/components/AppLayout';
import DeviceConfigContent from './components/DeviceConfigContent';

export default function DeviceCollectorConfigurationPage() {
  return (
    <AppLayout currentPath="/device-collector-configuration">
      <DeviceConfigContent />
    </AppLayout>
  );
}