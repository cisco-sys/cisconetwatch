'use client';
import React, { useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Search, Shield, User } from 'lucide-react';
import { CurrentUserBadge, useCurrentUser } from '@/lib/auth/useCurrentUser';
import { getSupabaseBrowserClient, syncAuthCookie } from '@/lib/supabase/client';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user } = useCurrentUser();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    syncAuthCookie(null);
    window.location.href = '/sign-up-login';
  }

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
            <CurrentUserBadge />
            <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 fade-in py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-foreground">{user?.fullName ?? '—'}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{user?.email ?? ''}</p>
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
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
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
