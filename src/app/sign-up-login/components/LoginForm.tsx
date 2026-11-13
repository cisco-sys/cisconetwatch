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

interface ResetFields {
  password: string;
  confirm: string;
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

function recoveryRedirectUrl(): string {
  if (typeof window === 'undefined') return '/sign-up-login?reset=1';
  return `${window.location.origin}/sign-up-login?reset=1`;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'This account has not been confirmed yet. Contact your administrator.';
  if (m.includes('too many requests') || m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Cannot reach the authentication service. Check your connection.';
  if (m.includes('redirect') || m.includes('not allowed') || m.includes('url')) {
    return 'Password reset is misconfigured (redirect URL). Ask your administrator to allow this site in Supabase Auth → URL Configuration.';
  }
  if (m.includes('same password') || m.includes('different from the old')) {
    return 'Choose a password different from your current one.';
  }
  if (m.includes('weak') || m.includes('at least')) {
    return 'Password is too weak. Use at least 8 characters.';
  }
  return message?.trim() ? message : 'Could not complete the request. Please try again.';
}

/** Detect recovery tokens from the email link (hash or query). */
function hasRecoveryParams(): boolean {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  if (q.get('reset') === '1' || q.get('type') === 'recovery') return true;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return false;
  const h = new URLSearchParams(hash);
  return h.get('type') === 'recovery' || Boolean(h.get('access_token'));
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'update-password'>('login');
  const [recoveryReady, setRecoveryReady] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
    setError,
  } = useForm<LoginFields>();

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
  } = useForm<ResetFields>();

  // Handle recovery link from email + optional existing session restore
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    const finishRecoverySession = (session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>) => {
      if (cancelled) return;
      syncAuthCookie(session);
      setMode('update-password');
      setRecoveryReady(true);
      // Clean sensitive tokens from the address bar
      const url = new URL(window.location.href);
      url.hash = '';
      url.searchParams.set('reset', '1');
      window.history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString());
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        finishRecoverySession(session);
      }
    });

    (async () => {
      // PKCE: ?code=...
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !error && data.session) {
          // Recovery links often land with code; treat as update-password when reset=1 or type=recovery
          if (hasRecoveryParams() || params.get('type') === 'recovery') {
            finishRecoverySession(data.session);
            return;
          }
          syncAuthCookie(data.session);
          window.location.href = getRedirectTarget();
          return;
        }
        if (!cancelled && error) {
          setAuthError(friendlyAuthError(error.message));
        }
      }

      // Implicit hash tokens — client parses when detectSessionInUrl is true
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session && hasRecoveryParams()) {
        finishRecoverySession(session);
        return;
      }

      // Normal auto-restore (not recovery)
      if (session && !hasRecoveryParams()) {
        const last = Number(sessionStorage.getItem('cnw_auto_restore') ?? 0);
        if (Date.now() - last < 15000) return;
        sessionStorage.setItem('cnw_auto_restore', String(Date.now()));
        syncAuthCookie(session);
        window.location.href = getRedirectTarget();
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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

      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', auth.user.id);

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
        redirectTo: recoveryRedirectUrl(),
      });
      if (error) {
        setAuthError(friendlyAuthError(error.message));
        return;
      }
      toast.success('If that email is registered, a reset link has been sent. Check your inbox and spam folder.');
    } catch {
      setAuthError('Could not send the reset email. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const onUpdatePassword = async (data: ResetFields) => {
    setAuthError(null);
    if (data.password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (data.password !== data.confirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Authentication service is not configured. Contact your administrator.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) {
        setAuthError(friendlyAuthError(error.message));
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        syncAuthCookie(sessionData.session);
      }

      toast.success('Password updated. You can sign in now.');
      // Stay signed in and go to app, or force re-login — go to dashboard if profile ok
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (profile?.is_active) {
          window.location.href = '/';
          return;
        }
      }
      await supabase.auth.signOut();
      syncAuthCookie(null);
      setMode('login');
      setRecoveryReady(false);
      window.history.replaceState({}, '', '/sign-up-login');
    } catch {
      setAuthError('Unexpected error while updating password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const brandPanel = (
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
  );

  return (
    <div className="min-h-screen bg-background flex">
      {brandPanel}

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <AppLogo size={32} />
            <span className="text-lg font-bold text-primary">CiscoNetWatch</span>
          </div>

          {mode === 'update-password' ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Set a new password</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {recoveryReady
                    ? 'Choose a strong password for your NOC account.'
                    : 'Validating recovery link…'}
                </p>
              </div>

              <form onSubmit={handleSubmitReset(onUpdatePassword)} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-foreground mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...registerReset('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'At least 8 characters' },
                      })}
                      className={`w-full bg-input border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors pr-10 ${
                        resetErrors.password ? 'border-danger' : 'border-border'
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
                  {resetErrors.password && (
                    <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                      <AlertCircle size={12} />
                      {resetErrors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...registerReset('confirm', { required: 'Confirm your password' })}
                      className={`w-full bg-input border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors pr-10 ${
                        resetErrors.confirm ? 'border-danger' : 'border-border'
                      }`}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {resetErrors.confirm && (
                    <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                      <AlertCircle size={12} />
                      {resetErrors.confirm.message}
                    </p>
                  )}
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
                  disabled={isUpdatingPassword || !recoveryReady}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>

                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={async () => {
                    const sb = getSupabaseBrowserClient();
                    await sb?.auth.signOut();
                    syncAuthCookie(null);
                    setMode('login');
                    setRecoveryReady(false);
                    setAuthError(null);
                    window.history.replaceState({}, '', '/sign-up-login');
                  }}
                >
                  Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Sign in to NOC Portal</h2>
                <p className="text-sm text-muted-foreground mt-1">Access your network monitoring dashboard</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    className={`w-full bg-input border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors font-mono ${
                      errors.email ? 'border-danger' : 'border-border'
                    }`}
                    placeholder="name@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                  </label>
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
                      <AlertCircle size={12} />
                      {errors.password.message}
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
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing in...
                    </>
                  ) : (
                    'Sign in to NOC Portal'
                  )}
                </button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-8">
                Access is restricted to authorized personnel. Accounts are created by your administrator.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
