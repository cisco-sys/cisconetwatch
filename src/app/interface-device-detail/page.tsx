import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DeviceDetailContent from './components/DeviceDetailContent';

export default function InterfaceDeviceDetailPage() {
  return (
    <AppLayout currentPath="/interface-device-detail">
      <Suspense
        fallback={
          <div className="bg-card border border-border rounded-xl p-10 text-sm text-muted-foreground text-center">
            Loading device…
          </div>
        }
      >
        <DeviceDetailContent />
      </Suspense>
    </AppLayout>
  );
}
