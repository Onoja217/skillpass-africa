-- Administrator audit and authentication activity.
-- Audit rows are append-only from the application perspective: administrators can
-- read them, but there is no UPDATE/DELETE policy for authenticated users.

create type public.audit_action as enum (
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'ROLE_REQUESTED',
  'ROLE_APPROVED',
  'ROLE_REJECTED',
  'ROLE_ASSIGNED',
  'ROLE_REMOVED',
  'ROLE_CHANGED',
  'VERIFICATION_SUBMITTED',
  'VERIFICATION_APPROVED',
  'VERIFICATION_REJECTED',
  'VERIFICATION_REVIEWED',
  'APPLICATION_SUBMITTED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'ADMIN_ACTION',
  'PERMISSION_CHANGED',
  'SECURITY_EVENT'
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  action public.audit_action not null,
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  description text not null check (char_length(description) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.login_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  identifier text,
  event_type text not null check (event_type in ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_EXPIRED')),
  ip_address inet,
  user_agent text,
  device text,
  browser text,
  operating_system text,
  success boolean not null default false,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs(action, created_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index login_activity_created_at_idx on public.login_activity(created_at desc);
create index login_activity_user_id_idx on public.login_activity(user_id, created_at desc);
create index login_activity_success_idx on public.login_activity(success, created_at desc);

alter table public.audit_logs enable row level security;
alter table public.login_activity enable row level security;

create policy "Administrators can read audit logs"
on public.audit_logs for select to authenticated
using (public.is_administrator());

create policy "Administrators can read login activity"
on public.login_activity for select to authenticated
using (public.is_administrator());

revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.login_activity from anon, authenticated;
grant select on table public.audit_logs to authenticated;
grant select on table public.login_activity to authenticated;

-- Role/profile changes are recorded by the database rather than trusting the UI.
create or replace function public.record_profile_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changed_action public.audit_action;
  changed_description text;
begin
  if tg_op = 'INSERT' then
    changed_action := 'USER_CREATED';
    changed_description := 'User profile created';
  elsif old.role is distinct from new.role then
    changed_action := 'ROLE_CHANGED';
    changed_description := format('Role changed from %s to %s', old.role, new.role);
  elsif old.full_name is distinct from new.full_name
     or old.phone is distinct from new.phone
     or old.location is distinct from new.location
     or old.biography is distinct from new.biography
     or old.avatar_url is distinct from new.avatar_url
     or old.selected_skills is distinct from new.selected_skills then
    changed_action := 'USER_UPDATED';
    changed_description := 'User profile updated';
  else
    return new;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata)
  values (
    auth.uid(),
    (select role from public.profiles where id = auth.uid()),
    changed_action,
    'profile',
    new.id,
    changed_description,
    jsonb_build_object('previous_role', old.role, 'new_role', new.role)
  );
  return new;
end;
$$;

drop trigger if exists record_profile_audit_after_change on public.profiles;
create trigger record_profile_audit_after_change
after insert or update on public.profiles
for each row execute procedure public.record_profile_audit();

-- Supabase updates auth.users.last_sign_in_at after a successful password login.
-- This gives us a tamper-resistant successful-login signal without exposing auth internals.
create or replace function public.record_successful_login()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  profile_role public.user_role;
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at and new.last_sign_in_at is not null then
    select role into profile_role from public.profiles where id = new.id;

    insert into public.login_activity (user_id, identifier, event_type, success, created_at)
    values (new.id, new.email, 'LOGIN_SUCCESS', true, new.last_sign_in_at);

    insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, description, metadata, created_at)
    values (
      new.id,
      profile_role,
      'LOGIN_SUCCESS',
      'auth_user',
      new.id,
      'User signed in successfully',
      jsonb_build_object('email', new.email),
      new.last_sign_in_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists record_successful_login_after_auth_update on auth.users;
create trigger record_successful_login_after_auth_update
after update of last_sign_in_at on auth.users
for each row execute procedure public.record_successful_login();

comment on table public.audit_logs is 'Administrator-visible, append-only application audit trail.';
comment on table public.login_activity is 'Administrator-visible authentication activity; never stores passwords or tokens.';
