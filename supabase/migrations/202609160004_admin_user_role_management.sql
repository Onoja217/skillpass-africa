begin;

create type public.account_status as enum ('active', 'suspended');

alter table public.profiles
  add column account_status public.account_status not null default 'active';

create table public.role_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous_role public.user_role,
  new_role public.user_role not null,
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

alter table public.role_history enable row level security;

create policy "Administrators can read role history"
on public.role_history for select to authenticated
using (public.is_administrator());

revoke all on table public.role_history from anon, authenticated;
grant select on table public.role_history to authenticated;

create or replace function public.log_profile_admin_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if new.role is distinct from old.role then
    insert into public.role_history (user_id, previous_role, new_role, changed_by, reason)
    values (new.id, old.role, new.role, coalesce(actor, new.id), 'Administrator role change');

    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
    values (
      actor,
      case when actor is null then null else (select role from public.profiles where id = actor) end,
      'ROLE_CHANGED',
      'profile',
      new.id,
      'User role changed from ' || old.role::text || ' to ' || new.role::text || '.',
      jsonb_build_object('previous_role', old.role, 'new_role', new.role)
    );
  end if;

  if new.account_status is distinct from old.account_status then
    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
    values (
      actor,
      case when actor is null then null else (select role from public.profiles where id = actor) end,
      case when new.account_status = 'suspended' then 'USER_SUSPENDED' else 'USER_REACTIVATED' end,
      'profile',
      new.id,
      case when new.account_status = 'suspended' then 'User account suspended.' else 'User account reactivated.' end,
      jsonb_build_object('previous_status', old.account_status, 'new_status', new.account_status)
    );
  end if;

  return new;
end;
$$;

create trigger profile_admin_change_audit_trigger
after update of role, account_status on public.profiles
for each row execute function public.log_profile_admin_changes();

create or replace function public.admin_update_user(
  target_user_id uuid,
  new_role public.user_role default null,
  new_account_status public.account_status default null,
  change_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.profiles;
  updated public.profiles;
  administrator_count integer;
begin
  if actor is null or not public.is_administrator() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  if target_user_id = actor then
    raise exception 'Administrators cannot change their own role or account status.' using errcode = '42501';
  end if;

  select * into target from public.profiles where id = target_user_id for update;
  if target.id is null then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  if new_role is null then
    new_role := target.role;
  end if;
  if new_account_status is null then
    new_account_status := target.account_status;
  end if;

  if target.role = 'administrator' and new_role <> 'administrator' then
    select count(*) into administrator_count from public.profiles where role = 'administrator';
    if administrator_count <= 1 then
      raise exception 'The platform must retain at least one administrator.' using errcode = '42501';
    end if;
  end if;

  if new_role = target.role and new_account_status = target.account_status then
    return target;
  end if;

  update public.profiles
  set role = new_role,
      account_status = new_account_status,
      updated_at = now()
  where id = target_user_id
  returning * into updated;

  if change_reason is not null and char_length(trim(change_reason)) > 0 then
    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
    values (
      actor,
      'administrator',
      'ADMIN_ACTION',
      'profile',
      target_user_id,
      'Administrator updated user access settings.',
      jsonb_build_object('reason', left(trim(change_reason), 500))
    );
  end if;

  return updated;
end;
$$;

revoke all on function public.admin_update_user(uuid, public.user_role, public.account_status, text) from public, anon;
grant execute on function public.admin_update_user(uuid, public.user_role, public.account_status, text) to authenticated;

comment on table public.role_history is 'Append-only record of user role changes for administrator accountability.';
comment on function public.admin_update_user(uuid, public.user_role, public.account_status, text) is 'Administrator-only trusted entry point for changing user role and account status.';

commit;
