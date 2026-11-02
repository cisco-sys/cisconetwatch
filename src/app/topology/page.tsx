import React from 'react';
import AppLayout from '@/components/AppLayout';
import TopologyContent from './components/TopologyContent';

export default function TopologyPage() {
  return (
    <AppLayout currentPath="/topology">
      <TopologyContent />
    </AppLayout>
  );
}
