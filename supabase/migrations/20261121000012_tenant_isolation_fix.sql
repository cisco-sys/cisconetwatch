-- ==========================================================================
-- 12 — Tenant isolation fix (corrige 07 + 09)
-- Debe aplicarse DESPUÉS de 07, 09, 10 y 11.
--
-- Problemas corregidos (reproducidos en staging con dos empresas):
--  1) El admin de la empresa B veía equipos, enlaces, interfaces, alertas,
--     eventos, informes, recolectores y credenciales SNMP de la empresa A,
--     porque las políticas usaban "or public.is_admin()" (verdadero para el
--     admin de CUALQUIER empresa).
--  2) El admin de B podía cambiar el rol de usuarios de A (profiles_admin_all
--     y profiles_update_self sin filtro de empresa).
--  3) handle_new_user leía la empresa de user_metadata (controlada por el
--     cliente): cualquiera podía registrarse dentro de otra empresa.
--  4) snmp_configs no estaba aislada por empresa.
-- ==========================================================================

-- 1) Alta de usuarios: la empresa NUNCA viene de user_metadata.
--    Solo raw_app_meta_data (solo servidor). Sin dato confiable, org_id = NULL
--    y same_org(NULL) es falso: el usuario no ve datos de ninguna empresa.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active, org_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'read_only'::public.app_role,
    true,
    nullif(new.raw_app_meta_data->>'org_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Lecturas: solo la propia empresa.
--    same_org() ya incluye al super-admin de plataforma (migración 09).
drop policy if exists devices_select on public.devices;
create policy devices_select on public.devices
  for select to authenticated using (public.same_org(org_id));

drop policy if exists collectors_select on public.collectors;
create policy collectors_select on public.collectors
  for select to authenticated using (public.same_org(org_id));

drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated using (public.same_org(org_id));

drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated using (public.same_org(org_id));

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated using (public.same_org(org_id));

drop policy if exists device_links_select on public.device_links;
create policy device_links_select on public.device_links
  for select to authenticated using (public.same_org(org_id));

drop policy if exists interfaces_select on public.interfaces;
create policy interfaces_select on public.interfaces
  for select to authenticated
  using (exists (
    select 1 from public.devices d
    where d.id = device_id and public.same_org(d.org_id)
  ));

-- 3) Perfiles: un admin de empresa solo administra usuarios de SU empresa.
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (
    public.is_platform_admin()
    or (public.is_org_admin() and org_id = public.my_org_id())
  )
  with check (
    public.is_platform_admin()
    or (public.is_org_admin() and org_id = public.my_org_id())
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or (public.is_org_admin() and org_id = public.my_org_id())
  )
  with check (
    id = auth.uid()
    or public.is_platform_admin()
    or (public.is_org_admin() and org_id = public.my_org_id())
  );

-- 4) Credenciales SNMP: aisladas por empresa a través del equipo.
drop policy if exists snmp_select on public.snmp_configs;
create policy snmp_select on public.snmp_configs
  for select to authenticated
  using (
    (public.can_write_ops() or public.current_app_role() = 'it_management'::public.app_role)
    and exists (
      select 1 from public.devices d
      where d.id = device_id and public.same_org(d.org_id)
    )
  );

drop policy if exists snmp_write on public.snmp_configs;
create policy snmp_write on public.snmp_configs
  for all to authenticated
  using (
    public.can_write_ops()
    and exists (
      select 1 from public.devices d
      where d.id = device_id and public.same_org(d.org_id)
    )
  )
  with check (
    public.can_write_ops()
    and exists (
      select 1 from public.devices d
      where d.id = device_id and public.same_org(d.org_id)
    )
  );
