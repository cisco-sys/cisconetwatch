'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, Loader2, Eye, EyeOff, Copy, Check, X, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ROLE_DESCRIPTION, ROLE_LABEL, T, type AppRole } from '@/lib/i18n/es';

interface Fields {
  fullName: string;
  email: string;
  role: AppRole;
  password: string;
}

const ROLES = Object.keys(ROLE_LABEL) as AppRole[];

const inputClass =
  'w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-foreground mb-1.5';

function generatePassword(length = 16): string {
  const sets = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%*-_=+?'];
  const all = sets.join('');
  const rand = (max: number) => {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

interface Props {
  onCreated?: () => void;
}

export default function CreateUserDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Fields>({ defaultValues: { role: 'read_only', password: '' } });

  const role = watch('role');

  function close() {
    setOpen(false);
    setCreated(null);
    setShowPassword(false);
    setCopied(false);
    reset({ role: 'read_only', password: '' });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, saving]);

  function fillGeneratedPassword() {
    setValue('password', generatePassword(), { shouldValidate: true });
    setShowPassword(true);
  }

  async function onSubmit(data: Fields) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(T.common.noDatabase);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error(T.users.forbidden);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: data.email.trim(),
          fullName: data.fullName.trim(),
          role: data.role,
          password: data.password,
        }),
      });

      if (res.status === 201) {
        setCreated({ email: data.email.trim(), password: data.password });
        onCreated?.();
        return;
      }
      if (res.status === 409) toast.error(T.users.exists);
      else if (res.status === 403 || res.status === 401) toast.error(T.users.forbidden);
      else toast.error(T.users.createError);
    } catch {
      toast.error(T.common.unexpected);
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(T.common.unexpected);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <UserPlus size={16} />
        {T.users.createButton}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 id="create-user-title" className="text-sm font-semibold text-foreground">
                {created ? T.users.createdTitle : T.users.createTitle}
              </h2>
              <button
                type="button"
                onClick={close}
                disabled={saving}
                aria-label={T.users.close}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {created ? (
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">{T.users.createdBody}</p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{T.users.email}</dt>
                    <dd className="font-mono text-foreground break-all">{created.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{T.users.password}</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <code className="flex-1 bg-input border border-border rounded-lg px-3 py-2 font-mono text-foreground break-all">
                        {created.password}
                      </code>
                      <button
                        type="button"
                        onClick={copyPassword}
                        className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? T.users.copied : T.users.copy}
                      </button>
                    </dd>
                  </div>
                </dl>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90"
                  >
                    {T.users.close}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="p-5 grid grid-cols-1 gap-4" noValidate>
                <div>
                  <label htmlFor="new-user-name" className={labelClass}>
                    {T.users.fullName}
                  </label>
                  <input
                    id="new-user-name"
                    autoFocus
                    autoComplete="off"
                    {...register('fullName', {
                      required: T.users.required,
                      validate: (v) => v.trim().length >= 2 || T.users.required,
                    })}
                    aria-invalid={!!errors.fullName}
                    className={inputClass}
                  />
                  {errors.fullName && (
                    <p role="alert" className="text-xs text-danger mt-1">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="new-user-email" className={labelClass}>
                    {T.users.email}
                  </label>
                  <input
                    id="new-user-email"
                    type="email"
                    autoComplete="off"
                    {...register('email', {
                      required: T.users.required,
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: T.users.invalidEmail },
                    })}
                    aria-invalid={!!errors.email}
                    className={inputClass}
                  />
                  {errors.email && (
                    <p role="alert" className="text-xs text-danger mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="new-user-role" className={labelClass}>
                    {T.users.role}
                  </label>
                  <select id="new-user-role" {...register('role')} className={inputClass}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1.5">{ROLE_DESCRIPTION[role]}</p>
                </div>

                <div>
                  <label htmlFor="new-user-password" className={labelClass}>
                    {T.users.password}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id="new-user-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...register('password', {
                          required: T.users.required,
                          minLength: { value: 12, message: T.users.passwordMin },
                        })}
                        aria-invalid={!!errors.password}
                        className={`${inputClass} font-mono pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? T.users.hide : T.users.show}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={fillGeneratedPassword}
                      className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted whitespace-nowrap"
                    >
                      <KeyRound size={14} />
                      {T.users.generate}
                    </button>
                  </div>
                  {errors.password && (
                    <p role="alert" className="text-xs text-danger mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    disabled={saving}
                    className="border border-border rounded-lg px-4 py-2.5 text-sm text-foreground hover:bg-muted disabled:opacity-60"
                  >
                    {T.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {saving ? T.users.creating : T.users.submit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
