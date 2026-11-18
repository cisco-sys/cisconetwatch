import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || `org-${Date.now()}`;
}

/**
 * POST: create organization + company admin (platform admin only).
 * GET: list organizations (platform: all; others: own org).
 */
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fail(503, 'Service role no configurado.');

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return fail(401, 'Sesión no válida.');

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller.user) return fail(401, 'Sesión no válida.');

  const { data: profile } = await admin
    .from('profiles')
    .select('role,is_active,is_platform_admin,org_id')
    .eq('id', caller.user.id)
    .maybeSingle();

  if (!profile?.is_active) return fail(403, 'Cuenta inactiva.');

  if (profile.is_platform_admin) {
    const { data, error } = await admin
      .from('organizations')
      .select('id,name,slug,created_at')
      .order('name');
    if (error) return fail(500, 'No se pudieron listar empresas.');

    const orgs = data ?? [];
    const withCounts = await Promise.all(
      orgs.map(async (o) => {
        const { count } = await admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', o.id);
        return { ...o, members: count ?? 0 };
      }),
    );
    return NextResponse.json({ organizations: withCounts });
  }

  if (!profile.org_id) return NextResponse.json({ organizations: [] });

  const { data: one } = await admin
    .from('organizations')
    .select('id,name,slug,created_at')
    .eq('id', profile.org_id)
    .maybeSingle();

  return NextResponse.json({
    organizations: one ? [{ ...one, members: 1 }] : [],
  });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return fail(503, 'Service role no configurado.');

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return fail(401, 'Sesión no válida.');

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller.user) return fail(401, 'Sesión no válida.');

  const { data: profile } = await admin
    .from('profiles')
    .select('is_active,is_platform_admin')
    .eq('id', caller.user.id)
    .maybeSingle();

  if (!profile?.is_active || !profile.is_platform_admin) {
    return fail(403, 'Solo un super-admin de plataforma puede crear empresas.');
  }

  let body: {
    name?: string;
    slug?: string;
    adminEmail?: string;
    adminFullName?: string;
    adminPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Solicitud no válida.');
  }

  const name = (body.name ?? '').trim();
  const adminEmail = (body.adminEmail ?? '').trim().toLowerCase();
  const adminFullName = (body.adminFullName ?? '').trim();
  const adminPassword = body.adminPassword ?? '';
  let slug = (body.slug ?? '').trim().toLowerCase() || slugify(name);

  if (name.length < 2 || name.length > 120) return fail(400, 'Nombre de empresa no válido.');
  if (!EMAIL_RE.test(adminEmail)) return fail(400, 'Correo del admin no válido.');
  if (adminFullName.length < 2) return fail(400, 'Nombre del admin no válido.');
  if (adminPassword.length < 12 || adminPassword.length > 72) {
    return fail(400, 'La contraseña del admin debe tener entre 12 y 72 caracteres.');
  }

  // Unique slug
  const { data: existingSlug } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle();
  if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name, slug })
    .select('id,name,slug,created_at')
    .single();

  if (orgError || !org) {
    return fail(500, 'No se pudo crear la empresa.');
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminFullName, org_id: org.id },
  });

  if (createError || !created.user) {
    await admin.from('organizations').delete().eq('id', org.id);
    const msg = createError?.message?.toLowerCase() ?? '';
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return fail(409, 'Ya existe un usuario con ese correo.');
    }
    return fail(500, 'No se pudo crear el admin de la empresa.');
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      role: 'admin',
      full_name: adminFullName,
      is_active: true,
      org_id: org.id,
      is_platform_admin: false,
    })
    .eq('id', created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from('organizations').delete().eq('id', org.id);
    return fail(500, 'No se pudo asignar el perfil del admin de empresa.');
  }

  return NextResponse.json(
    {
      organization: org,
      admin: { id: created.user.id, email: adminEmail, role: 'admin' },
      adminPasswordOnce: adminPassword,
    },
    { status: 201 },
  );
}
