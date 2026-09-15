-- Mentor verification domain for the existing SkillPass assessment/submission model.
-- This migration is safe when profiles.mentor_status already exists.

begin;

do $$
begin
  if to_regtype('public.mentor_status') is null then
    create type public.mentor_status as enum ('pending', 'approved', 'suspended', 'revoked');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'mentor_status'
  ) then
    alter table public.profiles add column mentor_status public.mentor_status;
  end if;
end
$$;

do $$
begin
  if to_regtype('public.verification_decision') is null then
    create type public.verification_decision as enum ('approved', 'rejected', 'revision_requested');
  end if;
end
$$;

create table if not exists public.skill_verifications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete restrict,
  decision public.verification_decision not null,
  feedback text check (feedback is null or char_length(feedback) <= 2000),
  competency_rating integer check (competency_rating between 1 and 5),
  verified_at timestamptz not null default now(),
  public_verification_id text unique check (
    public_verification_id is null
    or char_length(public_verification_id) between 8 and 30
  )
);

alter table public.skill_verifications enable row level security;

create or replace function public.is_approved_mentor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'mentor'::public.user_role
      and mentor_status = 'approved'::public.mentor_status
  )
$$;

grant execute on function public.is_approved_mentor() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'skill_verifications'
      and policyname = 'Approved mentors can create verifications'
  ) then
    create policy "Approved mentors can create verifications"
    on public.skill_verifications
    for insert
    to authenticated
    with check (
      mentor_id = auth.uid()
      and public.is_approved_mentor()
      and learner_id = (
        select s.learner_id
        from public.submissions s
        where s.id = submission_id
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'skill_verifications'
      and policyname = 'Learners can read their own skill verifications'
  ) then
    create policy "Learners can read their own skill verifications"
    on public.skill_verifications
    for select
    to authenticated
    using (learner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'skill_verifications'
      and policyname = 'Approved mentors can read their own verifications'
  ) then
    create policy "Approved mentors can read their own verifications"
    on public.skill_verifications
    for select
    to authenticated
    using (mentor_id = auth.uid() and public.is_approved_mentor());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'skill_verifications'
      and policyname = 'Administrators can read all skill verifications'
  ) then
    create policy "Administrators can read all skill verifications"
    on public.skill_verifications
    for select
    to authenticated
    using (public.is_administrator());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'skill_verifications'
      and policyname = 'Administrators can update verification status'
  ) then
    create policy "Administrators can update verification status"
    on public.skill_verifications
    for update
    to authenticated
    using (public.is_administrator())
    with check (public.is_administrator());
  end if;
end
$$;

create table if not exists public.verification_audit_logs (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.skill_verifications(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('approved', 'rejected', 'revision_requested', 'revoked', 'suspended')),
  comments text check (comments is null or char_length(comments) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.verification_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'verification_audit_logs'
      and policyname = 'Administrators can read all verification audit logs'
  ) then
    create policy "Administrators can read all verification audit logs"
    on public.verification_audit_logs
    for select
    to authenticated
    using (public.is_administrator());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'verification_audit_logs'
      and policyname = 'Learners can read their own verification audit logs'
  ) then
    create policy "Learners can read their own verification audit logs"
    on public.verification_audit_logs
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.skill_verifications sv
        where sv.id = verification_id
          and sv.learner_id = auth.uid()
      )
    );
  end if;
end
$$;

create or replace function public.generate_public_verification_id()
returns text
language plpgsql
as $$
begin
  return 'SP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
end;
$$;

create or replace function public.set_public_verification_id()
returns trigger
language plpgsql
as $$
begin
  if new.decision = 'approved' and new.public_verification_id is null then
    new.public_verification_id := public.generate_public_verification_id();
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.skill_verifications'::regclass
      and tgname = 'set_public_verification_id_trigger'
  ) then
    create trigger set_public_verification_id_trigger
    before insert or update on public.skill_verifications
    for each row execute function public.set_public_verification_id();
  end if;
end
$$;

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

-- verification_status is added by the follow-up migration before this trigger can fire on updates.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.skill_verifications'::regclass
      and tgname = 'skill_verification_audit_trigger'
  ) then
    create trigger skill_verification_audit_trigger
    after insert on public.skill_verifications
    for each row execute function public.log_skill_verification();
  end if;
end
$$;

create or replace function public.get_public_skill_verification(verification_public_id text)
returns table (
  public_verification_id text,
  learner_name text,
  skill_name text,
  project_title text,
  project_description text,
  competency_rating integer,
  verified_at timestamptz,
  decision public.verification_decision,
  verification_status public.verification_status
)
language sql
security definer
set search_path = ''
as $$
  select
    sv.public_verification_id,
    p.full_name,
    sk.name,
    a.title,
    coalesce(s.written_response, s.project_link, s.video_link),
    sv.competency_rating,
    sv.verified_at,
    sv.decision,
    sv.verification_status
  from public.skill_verifications sv
  join public.submissions s on s.id = sv.submission_id
  join public.assessments a on a.id = s.assessment_id
  join public.skills sk on sk.id = a.skill_id
  join public.profiles p on p.id = sv.learner_id
  where sv.public_verification_id = verification_public_id
    and sv.decision = 'approved'
    and sv.public_verification_id is not null;
$$;

revoke all on function public.get_public_skill_verification(text) from public;
grant execute on function public.get_public_skill_verification(text) to anon, authenticated;
grant select, insert on public.skill_verifications to authenticated;
grant select on public.verification_audit_logs to authenticated;

commit;
