import React from 'react';
import AppLayout from '@/components/AppLayout';
import RecolectorContent from './components/RecolectorContent';

export default function RecolectorPage() {
  return (
    <AppLayout currentPath="/recolector-protocolos">
      <RecolectorContent />
    </AppLayout>
  );
}
