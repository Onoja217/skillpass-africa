create type public.application_status as enum ('submitted', 'reviewed', 'shortlisted', 'rejected', 'accepted');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  cover_note text check (cover_note is null or char_length(cover_note) <= 2000),
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, learner_id)
);

alter table public.applications enable row level security;

create policy "Learners can read their own applications"
on public.applications for select to authenticated
using (learner_id = auth.uid());

create policy "Employers can read applications to their opportunities"
on public.applications for select to authenticated
using (
  exists (
    select 1 from public.opportunities
    where opportunities.id = applications.opportunity_id
    and opportunities.employer_id = auth.uid()
  )
);

create policy "Administrators can read all applications"
on public.applications for select to authenticated
using (public.is_administrator());

create policy "Learners can create their own applications"
on public.applications for insert to authenticated
with check (learner_id = auth.uid());

create policy "Employers can update application status for their opportunities"
on public.applications for update to authenticated
using (
  exists (
    select 1 from public.opportunities
    where opportunities.id = applications.opportunity_id
    and opportunities.employer_id = auth.uid()
  )
);

grant select, insert on table public.applications to authenticated;
grant update on table public.applications to authenticated;