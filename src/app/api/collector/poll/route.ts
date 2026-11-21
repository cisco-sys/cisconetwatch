import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Zabbix-style poll results: LAN collector reports reachability for inventory devices.
 * Auth: X-Collector-Key
 * Body: { orgId, results: [{ ip, isUp, rttMs? }] }
 */
function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function assertCollectorKey(req: Request): boolean {
  const expected = process.env.COLLECTOR_API_KEY;
  const got = req.headers.get('x-collector-key') ?? '';
  return Boolean(expected && got && got === expected);
}

export async function POST(req: Request) {
  if (!assertCollectorKey(req)) return fail(401, 'X-Collector-Key invalida.');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fail(503, 'Service role no configurado.');

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: {
    orgId?: string;
    results?: Array<{ ip: string; isUp?: boolean; rttMs?: number }>;
  };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'JSON invalido.');
  }

  const orgId = body.orgId;
  const results = body.results ?? [];
  if (!orgId) return fail(400, 'orgId requerido.');
  if (!results.length) return NextResponse.json({ updated: 0 });

  let updated = 0;
  const now = new Date().toISOString();

  for (const r of results) {
    if (!r.ip) continue;
    const status = r.isUp ? 'up' : 'down';
    const { data, error } = await admin
      .from('devices')
      .update({ status, last_poll_at: now, updated_at: now })
      .eq('org_id', orgId)
      .eq('ip', r.ip)
      .select('id');

    if (!error && data?.length) updated += data.length;
  }

  return NextResponse.json({ updated });
}
