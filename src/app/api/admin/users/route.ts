import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'noc_operator', 'network_engineer', 'it_management', 'read_only'] as const;
type Role = (typeof ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Crea un usuario con rol. Solo lo puede usar un administrador activo.
 * Requiere en el servidor (Vercel): NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 * La clave de servicio NUNCA debe tener el prefijo NEXT_PUBLIC_.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey.includes('dummy')) {
    return fail(503, 'Service role no configurado en el servidor.');
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return fail(401, 'Sesión no válida.');

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Quién llama y si es administrador activo
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return fail(401, 'Sesión no válida.');

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role,is_active')
    .eq('id', caller.user.id)
    .maybeSingle();

  if (callerProfile?.role !== 'admin' || callerProfile.is_active !== true) {
    return fail(403, 'Solo un administrador puede crear usuarios.');
  }

  // 2) Validar el cuerpo
  let body: { email?: string; fullName?: string; role?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Solicitud no válida.');
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const fullName = (body.fullName ?? '').trim();
  const role = body.role as Role;
  const password = body.password ?? '';

  if (!EMAIL_RE.test(email)) return fail(400, 'Correo no válido.');
  if (fullName.length < 2 || fullName.length > 120) return fail(400, 'Nombre no válido.');
  if (!ROLES.includes(role)) return fail(400, 'Rol no válido.');
  if (password.length < 12 || password.length > 72) return fail(400, 'La contraseña debe tener entre 12 y 72 caracteres.');

  // 3) Crear en Supabase Auth (el trigger handle_new_user crea el perfil como read_only)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const msg = createError?.message?.toLowerCase() ?? '';
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return fail(409, 'Ya existe un usuario con ese correo.');
    }
    return fail(500, 'No se pudo crear el usuario.');
  }

  // 4) Asignar rol y nombre (la clave de servicio no tiene auth.uid(), el guard lo permite)
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role, full_name: fullName, is_active: true })
    .eq('id', created.user.id);

  if (profileError) {
    // Deshacer para no dejar un usuario con rol equivocado
    await admin.auth.admin.deleteUser(created.user.id);
    return fail(500, 'No se pudo asignar el rol. No se creó el usuario.');
  }

  return NextResponse.json({ id: created.user.id, email, role }, { status: 201 });
}
