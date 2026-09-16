begin;

create table public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null unique check (permission_key ~ '^[a-z]+(\.[a-z]+)+$'),
  name text not null check (char_length(name) between 2 and 100),
  description text not null check (char_length(description) between 2 and 300),
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role public.user_role not null,
  permission_id uuid not null references public.admin_permissions(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (role, permission_id)
);

alter table public.admin_permissions enable row level security;
alter table public.role_permissions enable row level security;

create policy "Administrators can read permission catalog"
on public.admin_permissions for select to authenticated
using (public.is_administrator());

create policy "Administrators can read role permissions"
on public.role_permissions for select to authenticated
using (public.is_administrator());

revoke all on table public.admin_permissions from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
grant select on table public.admin_permissions to authenticated;
grant select on table public.role_permissions to authenticated;

insert into public.admin_permissions (permission_key, name, description)
values
  ('users.view', 'View users', 'View user accounts and role information.'),
  ('users.manage', 'Manage users', 'Change user roles and account status.'),
  ('roles.manage', 'Manage roles', 'Change role-level permission assignments.'),
  ('verifications.review', 'Review verifications', 'Review and manage skill verification records.'),
  ('audit.view', 'View audit activity', 'View audit logs, authentication activity, and role history.'),
  ('reports.view', 'View reports', 'Access administrator reports and analytics.'),
  ('settings.manage', 'Manage settings', 'Manage platform-level administrator settings.')
on conflict (permission_key) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role, permission_id)
select 'administrator'::public.user_role, id
from public.admin_permissions
on conflict (role, permission_id) do nothing;

create or replace function public.has_admin_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    join public.admin_permissions ap on ap.id = rp.permission_id
    where p.id = auth.uid()
      and p.account_status = 'active'
      and ap.permission_key = required_permission
  )
$$;

create or replace function public.admin_set_role_permission(
  target_role public.user_role,
  permission_key text,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  permission_id uuid;
begin
  if actor is null or not public.is_administrator() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  if not public.has_admin_permission('roles.manage') then
    raise exception 'Role permission management access required.' using errcode = '42501';
  end if;

  if permission_key = 'roles.manage' and target_role = 'administrator' and not enabled then
    raise exception 'The administrator role must retain roles.manage access.' using errcode = '42501';
  end if;

  select id into permission_id
  from public.admin_permissions
  where admin_permissions.permission_key = admin_set_role_permission.permission_key;

  if permission_id is null then
    raise exception 'Permission not found.' using errcode = 'P0002';
  end if;

  if enabled then
    insert into public.role_permissions (role, permission_id, granted_by)
    values (target_role, permission_id, actor)
    on conflict (role, permission_id) do update set granted_by = excluded.granted_by;
  else
    delete from public.role_permissions
    where role = target_role and role_permissions.permission_id = permission_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, description, metadata)
  values (
    actor,
    'administrator',
    'PERMISSION_CHANGED',
    'role_permission',
    case when enabled then 'Permission granted.' else 'Permission revoked.' end,
    jsonb_build_object('role', target_role, 'permission', permission_key, 'enabled', enabled)
  );
end;
$$;

revoke all on function public.has_admin_permission(text) from public, anon;
grant execute on function public.has_admin_permission(text) to authenticated;
revoke all on function public.admin_set_role_permission(public.user_role, text, boolean) from public, anon;
grant execute on function public.admin_set_role_permission(public.user_role, text, boolean) to authenticated;

comment on table public.admin_permissions is 'Catalog of granular platform permissions used by role-based administrator access control.';
comment on table public.role_permissions is 'Role-to-permission assignments; changes are made through the trusted administrator RPC.';
comment on function public.has_admin_permission(text) is 'Checks whether the authenticated active user has a named permission through their role.';
comment on function public.admin_set_role_permission(public.user_role, text, boolean) is 'Administrator-only trusted entry point for changing role permission assignments.';

commit;
