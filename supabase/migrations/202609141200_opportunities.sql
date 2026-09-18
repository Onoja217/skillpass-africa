create type public.opportunity_type as enum ('job', 'internship', 'apprenticeship', 'volunteer');
create type public.work_arrangement as enum ('remote', 'onsite', 'hybrid');

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  organization text not null check (char_length(organization) between 2 and 150),
  description text not null check (char_length(description) between 10 and 3000),
  opportunity_type public.opportunity_type not null,
  required_skills text[] not null default '{}',
  location text,
  work_arrangement public.work_arrangement not null default 'onsite',
  application_deadline timestamptz,
  application_instructions text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;

create policy "Anyone can read published opportunities"
on public.opportunities for select
using (is_published = true or employer_id = auth.uid() or public.is_administrator());

create policy "Approved employers can create opportunities"
on public.opportunities for insert to authenticated
with check (
  employer_id = auth.uid()
  and exists (select 1 from public.profiles where id = auth.uid() and role = 'employer')
);

create policy "Employers can update their own opportunities"
on public.opportunities for update to authenticated
using (employer_id = auth.uid())
with check (employer_id = auth.uid());

create policy "Administrators can manage all opportunities"
on public.opportunities for all to authenticated
using (public.is_administrator())
with check (public.is_administrator());

grant select, insert, update on table public.opportunities to authenticated;