'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, Network, Users, Settings, BrainCircuit, ChevronLeft, ChevronRight, Activity, X, Bell, FileText, UserCog, Terminal, Workflow } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  group?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={18} />, group: 'Operations' },
  { label: 'Device Detail', href: '/interface-device-detail', icon: <Network size={18} />, badge: 3, group: 'Operations' },
  { label: 'Live Traffic', href: '/interface-device-detail', icon: <Activity size={18} />, group: 'Operations' },
  { label: 'Topology', href: '/topology', icon: <Workflow size={18} />, group: 'Operations' },
  { label: 'Alertas', href: '/alertas', icon: <Bell size={18} />, badge: 5, group: 'Operations' },
  { label: 'AI Incident Analysis', href: '/ai-incident-analysis', icon: <BrainCircuit size={18} />, badge: 2, group: 'Operations' },
  { label: 'Informes Ejecutivos', href: '/informes-ejecutivos', icon: <FileText size={18} />, group: 'Reports' },
  { label: 'Usuarios y Roles', href: '/usuarios-roles', icon: <UserCog size={18} />, group: 'Administration' },
  { label: 'User Management', href: '/user-management', icon: <Users size={18} />, group: 'Administration' },
  { label: 'Device Config', href: '/device-collector-configuration', icon: <Settings size={18} />, group: 'Administration' },
  { label: 'Recolector', href: '/recolector-protocolos', icon: <Terminal size={18} />, group: 'Administration' },
];

interface SidebarProps {
  currentPath: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ currentPath, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const groups = Array.from(new Set(navItems.map((n) => n.group)));

  const SidebarInner = ({ forMobile = false }: { forMobile?: boolean }) => (
    <aside
      className="relative flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out flex-shrink-0 h-full"
      style={{ width: forMobile ? 240 : (collapsed ? 64 : 240) }}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border h-16 overflow-hidden">
        <div className="flex-shrink-0">
          <AppLogo size={28} />
        </div>
        {(forMobile || !collapsed) && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground leading-tight whitespace-nowrap">CiscoNetWatch</p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">NOC Platform</p>
          </div>
        )}
        {forMobile && onMobileClose && (
          <button onClick={onMobileClose} className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {groups.map((group) => (
          <div key={group} className="mb-2">
            {(forMobile || !collapsed) && (
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
            )}
            {navItems.filter((n) => n.group === group).map((item) => {
              const active = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={forMobile ? onMobileClose : undefined}
                  className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  title={collapsed && !forMobile ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {(forMobile || !collapsed) && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="text-[10px] font-mono bg-accent/20 text-accent border border-accent/30 rounded-full px-1.5 py-0.5">{item.badge}</span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {!forMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="m-2 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex h-full">
        <SidebarInner />
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="absolute left-0 top-0 bottom-0 z-50">
            <SidebarInner forMobile />
          </div>
        </div>
      )}
    </>
  );
}
