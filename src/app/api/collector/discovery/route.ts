import { NextResponse } from 'next/server';
import { adminClient, assertCollectorKey, assertOrgExists } from '@/lib/server/collector-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

async function authorize(req: Request) {
  if (assertCollectorKey(req)) {
    return { mode: 'collector' as const, userId: null as string | null, orgId: null as string | null };
  }

  const admin = adminClient();
  if (!admin) return null;

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const { data } = await admin.auth.getUser(token);
  if (!data.user) return null;

  const { data: profile } = await admin
    .from('profiles')
    .select('id,role,is_active,org_id,is_platform_admin')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile?.is_active) return null;
  const ok =
    profile.is_platform_admin === true ||
    ['admin', 'noc_operator', 'network_engineer'].includes(profile.role);
  if (!ok) return null;

  return {
    mode: 'user' as const,
    userId: profile.id as string,
    orgId: (profile.org_id as string | null) ?? null,
  };
}

export async function GET(req: Request) {
  const auth = await authorize(req);
  if (!auth) return fail(401, 'No autorizado.');

  const admin = adminClient();
  if (!admin) return fail(503, 'Service role no configurado.');

  const url = new URL(req.url);
  const scanId = url.searchParams.get('scanId');
  const pending = url.searchParams.get('pending') === '1';

  if (scanId) {
    const { data: scan } = await admin.from('discovery_scans').select('*').eq('id', scanId).maybeSingle();
    if (!scan) return fail(404, 'Scan no encontrado.');
    const { data: hosts } = await admin
      .from('discovery_hosts')
      .select('*')
      .eq('scan_id', scanId)
      .order('ip');
    return NextResponse.json({ scan, hosts: hosts ?? [] });
  }

  // Collector pulls queued wizard jobs
  if (pending && auth.mode === 'collector') {
    const { data, error } = await admin
      .from('discovery_scans')
      .select('*')
      .eq('status', 'pending')
      .order('started_at', { ascending: true })
      .limit(5);
    if (error) return fail(500, 'No se pudieron listar pending.');
    return NextResponse.json({ scans: data ?? [] });
  }

  let q = admin.from('discovery_scans').select('*').order('started_at', { ascending: false }).limit(30);
  if (auth.mode === 'user' && auth.orgId) {
    q = q.eq('org_id', auth.orgId);
  }
  const { data, error } = await q;
  if (error) return fail(500, 'No se pudieron listar scans.');
  return NextResponse.json({ scans: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await authorize(req);
  if (!auth) return fail(401, 'No autorizado. Usa X-Collector-Key o sesion admin/ops.');

  const admin = adminClient();
  if (!admin) return fail(503, 'Service role no configurado.');

  let body: {
    action?: string;
    scanId?: string;
    orgId?: string;
    cidr?: string;
    name?: string;
    description?: string | null;
    gatewayIp?: string | null;
    config?: Record<string, unknown>;
    collectorId?: string;
    hosts?: Array<{
      ip: string;
      hostname?: string;
      isUp?: boolean;
      rttMs?: number;
      mac?: string;
      vendorHint?: string;
      openPorts?: number[];
      snmpSysname?: string;
      snmpSysdescr?: string;
    }>;
    errorMessage?: string;
  };

  try {
    body = await req.json();
  } catch {
    return fail(400, 'JSON invalido.');
  }

  const action = body.action ?? 'hosts';

  // WUG wizard: queue job for LAN collector (status=pending)
  if (action === 'queue') {
    if (auth.mode !== 'user') return fail(403, 'Solo usuarios ops pueden encolar desde la UI.');
    const cidr = (body.cidr ?? '').trim();
    if (!cidr) return fail(400, 'cidr requerido.');
    const orgId = body.orgId ?? auth.orgId;
    if (!orgId) return fail(400, 'orgId requerido.');
    if (!(await assertOrgExists(admin, orgId))) {
      return fail(403, 'orgId no corresponde a una organizacion valida.');
    }

    const insert: Record<string, unknown> = {
      org_id: orgId,
      name: body.name ?? `Discovery ${cidr}`,
      cidr,
      status: 'pending',
      created_by: auth.userId,
      config: body.config ?? {},
    };
    if (body.description != null) insert.description = body.description;
    if (body.gatewayIp) insert.gateway_ip = body.gatewayIp;

    const { data, error } = await admin.from('discovery_scans').insert(insert).select('*').single();
    if (error || !data) {
      return fail(500, error?.message || 'No se pudo encolar el scan.');
    }
    return NextResponse.json({ scan: data }, { status: 201 });
  }

  // Collector claims a pending scan → running
  if (action === 'claim') {
    if (auth.mode !== 'collector') return fail(403, 'Solo colector.');
    if (!body.scanId) return fail(400, 'scanId requerido.');
    const { data, error } = await admin
      .from('discovery_scans')
      .update({
        status: 'running',
        collector_id: body.collectorId ?? 'lan-collector',
        started_at: new Date().toISOString(),
      })
      .eq('id', body.scanId)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (error) return fail(500, 'No se pudo claim.');
    if (!data) return fail(409, 'Scan no esta pending o no existe.');
    return NextResponse.json({ scan: data });
  }

  if (action === 'start') {
    const cidr = (body.cidr ?? '').trim();
    if (!cidr) return fail(400, 'cidr requerido (ej. 192.168.10.0/24).');
    const orgId = body.orgId ?? auth.orgId;
    if (!orgId) return fail(400, 'orgId requerido.');
    if (!(await assertOrgExists(admin, orgId))) {
      return fail(403, 'orgId no corresponde a una organizacion valida.');
    }

    const { data, error } = await admin
      .from('discovery_scans')
      .insert({
        org_id: orgId,
        name: body.name ?? `Scan ${cidr}`,
        cidr,
        status: 'running',
        collector_id: body.collectorId ?? 'lan-collector',
        created_by: auth.userId,
      })
      .select('*')
      .single();

    if (error || !data) return fail(500, 'No se pudo crear el scan.');
    return NextResponse.json({ scan: data }, { status: 201 });
  }

  if (!body.scanId) return fail(400, 'scanId requerido.');

  if (action === 'hosts') {
    const hosts = body.hosts ?? [];
    if (!hosts.length) return NextResponse.json({ upserted: 0 });

    const { data: scan } = await admin.from('discovery_scans').select('id,org_id').eq('id', body.scanId).maybeSingle();
    if (!scan) return fail(404, 'Scan no encontrado.');

    const rows = hosts.map((h) => ({
      scan_id: body.scanId,
      org_id: scan.org_id,
      ip: h.ip,
      hostname: h.hostname ?? null,
      is_up: h.isUp !== false,
      rtt_ms: h.rttMs ?? null,
      mac: h.mac ?? null,
      vendor_hint: h.vendorHint ?? null,
      open_ports: h.openPorts ?? [],
      snmp_sysname: h.snmpSysname ?? null,
      snmp_sysdescr: h.snmpSysdescr ?? null,
      last_seen_at: new Date().toISOString(),
    }));

    const { error } = await admin.from('discovery_hosts').upsert(rows, { onConflict: 'scan_id,ip' });
    if (error) return fail(500, 'No se pudieron guardar hosts.');

    const { count: found } = await admin
      .from('discovery_hosts')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', body.scanId);
    const { count: up } = await admin
      .from('discovery_hosts')
      .select('id', { count: 'exact', head: true })
      .eq('scan_id', body.scanId)
      .eq('is_up', true);

    await admin
      .from('discovery_scans')
      .update({ hosts_found: found ?? 0, hosts_up: up ?? 0 })
      .eq('id', body.scanId);

    return NextResponse.json({ upserted: rows.length, hostsFound: found, hostsUp: up });
  }

  if (action === 'complete' || action === 'fail') {
    const { error } = await admin
      .from('discovery_scans')
      .update({
        status: action === 'complete' ? 'completed' : 'failed',
        finished_at: new Date().toISOString(),
        error_message: action === 'fail' ? body.errorMessage ?? 'failed' : null,
      })
      .eq('id', body.scanId);
    if (error) return fail(500, 'No se pudo actualizar el scan.');
    return NextResponse.json({ ok: true });
  }

  return fail(400, 'action invalida.');
}
