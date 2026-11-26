import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

/**
 * Shared collector auth for /api/collector/* routes.
 * - Key check uses crypto.timingSafeEqual (constant-time).
 * - org_id from the body is validated against public.organizations when provided.
 * Note: COLLECTOR_API_KEY is still a single global secret (not per-org).
 * True per-org keys would need a dedicated migration + hashed storage.
 */

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Constant-time compare of X-Collector-Key vs COLLECTOR_API_KEY. */
export function assertCollectorKey(req: Request): boolean {
  const expected = process.env.COLLECTOR_API_KEY ?? '';
  const got = req.headers.get('x-collector-key') ?? '';
  if (!expected || !got) return false;
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(got, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Ensure orgId is a real organization row (blocks garbage / cross-tenant typos). */
export async function assertOrgExists(
  admin: SupabaseClient,
  orgId: string | null | undefined,
): Promise<boolean> {
  if (!orgId || typeof orgId !== 'string') return false;
  const { data, error } = await admin
    .from('organizations')
    .select('id')
    .eq('id', orgId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}
