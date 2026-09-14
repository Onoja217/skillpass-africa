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
