-- Security hardening for the SkillPass verification and submission lifecycle.
-- This migration keeps application checks backed by database invariants.

begin;

-- A submission may only become verified when it has an approved mentor
-- verification. This prevents a direct database/API write from manufacturing
-- a verified submission without the verification record that supports it.
create or replace function public.enforce_verified_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'verified'::public.submission_status then
    if not exists (
      select 1
      from public.skill_verifications sv
      where sv.submission_id = new.id
        and sv.decision = 'approved'::public.verification_decision
        and sv.verification_status = 'active'::public.verification_status
    ) then
      raise exception 'A submission requires an active approved skill verification before it can be verified';
    end if;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.submissions'::regclass
      and tgname = 'submissions_require_active_verification'
  ) then
    create trigger submissions_require_active_verification
      before insert or update on public.submissions
      for each row execute function public.enforce_verified_submission();
  end if;
end
$$;

-- Verification identity and decision fields are immutable after creation.
-- Administrators may change only verification_status through the existing
-- status workflow; this prevents an administrator update from silently
-- replacing the learner, mentor, submission, decision, or public ID.
create or replace function public.protect_skill_verification_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.submission_id <> old.submission_id
     or new.learner_id <> old.learner_id
     or new.mentor_id <> old.mentor_id
     or new.decision <> old.decision
     or new.feedback is distinct from old.feedback
     or new.competency_rating is distinct from old.competency_rating
     or new.public_verification_id is distinct from old.public_verification_id
     or new.verified_at <> old.verified_at then
    raise exception 'Verification identity and decision fields cannot be changed after creation';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.skill_verifications'::regclass
      and tgname = 'protect_skill_verification_identity'
  ) then
    create trigger protect_skill_verification_identity
      before update on public.skill_verifications
      for each row execute function public.protect_skill_verification_identity();
  end if;
end
$$;

-- A verification cannot remain active after its underlying submission is no
-- longer verified. The public RPC also remains limited to approved decisions.
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

commit;
