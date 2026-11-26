import { NextResponse } from 'next/server';
import { adminClient, assertCollectorKey, assertOrgExists } from '@/lib/server/collector-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Zabbix-proxy style: LAN collector registers / heartbeats into `collectors`.
 * Auth: X-Collector-Key (constant-time) == COLLECTOR_API_KEY
 * orgId in body must exist in public.organizations.
 */
function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!assertCollectorKey(req)) return fail(401, 'X-Collector-Key invalida.');

  const admin = adminClient();
  if (!admin) return fail(503, 'Service role no configurado.');

  let body: {
    name?: string;
    host?: string;
    protocol?: string;
    orgId?: string;
    version?: string;
    devicesCount?: number;
    successRate?: number;
    avgPollMs?: number;
    errors24h?: number;
    status?: 'active' | 'degraded' | 'down';
  };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'JSON invalido.');
  }

  const name = (body.name ?? '').trim() || 'LAN Collector';
  const host = (body.host ?? '').trim();
  const orgId = body.orgId;
  if (!host) return fail(400, 'host requerido.');
  if (!orgId) return fail(400, 'orgId requerido.');
  if (!(await assertOrgExists(admin, orgId))) {
    return fail(403, 'orgId no corresponde a una organizacion valida.');
  }

  const protocol = body.protocol ?? 'ICMP';
  const status = body.status ?? 'active';

  const { data: existing } = await admin
    .from('collectors')
    .select('id')
    .eq('org_id', orgId)
    .eq('name', name)
    .eq('host', host)
    .maybeSingle();

  const row = {
    name,
    host,
    protocol,
    org_id: orgId,
    version: body.version ?? 'cnw-collector/1.0',
    devices_count: body.devicesCount ?? 0,
    success_rate: body.successRate ?? 100,
    avg_poll_ms: body.avgPollMs ?? 0,
    errors_24h: body.errors24h ?? 0,
    status,
    last_heartbeat_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await admin
      .from('collectors')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) return fail(500, 'No se pudo actualizar collector.');
    return NextResponse.json({ collector: data, created: false });
  }

  const { data, error } = await admin.from('collectors').insert(row).select('*').single();
  if (error) return fail(500, 'No se pudo registrar collector.');
  return NextResponse.json({ collector: data, created: true }, { status: 201 });
}
