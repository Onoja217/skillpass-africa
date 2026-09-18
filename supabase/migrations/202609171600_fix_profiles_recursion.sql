create or replace function public.is_employer()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'employer') $$;

drop policy if exists "Employers can browse learner profiles" on public.profiles;

create policy "Employers can browse learner profiles"
on public.profiles for select to authenticated
using (
  role = 'learner' and public.is_employer()
);

grant execute on function public.is_employer() to authenticated;
