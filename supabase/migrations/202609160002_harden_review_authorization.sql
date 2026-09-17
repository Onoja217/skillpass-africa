-- Review actions must require an approved mentor or administrator at the database layer.

begin;

drop policy if exists "Mentors and administrators can update submissions" on public.submissions;
drop policy if exists "Mentors and administrators review submissions" on public.submissions;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'submissions'
      and policyname = 'Approved mentors and administrators review submissions'
  ) then
    create policy "Approved mentors and administrators review submissions"
    on public.submissions
    for update
    to authenticated
    using (
      public.is_administrator()
      or public.is_approved_mentor()
    )
    with check (
      public.is_administrator()
      or public.is_approved_mentor()
    );
  end if;
end
$$;

commit;
