import { getSupabaseBrowserClient } from './client';
import type { AppRole, Profile } from './database.types';

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName ?? email.split('@')[0] } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function getSession() {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function getMyProfile(): Promise<Profile | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getMyRole(): Promise<AppRole | null> {
  const profile = await getMyProfile();
  return profile?.role ?? null;
}
