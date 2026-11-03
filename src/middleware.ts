import { NextResponse, type NextRequest } from 'next/server';

/**
 * Lightweight gate: when Supabase is configured, protect app routes.
 * Login path stays public. Claude can tighten with @supabase/ssr later.
 */
const PUBLIC_PATHS = ['/sign-up-login', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configured =
    supabaseUrl &&
    !supabaseUrl.includes('dummy') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy');

  // Without real Supabase keys, allow demo UI (mock data)
  if (!configured) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.getAll().some(
      (c) =>
        c.name.includes('sb-') &&
        (c.name.includes('auth-token') || c.name.includes('access-token'))
    );

  if (!hasSession && pathname !== '/sign-up-login') {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-up-login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
