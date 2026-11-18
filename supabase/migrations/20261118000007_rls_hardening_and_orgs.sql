-- ============================================================================
-- 07 — RLS hardening + multi-tenant foundation (org_id)
-- 1) Signup always creates read_only profiles (ignore user_metadata.role)
-- 2) Non-admins cannot change role / is_active on profiles
-- 3) Helpers require is_active for elevated permissions
-- 4) device_links already documented in README (companion change)
-- 5) organizations + org_id on tenant tables; policies scoped by org
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5) Organizations (multi-tenant foundation)
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

-- Default org for existing single-tenant data
insert into public.organizations (id, name, slug)
select '00000000-0000-4000-8000-000000000001'::uuid, 'Default NOC', 'default'
where not exists (select 1 from public.organizations where slug = 'default');

-- org_id columns (nullable during transition; backfilled to default)
alter table public.profiles
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

alter table public.devices
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.collectors
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.alerts
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.events
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.reports
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

alter table public.device_links
  add column if not exists org_id uuid references public.organizations(id) on delete cascade;

-- Backfill
update public.profiles
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

update public.devices
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

update public.collectors
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

update public.alerts
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

update public.events
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

update public.reports
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

update public.device_links
set org_id = '00000000-0000-4000-8000-000000000001'::uuid
where org_id is null;

create index if not exists idx_profiles_org on public.profiles(org_id);
create index if not exists idx_devices_org on public.devices(org_id);
create index if not exists idx_alerts_org on public.alerts(org_id);
create index if not exists idx_events_org on public.events(org_id);
create index if not exists idx_device_links_org on public.device_links(org_id);

alter table public.organizations enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Helpers: elevated powers require active profile
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.profiles
      where id = auth.uid()
        and is_active = true
    ),
    'read_only'::public.app_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = 'admin'::public.app_role
  );
$$;

create or replace function public.can_write_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in (
        'admin'::public.app_role,
        'noc_operator'::public.app_role,
        'network_engineer'::public.app_role
      )
  );
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

create or replace function public.can_ack_alerts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in (
        'admin'::public.app_role,
        'noc_operator'::public.app_role,
        'network_engineer'::public.app_role,
        'it_management'::public.app_role
      )
  );
$$;

-- Same org (or row without org during edge cases)
create or replace function public.same_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_org is not null and p_org = public.my_org_id();
$$;

-- ---------------------------------------------------------------------------
-- 1) Signup: always read_only (ignore metadata role)
-- ---------------------------------------------------------------------------
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
    'read_only'::public.app_role,  -- never trust client metadata for role
    true,
    coalesce(
      nullif(new.raw_user_meta_data->>'org_id', '')::uuid,
      '00000000-0000-4000-8000-000000000001'::uuid
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Block non-admin changes to role / is_active / org_id
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role / SQL as table owner still runs triggers; allow when no JWT
  -- or when caller is admin. auth.uid() is null for service_role API paths
  -- that don't set a user JWT — those are trusted backend jobs.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
    new.org_id := old.org_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_sensitive on public.profiles;
create trigger trg_profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.profiles_guard_sensitive_columns();

-- ---------------------------------------------------------------------------
-- Policies: org-scoped reads/writes (replace open using (true) where needed)
-- ---------------------------------------------------------------------------

-- Organizations: members see their org; admin can see all in their queries via is_admin
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.my_org_id() or public.is_admin());

drop policy if exists organizations_admin_write on public.organizations;
create policy organizations_admin_write on public.organizations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Profiles: self, same org (active viewers), or admin
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (
      public.current_app_role() = 'it_management'::public.app_role
      and org_id = public.my_org_id()
    )
    or (
      public.can_manage_users()
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.can_manage_users())
  with check (public.can_manage_users());

-- Devices
drop policy if exists devices_select on public.devices;
create policy devices_select on public.devices
  for select to authenticated
  using (public.same_org(org_id) or public.is_admin());

drop policy if exists devices_insert on public.devices;
create policy devices_insert on public.devices
  for insert to authenticated
  with check (public.can_write_ops() and (org_id = public.my_org_id() or org_id is null));

drop policy if exists devices_update on public.devices;
create policy devices_update on public.devices
  for update to authenticated
  using (public.can_write_ops() and public.same_org(org_id))
  with check (public.can_write_ops() and public.same_org(org_id));

drop policy if exists devices_delete on public.devices;
create policy devices_delete on public.devices
  for delete to authenticated
  using (
    public.same_org(org_id)
    and (public.is_admin() or public.current_app_role() = 'network_engineer'::public.app_role)
  );

-- Interfaces: via parent device org (join not available in simple policy — allow read if authenticated
-- and write for ops; prefer filtering in RPCs. Tighten: select true only for users with an org.
drop policy if exists interfaces_select on public.interfaces;
create policy interfaces_select on public.interfaces
  for select to authenticated
  using (
    exists (
      select 1 from public.devices d
      where d.id = device_id and (public.same_org(d.org_id) or public.is_admin())
    )
  );

drop policy if exists interfaces_write on public.interfaces;
create policy interfaces_write on public.interfaces
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

-- Collectors
drop policy if exists collectors_select on public.collectors;
create policy collectors_select on public.collectors
  for select to authenticated
  using (public.same_org(org_id) or public.is_admin());

drop policy if exists collectors_write on public.collectors;
create policy collectors_write on public.collectors
  for all to authenticated
  using (public.can_write_ops() and public.same_org(org_id))
  with check (public.can_write_ops() and (org_id = public.my_org_id() or public.same_org(org_id)));

-- Alerts
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated
  using (public.same_org(org_id) or public.is_admin());

drop policy if exists alerts_insert on public.alerts;
create policy alerts_insert on public.alerts
  for insert to authenticated
  with check (public.can_write_ops() and (org_id = public.my_org_id() or org_id is null));

drop policy if exists alerts_update on public.alerts;
create policy alerts_update on public.alerts
  for update to authenticated
  using (public.can_ack_alerts() and public.same_org(org_id))
  with check (public.can_ack_alerts() and public.same_org(org_id));

drop policy if exists alerts_delete on public.alerts;
create policy alerts_delete on public.alerts
  for delete to authenticated
  using (public.is_admin() and public.same_org(org_id));

-- Events
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (public.same_org(org_id) or public.is_admin());

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (public.can_write_ops() and (org_id = public.my_org_id() or org_id is null));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.is_admin() and public.same_org(org_id));

-- Reports
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated
  using (public.same_org(org_id) or public.is_admin());

drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports
  for all to authenticated
  using (
    public.same_org(org_id)
    and (
      public.is_admin()
      or public.current_app_role() in (
        'it_management'::public.app_role,
        'network_engineer'::public.app_role
      )
    )
  )
  with check (
    (org_id = public.my_org_id() or public.same_org(org_id))
    and (
      public.is_admin()
      or public.current_app_role() in (
        'it_management'::public.app_role,
        'network_engineer'::public.app_role
      )
    )
  );

-- device_links
drop policy if exists device_links_select on public.device_links;
create policy device_links_select on public.device_links
  for select to authenticated
  using (public.same_org(org_id) or public.is_admin());

drop policy if exists device_links_write on public.device_links;
create policy device_links_write on public.device_links
  for all to authenticated
  using (public.can_write_ops() and public.same_org(org_id))
  with check (public.can_write_ops() and (org_id = public.my_org_id() or public.same_org(org_id)));

-- Default org_id on insert for devices when null (ops convenience)
create or replace function public.set_row_org_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.org_id is null then
    new.org_id := coalesce(public.my_org_id(), '00000000-0000-4000-8000-000000000001'::uuid);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_devices_org on public.devices;
create trigger trg_devices_org
  before insert on public.devices
  for each row execute function public.set_row_org_id();

drop trigger if exists trg_alerts_org on public.alerts;
create trigger trg_alerts_org
  before insert on public.alerts
  for each row execute function public.set_row_org_id();

drop trigger if exists trg_events_org on public.events;
create trigger trg_events_org
  before insert on public.events
  for each row execute function public.set_row_org_id();

drop trigger if exists trg_collectors_org on public.collectors;
create trigger trg_collectors_org
  before insert on public.collectors
  for each row execute function public.set_row_org_id();

drop trigger if exists trg_reports_org on public.reports;
create trigger trg_reports_org
  before insert on public.reports
  for each row execute function public.set_row_org_id();

drop trigger if exists trg_device_links_org on public.device_links;
create trigger trg_device_links_org
  before insert on public.device_links
  for each row execute function public.set_row_org_id();
