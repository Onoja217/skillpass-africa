create policy "Employers can browse learner profiles"
on public.profiles for select to authenticated
using (
  role = 'learner'
  and exists (
    select 1 from public.profiles as viewer
    where viewer.id = auth.uid()
    and viewer.role = 'employer'
  )
);