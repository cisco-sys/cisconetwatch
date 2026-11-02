import React from 'react';
import AppLayout from '@/components/AppLayout';
import AlertasContent from './components/AlertasContent';

export default function AlertasPage() {
  return (
    <AppLayout currentPath="/alertas">
      <AlertasContent />
    </AppLayout>
  );
}
