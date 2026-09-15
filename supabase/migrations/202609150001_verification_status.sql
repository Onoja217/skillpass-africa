begin;

do $$
begin
  if to_regtype('public.verification_status') is null then
    create type public.verification_status as enum ('active', 'revoked', 'suspended');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'skill_verifications'
      and column_name = 'verification_status'
  ) then
    alter table public.skill_verifications
      add column verification_status public.verification_status not null default 'active';
  end if;
end
$$;

create index if not exists skill_verifications_public_id_status_idx
on public.skill_verifications (public_verification_id, verification_status);

create or replace function public.log_skill_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.verification_audit_logs (verification_id, actor_id, action, comments)
    values (new.id, new.mentor_id, new.decision::text, new.feedback);
  elsif tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status then
    insert into public.verification_audit_logs (verification_id, actor_id, action, comments)
    values (
      new.id,
      auth.uid(),
      new.verification_status::text,
      case new.verification_status
        when 'revoked' then 'Verification revoked by administrator.'
        when 'suspended' then 'Verification suspended by administrator.'
        else 'Verification status restored by administrator.'
      end
    );
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.skill_verifications'::regclass
      and tgname = 'skill_verification_audit_status_trigger'
  ) then
    create trigger skill_verification_audit_status_trigger
    after update on public.skill_verifications
    for each row execute function public.log_skill_verification();
  end if;
end
$$;

commit;
