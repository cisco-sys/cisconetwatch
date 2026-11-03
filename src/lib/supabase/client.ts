import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cookie name readable by middleware (must include "sb-" and "access-token"). */
const AUTH_COOKIE = 'sb-access-token';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    url &&
      anonKey &&
      !url.includes('dummy') &&
      !anonKey.includes('dummy')
  );
}

let browserClient: SupabaseClient<Database> | null = null;

/** Browser / client-component Supabase client (anon key + RLS). */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured() || !url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

/**
 * Sync the current session into a cookie so Next.js middleware can gate routes.
 * Supabase browser client stores the session in localStorage by default; middleware
 * only sees cookies, so we mirror the access token here after login / restore.
 */
export function syncAuthCookie(session: Session | null): void {
  if (typeof document === 'undefined') return;
  if (session?.access_token) {
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(session.access_token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/** Server-side client (same anon key; respect RLS via user JWT when passed). */
export function createSupabaseServerClient(accessToken?: string): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured() || !url || !anonKey) return null;
  return createClient<Database>(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
