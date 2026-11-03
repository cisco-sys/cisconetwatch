'use client';
import React from 'react';
import Badge from '@/components/ui/Badge';
import { Shield } from 'lucide-react';

const roles = [
  { id: 'r1', name: 'Admin', users: 1, perms: ['Full access', 'User management', 'Device config', 'Alerts'], color: 'danger' as const },
  { id: 'r2', name: 'NOC Operator', users: 3, perms: ['Dashboard', 'Alerts', 'Topology', 'Device detail'], color: 'primary' as const },
  { id: 'r3', name: 'Network Engineer', users: 5, perms: ['Dashboard', 'SNMP config', 'Device config', 'Reports'], color: 'warning' as const },
  { id: 'r4', name: 'IT Management', users: 2, perms: ['Dashboard', 'Reports', 'Alerts (read)'], color: 'success' as const },
  { id: 'r5', name: 'Read-Only', users: 4, perms: ['Dashboard (view)', 'Topology (view)'], color: 'info' as const },
];

export default function UsuariosRolesContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Role-based access control for the NOC portal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
              <Badge variant={role.color}>{role.users} users</Badge>
            </div>
            <ul className="space-y-1.5">
              {role.perms.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
