import { NextResponse } from 'next/server';
import { adminClient, assertCollectorKey, assertOrgExists } from '@/lib/server/collector-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Poll results from LAN collector.
 * Auth: X-Collector-Key (constant-time)
 * Body: { orgId, results: [{ ip, isUp, rttMs? }] }
 * orgId must exist; device updates scoped to that org_id.
 */
function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!assertCollectorKey(req)) return fail(401, 'X-Collector-Key invalida.');

  const admin = adminClient();
  if (!admin) return fail(503, 'Service role no configurado.');

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
  if (!(await assertOrgExists(admin, orgId))) {
    return fail(403, 'orgId no corresponde a una organizacion valida.');
  }
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
