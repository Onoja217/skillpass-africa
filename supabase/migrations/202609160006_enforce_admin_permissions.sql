begin;

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

  if not public.has_admin_permission('users.manage') then
    raise exception 'User management access required.' using errcode = '42501';
  end if;

  if target_user_id = actor then
    raise exception 'Administrators cannot change their own role or account status.' using errcode = '42501';
  end if;

  select * into target from public.profiles where id = target_user_id for update;
  if target.id is null then raise exception 'User not found.' using errcode = 'P0002'; end if;

  if new_role is null then new_role := target.role; end if;
  if new_account_status is null then new_account_status := target.account_status; end if;

  if target.role = 'administrator' and new_role <> 'administrator' then
    select count(*) into administrator_count from public.profiles where role = 'administrator';
    if administrator_count <= 1 then raise exception 'The platform must retain at least one administrator.' using errcode = '42501'; end if;
  end if;

  if new_role = target.role and new_account_status = target.account_status then return target; end if;

  update public.profiles
  set role = new_role, account_status = new_account_status, updated_at = now()
  where id = target_user_id
  returning * into updated;

  if change_reason is not null and char_length(trim(change_reason)) > 0 then
    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
    values (actor, 'administrator', 'ADMIN_ACTION', 'profile', target_user_id, 'Administrator updated user access settings.', jsonb_build_object('reason', left(trim(change_reason), 500)));
  end if;

  return updated;
end;
$$;

-- Existing administrator-only audit policies are tightened to the audit.view permission.
drop policy if exists "Administrators can read audit logs" on public.audit_logs;
create policy "Administrators with audit permission can read audit logs"
on public.audit_logs for select to authenticated
using (public.has_admin_permission('audit.view'));

drop policy if exists "Administrators can read login activity" on public.login_activity;
create policy "Administrators with audit permission can read login activity"
on public.login_activity for select to authenticated
using (public.has_admin_permission('audit.view'));

drop policy if exists "Administrators can read role history" on public.role_history;
create policy "Administrators with audit permission can read role history"
on public.role_history for select to authenticated
using (public.has_admin_permission('audit.view'));

-- Verification administration is restricted to the dedicated review permission.
drop policy if exists "Administrators can read all skill verifications" on public.skill_verifications;
create policy "Administrators with verification permission can read all skill verifications"
on public.skill_verifications for select to authenticated
using (public.has_admin_permission('verifications.review'));

drop policy if exists "Administrators can update verification status" on public.skill_verifications;
create policy "Administrators with verification permission can update verification status"
on public.skill_verifications for update to authenticated
using (public.has_admin_permission('verifications.review'))
with check (public.has_admin_permission('verifications.review'));

drop policy if exists "Administrators can read all verification audit logs" on public.verification_audit_logs;
create policy "Administrators with verification permission can read verification audit logs"
on public.verification_audit_logs for select to authenticated
using (public.has_admin_permission('verifications.review'));

commit;
