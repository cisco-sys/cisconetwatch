'use client';
import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ROLE_LABEL, T, type AppRole } from '@/lib/i18n/es';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  isActive: boolean;
  orgId: string | null;
  isPlatformAdmin: boolean;
}

interface State {
  user: CurrentUser | null;
  loading: boolean;
}

/** Usuario real de la sesión de Supabase + su perfil (nombre, rol, org). */
export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ user: null, loading: true });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState({ user: null, loading: false });
      return;
    }

    let cancelled = false;

    async function load(userId: string | null, email: string | null) {
      if (!userId) {
        if (!cancelled) setState({ user: null, loading: false });
        return;
      }
      const { data } = await supabase!
        .from('profiles')
        .select('id,email,full_name,role,is_active,org_id,is_platform_admin')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;
      const profileEmail = data?.email ?? email ?? '';
      setState({
        loading: false,
        user: {
          id: userId,
          email: profileEmail,
          fullName: data?.full_name || profileEmail.split('@')[0] || '',
          role: (data?.role ?? 'read_only') as AppRole,
          isActive: data?.is_active ?? true,
          orgId: (data as { org_id?: string | null })?.org_id ?? null,
          isPlatformAdmin: Boolean((data as { is_platform_admin?: boolean })?.is_platform_admin),
        },
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      load(data.session?.user.id ?? null, data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user.id ?? null, session?.user.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CurrentUserBadge() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" aria-label={T.session.signingIn} />;
  }

  if (!user) {
    return <span className="text-sm text-muted-foreground">{T.session.guest}</span>;
  }

  const roleLabel = user.isPlatformAdmin ? 'Super Admin' : ROLE_LABEL[user.role];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary"
        aria-hidden="true"
      >
        {initials(user.fullName || user.email)}
      </div>
      <div className="min-w-0 text-left leading-tight hidden md:block">
        <p className="truncate text-sm font-semibold text-foreground">{user.fullName || user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
      </div>
    </div>
  );
}
