'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';
import { getSupabaseBrowserClient, syncAuthCookie } from '@/lib/supabase/client';

interface LoginFields {
  email: string;
  password: string;
  remember: boolean;
}

/** Destino tras el login: solo rutas internas (evita redirecciones abiertas) */
function getRedirectTarget(): string {
  if (typeof window === 'undefined') return '/';
  const target = new URLSearchParams(window.location.search).get('redirect');
  if (target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/sign-up-login')) {
    return target;
  }
  return '/';
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'This account has not been confirmed yet. Contact your administrator.';
  if (m.includes('too many requests') || m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Cannot reach the authentication service. Check your connection.';
  return 'Could not sign in. Please try again.';
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
    setError,
  } = useForm<LoginFields>();

  // Si ya hay una sesión guardada (o renovable), se restaura sin volver a escribir la clave
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const last = Number(sessionStorage.getItem('cnw_auto_restore') ?? 0);
    if (Date.now() - last < 15000) return; // evita bucles de redirección
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      sessionStorage.setItem('cnw_auto_restore', String(Date.now()));
      syncAuthCookie(session);
      window.location.href = getRedirectTarget();
    });
  }, []);

  const onSubmit = async (data: LoginFields) => {
    setAuthError(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Authentication service is not configured. Contact your administrator.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error || !auth.user) {
        setAuthError(friendlyAuthError(error?.message ?? ''));
        return;
      }

      // La cuenta debe tener perfil activo
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', auth.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setAuthError('Your account has no profile assigned. Contact your administrator.');
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setAuthError('Your account is disabled. Contact your administrator.');
        return;
      }

      // Registrar último acceso (no bloquea el login si falla)
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', auth.user.id);

      // El middleware lee la sesión desde una cookie
      syncAuthCookie(auth.session);
      toast.success('Welcome back');
      window.location.href = getRedirectTarget();
    } catch {
      setAuthError('Unexpected error while signing in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = async () => {
    setAuthError(null);
    const email = getValues('email')?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', { message: 'Enter your email first, then press "Forgot password?"' });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Authentication service is not configured. Contact your administrator.');
      return;
    }
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/sign-up-login`,
      });
      if (error) {
        setAuthError(friendlyAuthError(error.message));
        return;
      }
      // Mensaje neutro: no revela si el correo existe
      toast.success('If that email is registered, a reset link has been sent.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-card border-r border-border flex-col items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`grid-h-${i}`} className="absolute w-full border-t border-primary" style={{ top: `${(i + 1) * 12.5}%` }} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`grid-v-${i}`} className="absolute h-full border-l border-primary" style={{ left: `${(i + 1) * 12.5}%` }} />
          ))}
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="flex items-center justify-center gap-3 mb-6">
            <AppLogo size={48} />
            <span className="text-2xl font-bold text-primary tracking-wide">CiscoNetWatch</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Real-Time Network Monitoring</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Monitor every interface, trap, and protocol across your entire infrastructure.
            SNMP · NETCONF · SSH · RESTCONF · Telemetry — unified in one NOC dashboard.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <AppLogo size={32} />
            <span className="text-lg font-bold text-primary">CiscoNetWatch</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Sign in to NOC Portal</h2>
            <p className="text-sm text-muted-foreground mt-1">Access your network monitoring dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                })}
                className={`w-full bg-input border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors font-mono ${
                  errors.email ? 'border-danger' : 'border-border'
                }`}
                placeholder="name@company.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle size={12} />{errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className={`w-full bg-input border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors pr-10 ${
                    errors.password ? 'border-danger' : 'border-border'
                  }`}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle size={12} />{errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('remember')} className="rounded border-border" />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={isResetting}
                className="text-sm text-primary hover:underline disabled:opacity-60"
              >
                {isResetting ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>

            {authError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger"
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in...</>
              ) : (
                'Sign in to NOC Portal'
              )}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Access is restricted to authorized personnel. Accounts are created by your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
