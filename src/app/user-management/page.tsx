import React from 'react';
import AppLayout from '@/components/AppLayout';
import UserManagementContent from './components/UserManagementContent';

export default function UserManagementPage() {
  return (
    <AppLayout currentPath="/user-management">
      <UserManagementContent />
    </AppLayout>
  );
}