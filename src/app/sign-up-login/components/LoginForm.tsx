'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, AlertCircle, Loader2, Copy, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';

interface LoginFields {
  email: string;
  password: string;
  remember: boolean;
}

const demoCredentials = [
  { role: 'Admin', email: 'admin@cisconetwatch.corp', password: 'Adm!n#NW2026', color: 'text-danger' },
  { role: 'NOC Operator', email: 'noc.operator@cisconetwatch.corp', password: 'N0cOp3r@tor!', color: 'text-primary' },
  { role: 'Network Engineer', email: 'net.engineer@cisconetwatch.corp', password: 'Eng!n33r#Net', color: 'text-warning' },
  { role: 'IT Management', email: 'it.mgmt@cisconetwatch.corp', password: 'Mgmt#IT2026!', color: 'text-success' },
];

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors }, setError } = useForm<LoginFields>();

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const useCredential = (cred: (typeof demoCredentials)[0]) => {
    setValue('email', cred.email);
    setValue('password', cred.password);
    toast.success(`Credentials loaded for ${cred.role}`);
  };

  const onSubmit = async (data: LoginFields) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    setIsLoading(false);

    const match = demoCredentials.find(
      (c) => c.email === data.email && c.password === data.password
    );
    if (!match) {
      setError('email', {
        message: 'Invalid credentials — use the demo accounts below to sign in',
      });
      return;
    }
    toast.success(`Welcome back — logged in as ${match.role}`);
    window.location.href = '/';
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
          <h1 className="text-3xl font-bold text-foreground mb-4">Real-Time Cisco Network Monitoring</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Monitor every interface, trap, and protocol across your entire Cisco infrastructure.
            SNMP · NETCONF · SSH · RESTCONF · Telemetry — unified in one NOC dashboard.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { value: '47', label: 'Devices Online' },
              { value: '312', label: 'Interfaces Up' },
              { value: '99.7%', label: 'Uptime SLA' },
            ].map((stat) => (
              <div key={stat.label} className="bg-muted/40 border border-border rounded-lg p-3">
                <p className="text-xl font-bold font-mono text-primary tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                placeholder="operator@cisconetwatch.corp"
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
              <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
            </div>

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

          <div className="mt-8 border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Demo Credentials</span>
              <span className="text-xs text-muted-foreground">Click any row to autofill</span>
            </div>
            <div className="divide-y divide-border">
              {demoCredentials.map((cred) => (
                <div
                  key={cred.role}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer"
                  onClick={() => useCredential(cred)}
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-semibold ${cred.color}`}>{cred.role}</span>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{cred.email}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.email, `email-${cred.role}`); }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy email"
                    >
                      {copiedField === `email-${cred.role}` ? <CheckCheck size={12} className="text-success" /> : <Copy size={12} />}
                    </button>
                    <span className="text-xs text-primary border border-primary/30 rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Use</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            By signing in you agree to the{' '}
            <button className="text-primary hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button className="text-primary hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
