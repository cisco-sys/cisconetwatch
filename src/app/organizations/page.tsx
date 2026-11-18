import React from 'react';
import AppLayout from '@/components/AppLayout';
import OrganizationsContent from './components/OrganizationsContent';

export default function OrganizationsPage() {
  return (
    <AppLayout currentPath="/organizations">
      <OrganizationsContent />
    </AppLayout>
  );
}
