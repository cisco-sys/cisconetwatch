import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Promote discovery_hosts to devices inventory (status unknown until metrics). */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fail(503, 'Service role no configurado.');

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return fail(401, 'Sesion requerida.');

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller.user) return fail(401, 'Sesion no valida.');

  const { data: profile } = await admin
    .from('profiles')
    .select('role,is_active,org_id,is_platform_admin')
    .eq('id', caller.user.id)
    .maybeSingle();

  const can =
    profile?.is_active &&
    (profile.is_platform_admin ||
      ['admin', 'noc_operator', 'network_engineer'].includes(profile.role));
  if (!can) return fail(403, 'Sin permiso.');

  let body: { hostIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'JSON invalido.');
  }

  const hostIds = body.hostIds ?? [];
  if (!hostIds.length) return fail(400, 'hostIds vacio.');

  const { data: hosts } = await admin.from('discovery_hosts').select('*').in('id', hostIds);
  if (!hosts?.length) return fail(404, 'Hosts no encontrados.');

  const created: string[] = [];
  for (const h of hosts) {
    if (h.promoted_device_id) {
      created.push(h.promoted_device_id);
      continue;
    }
    const name = h.hostname || h.snmp_sysname || `host-${String(h.ip).replace(/\./g, '-')}`;
    const { data: device, error } = await admin
      .from('devices')
      .upsert(
        {
          name,
          ip: h.ip,
          status: 'unknown',
          protocol: 'ICMP',
          vendor: 'cisco',
          org_id: h.org_id,
          model: h.vendor_hint ?? (h.snmp_sysdescr ? String(h.snmp_sysdescr).slice(0, 80) : null),
          created_by: caller.user.id,
        },
        { onConflict: 'ip' },
      )
      .select('id')
      .single();

    if (!error && device) {
      await admin.from('discovery_hosts').update({ promoted_device_id: device.id }).eq('id', h.id);
      created.push(device.id);
    }
  }

  return NextResponse.json({ promoted: created.length, deviceIds: created });
}
