import React from 'react';
import AppLayout from '@/components/AppLayout';
import DiscoverContent from './components/DiscoverContent';

export default function DiscoverPage() {
  return (
    <AppLayout currentPath="/discover">
      <DiscoverContent />
    </AppLayout>
  );
}
