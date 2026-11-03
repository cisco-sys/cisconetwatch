'use client';
import React from 'react';
import Badge from '@/components/ui/Badge';
import { Users } from 'lucide-react';

const users = [
  { id: 'u1', name: 'Admin User', email: 'admin@cisconetwatch.corp', role: 'Admin', status: 'active', lastLogin: '2m ago' },
  { id: 'u2', name: 'NOC Operator', email: 'noc.operator@cisconetwatch.corp', role: 'NOC Operator', status: 'active', lastLogin: '15m ago' },
  { id: 'u3', name: 'Net Engineer', email: 'net.engineer@cisconetwatch.corp', role: 'Network Engineer', status: 'active', lastLogin: '1h ago' },
  { id: 'u4', name: 'IT Manager', email: 'it.mgmt@cisconetwatch.corp', role: 'IT Management', status: 'active', lastLogin: '3h ago' },
  { id: 'u5', name: 'Guest Analyst', email: 'guest@cisconetwatch.corp', role: 'Read-Only', status: 'inactive', lastLogin: '12d ago' },
];

export default function UserManagementContent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Users size={20} className="text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage portal accounts and access</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Name', 'Email', 'Role', 'Status', 'Last Login'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-xs">{u.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === 'active' ? 'success' : 'warning'} dot>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
