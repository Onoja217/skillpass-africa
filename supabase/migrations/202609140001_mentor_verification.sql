create type public.mentor_status as enum (
  'pending',
  'approved',
  'suspended',
  'revoked'
);

alter table public.profiles
add column mentor_status public.mentor_status;
create table public.skill_submissions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null check (char_length(skill_name) between 2 and 100),
  title text not null check (char_length(title) between 2 and 150),
  description text check (description is null or char_length(description) <= 1000),
  evidence_url text,
  submitted_at timestamptz not null default now()
);

alter table public.skill_submissions enable row level security;
create policy "Learners can create their own skill submissions"
on public.skill_submissions
for insert
to authenticated
with check (
  learner_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'learner'
  )
);

create policy "Learners can read their own skill submissions"
on public.skill_submissions
for select
to authenticated
using (
  learner_id = auth.uid()
);
create type public.verification_decision as enum (
  'approved',
  'rejected',
  'revision_requested'
);

create table public.skill_verifications (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.skill_submissions(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete restrict,
  decision public.verification_decision not null,
  feedback text check (feedback is null or char_length(feedback) <= 2000),
  competency_rating integer check (competency_rating between 1 and 5),
  verified_at timestamptz not null default now()
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
      and role = 'mentor'
      and mentor_status = 'approved'
  )
$$;

create policy "Approved mentors can create verifications"
on public.skill_verifications
for insert
to authenticated

with check (
  mentor_id = auth.uid()
  and public.is_approved_mentor()
  and learner_id = (
    select learner_id
    from public.skill_submissions
    where id = submission_id
  )
);

create policy "Approved mentors can read skill submissions"
on public.skill_submissions
for select
to authenticated
using (
  public.is_approved_mentor()
);

create policy "Learners can read their own skill verifications"
on public.skill_verifications
for select
to authenticated
using (
  learner_id = auth.uid()
);
create policy "Approved mentors can read their own verifications"
on public.skill_verifications
for select
to authenticated
using (
  mentor_id = auth.uid()
  and public.is_approved_mentor()
);

create policy "Administrators can read all skill verifications"
on public.skill_verifications
for select
to authenticated
using (
  public.is_administrator()
);

create table public.verification_audit_logs (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.skill_verifications(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action public.verification_decision not null,
  comments text check (comments is null or char_length(comments) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.verification_audit_logs enable row level security;

create or replace function public.log_skill_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.verification_audit_logs (
    verification_id,
    actor_id,
    action,
    comments
  )
  values (
    new.id,
    new.mentor_id,
    new.decision,
    new.feedback
  );

  return new;
end;
$$;

create trigger skill_verification_audit_trigger
after insert on public.skill_verifications
for each row
execute procedure public.log_skill_verification();

create policy "Administrators can read all verification audit logs"
on public.verification_audit_logs
for select
to authenticated
using (
  public.is_administrator()
);

create policy "Learners can read their own verification audit logs"
on public.verification_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.skill_verifications
    where id = verification_id
      and learner_id = auth.uid()
  )
);

alter table public.skill_verifications
add column public_verification_id text
unique
check (
  public_verification_id is null
  or char_length(public_verification_id) between 8 and 30
);

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

create trigger set_public_verification_id_trigger
before insert on public.skill_verifications
for each row
execute procedure public.set_public_verification_id();
  
create or replace function public.get_public_skill_verification(
  verification_public_id text
)
returns table (
  public_verification_id text,
  learner_name text,
  skill_name text,
  project_title text,
  project_description text,
  competency_rating integer,
  verified_at timestamptz,
  decision public.verification_decision
)
language sql
security definer
set search_path = ''
as $$
  select
    sv.public_verification_id,
    p.full_name,
    ss.skill_name,
    ss.title,
    ss.description,
    sv.competency_rating,
    sv.verified_at,
    sv.decision
  from public.skill_verifications sv
  join public.profiles p
    on p.id = sv.learner_id
  join public.skill_submissions ss
    on ss.id = sv.submission_id
  where sv.public_verification_id = verification_public_id
    and sv.decision = 'approved'
    and sv.public_verification_id is not null;
$$;

revoke all on function public.get_public_skill_verification(text)
from public;

grant execute on function public.get_public_skill_verification(text)
to anon, authenticated;
