'use client';
import React, { useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Search, Shield, User } from 'lucide-react';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border max-w-xs">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search devices, alerts..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success live-pulse" />
          <span className="text-xs font-mono text-success">LIVE</span>
        </div>

        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">JR</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-foreground leading-none">J. Rodriguez</p>
              <p className="text-xs text-muted-foreground mt-0.5">NOC Operator</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 fade-in py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-foreground">Juan Rodriguez</p>
                <p className="text-xs text-muted-foreground font-mono">j.rodriguez@netops.corp</p>
              </div>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <User size={14} />
                Profile Settings
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Shield size={14} />
                Security
              </button>
              <div className="border-t border-border mt-1 pt-1">
                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
