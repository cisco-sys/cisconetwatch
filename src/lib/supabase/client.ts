import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
