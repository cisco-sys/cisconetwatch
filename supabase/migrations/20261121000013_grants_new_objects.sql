-- ==========================================================================
-- 13 — Permisos de los objetos nuevos (07–11)
-- El rol anónimo no debe tener acceso a tablas ni funciones del esquema public.
-- ==========================================================================
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.my_org_id(),
  public.current_profile_active(),
  public.same_org(uuid),
  public.is_platform_admin(),
  public.is_org_admin(),
  public.is_admin(),
  public.can_manage_users(),
  public.can_write_ops(),
  public.can_ack_alerts(),
  public.current_app_role()
to authenticated;

revoke execute on function
  public.profiles_guard_sensitive_columns(),
  public.set_row_org_id(),
  public.handle_new_user()
from authenticated;
