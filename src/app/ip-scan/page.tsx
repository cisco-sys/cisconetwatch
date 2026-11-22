import React from 'react';
import AppLayout from '@/components/AppLayout';
import IpScanContent from './components/IpScanContent';

export const metadata = { title: 'IP Scan | CiscoNetWatch' };

export default function IpScanPage() {
  return (
    <AppLayout currentPath="/ip-scan">
      <IpScanContent />
    </AppLayout>
  );
}
