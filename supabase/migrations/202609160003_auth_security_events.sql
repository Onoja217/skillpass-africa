-- Trusted authentication/session event logging.
-- The function is SECURITY DEFINER so clients never receive direct INSERT access
-- to audit tables. It only accepts events for the currently authenticated user.

create or replace function public.record_auth_security_event(
  event_action public.audit_action,
  event_type text,
  event_description text,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.user_role;
  audit_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if event_action not in ('LOGOUT', 'SECURITY_EVENT') then
    raise exception 'Unsupported authentication audit action';
  end if;

  if event_type not in ('LOGOUT', 'SESSION_EXPIRED', 'PASSWORD_CHANGED') then
    raise exception 'Unsupported authentication event type';
  end if;

  select role into current_role from public.profiles where id = current_user_id;

  insert into public.login_activity (
    user_id,
    event_type,
    success,
    created_at
  )
  values (
    current_user_id,
    event_type,
    true,
    now()
  );

  insert into public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  )
  values (
    current_user_id,
    current_role,
    event_action,
    'auth_session',
    current_user_id,
    event_description,
    coalesce(event_metadata, '{}'::jsonb)
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function public.record_auth_security_event(public.audit_action, text, text, jsonb) from public, anon;
grant execute on function public.record_auth_security_event(public.audit_action, text, text, jsonb) to authenticated;

comment on function public.record_auth_security_event(public.audit_action, text, text, jsonb)
is 'Trusted application entry point for authenticated session security events; validates auth.uid and never exposes direct audit-table writes.';
