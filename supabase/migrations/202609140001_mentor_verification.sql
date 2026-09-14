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
