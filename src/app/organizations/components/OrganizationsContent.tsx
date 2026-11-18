'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Plus, RefreshCw, Copy, Check, X, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  members?: number;
}

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

const inputClass =
  'w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary';

export default function OrganizationsContent() {
  const { user, loading: userLoading } = useCurrentUser();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; orgName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const isPlatform = (user as { isPlatformAdmin?: boolean } | null)?.isPlatformAdmin === true;

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setOrgs([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/admin/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('No se pudieron cargar las empresas.');
        setOrgs([]);
      } else {
        const json = await res.json();
        setOrgs(json.organizations ?? []);
      }
    } catch {
      toast.error('Error de red al cargar empresas.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userLoading) load();
  }, [userLoading, load]);

  function closeModal() {
    setOpen(false);
    setCreated(null);
    setName('');
    setAdminFullName('');
    setAdminEmail('');
    setAdminPassword('');
    setCopied(false);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error('Sesión no válida.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          adminFullName: adminFullName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword,
        }),
      });
      if (res.status === 201) {
        const json = await res.json();
        setCreated({
          email: json.admin.email,
          password: adminPassword,
          orgName: json.organization.name,
        });
        load();
        return;
      }
      if (res.status === 403) toast.error('Solo super-admin de plataforma puede crear empresas.');
      else if (res.status === 409) toast.error('Ese correo ya está registrado.');
      else toast.error('No se pudo crear la empresa.');
    } catch {
      toast.error('Error inesperado.');
    } finally {
      setSaving(false);
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 size={16} className="animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Empresas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Multi-tenant: cada empresa tiene su admin y colaboradores aislados por org_id
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          {isPlatform && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90"
            >
              <Plus size={16} />
              Nueva empresa
            </button>
          )}
        </div>
      </div>

      {!isPlatform && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Solo ves tu empresa. Para crear nuevas empresas necesitas ser <strong className="text-foreground">super-admin de plataforma</strong>
          (`profiles.is_platform_admin = true`).
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading && orgs.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Cargando empresas…
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No hay empresas visibles.</div>
        ) : (
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {['Empresa', 'Slug', 'Miembros', 'Creada'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.slug}</td>
                  <td className="px-4 py-3 font-mono text-xs">{o.members ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {created ? 'Empresa creada' : 'Nueva empresa + admin'}
              </h2>
              <button type="button" onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {created ? (
              <div className="p-5 space-y-4 text-sm">
                <p className="text-muted-foreground">
                  Entrega estas credenciales al admin de <strong className="text-foreground">{created.orgName}</strong> por un
                  canal seguro. No se volverán a mostrar.
                </p>
                <div>
                  <p className="text-muted-foreground">Correo</p>
                  <p className="font-mono break-all">{created.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-input border border-border rounded-lg px-3 py-2 font-mono break-all">
                    {created.password}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(created.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted flex items-center gap-1"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={onCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nombre de la empresa</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Acme Networks" />
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Admin de empresa</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Nombre completo</label>
                      <input required value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Correo</label>
                      <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Contraseña inicial</label>
                      <div className="flex gap-2">
                        <input
                          required
                          minLength={12}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className={`${inputClass} font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() => setAdminPassword(generatePassword())}
                          className="border border-border rounded-lg px-3 text-sm hover:bg-muted flex items-center gap-1 whitespace-nowrap"
                        >
                          <KeyRound size={14} /> Generar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="border border-border rounded-lg px-4 py-2.5 text-sm">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {saving ? 'Creando…' : 'Crear empresa'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
