create policy "Employers can read profiles of applicants to their opportunities"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.applications
    join public.opportunities on opportunities.id = applications.opportunity_id
    where applications.learner_id = profiles.id
    and opportunities.employer_id = auth.uid()
  )
);