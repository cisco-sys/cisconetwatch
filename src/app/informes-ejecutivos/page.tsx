import React from 'react';
import AppLayout from '@/components/AppLayout';
import InformesContent from './components/InformesContent';

export default function InformesPage() {
  return (
    <AppLayout currentPath="/informes-ejecutivos">
      <InformesContent />
    </AppLayout>
  );
}
