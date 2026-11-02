import React from 'react';
import AppLayout from '@/components/AppLayout';
import UsuariosRolesContent from './components/UsuariosRolesContent';

export default function UsuariosRolesPage() {
  return (
    <AppLayout currentPath="/usuarios-roles">
      <UsuariosRolesContent />
    </AppLayout>
  );
}
