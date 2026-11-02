'use client';
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export default function AppLayout({ children, currentPath = '/' }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        currentPath={currentPath}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuToggle={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6">
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
