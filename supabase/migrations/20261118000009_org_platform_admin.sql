-- Platform super-admin vs company admin; tighten cross-org access

alter table public.profiles
  add column if not exists is_platform_admin boolean not null default false;

-- First existing admin(s) become platform admins (bootstrap)
update public.profiles
set is_platform_admin = true
where role = 'admin' and is_active = true;

create or replace function public.is_platform_admin()
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
      and is_platform_admin = true
  );
$$;

-- Org-scoped admin (company admin)
create or replace function public.is_org_admin()
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

-- Keep is_admin as org admin OR platform (for legacy RPCs)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_admin() or public.is_platform_admin();
$$;

-- Manage users: platform anywhere, org admin only in own org (enforced in API + policies)
create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_admin() or public.is_platform_admin();
$$;

-- Cross-org bypass only for platform
create or replace function public.same_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_org is not null
    and (
      p_org = public.my_org_id()
      or public.is_platform_admin()
    );
$$;

-- Organizations: platform can list/create all; members see own
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.my_org_id() or public.is_platform_admin());

drop policy if exists organizations_admin_write on public.organizations;
create policy organizations_admin_write on public.organizations
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Profiles: org admin sees same org; platform sees all
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_platform_admin()
    or (public.is_org_admin() and org_id = public.my_org_id())
    or (
      public.current_app_role() = 'it_management'::public.app_role
      and org_id = public.my_org_id()
    )
  );

-- Guard: only platform can set is_platform_admin
create or replace function public.profiles_guard_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_platform_admin() then
    if not public.is_org_admin() then
      new.role := old.role;
      new.is_active := old.is_active;
      new.org_id := old.org_id;
    elsif old.org_id is distinct from new.org_id then
      -- org admin cannot move users to another company
      new.org_id := old.org_id;
    end if;
    new.is_platform_admin := old.is_platform_admin;
  end if;

  return new;
end;
$$;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_org_admin() to authenticated;
