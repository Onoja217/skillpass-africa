-- Harden the domain model after the initial skill-domain migration.

-- A public portfolio item may be linked to a submission only when that
-- submission has been verified. Unlinked project items remain publishable.
drop policy if exists "Public portfolio items are readable" on public.portfolio_items;
create policy "Public portfolio items are readable"
on public.portfolio_items for select
using (
  is_public = true
  and (
    submission_id is null
    or exists (
      select 1
      from public.submissions s
      where s.id = portfolio_items.submission_id
        and s.status = 'verified'
    )
  )
);

-- Seed the categories required by Issue #17. Upserts keep the migration
-- idempotent when a category already exists.
insert into public.categories (name)
values
  ('Technology'),
  ('Design'),
  ('Fashion'),
  ('Repairs'),
  ('Business'),
  ('Media'),
  ('Agriculture')
on conflict (name) do nothing;

-- Keep portfolio ownership tied to the linked submission on every write.
-- This prevents a learner from attaching another learner's evidence.
create or replace function public.validate_portfolio_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.submission_id is not null and not exists (
    select 1
    from public.submissions s
    where s.id = new.submission_id
      and s.learner_id = new.learner_id
  ) then
    raise exception 'Portfolio item submission must belong to the learner';
  end if;
  return new;
end;
$$;

-- Do not expose private portfolio data through a public SELECT path.
-- The existing RLS policy remains the authorization boundary.
comment on policy "Public portfolio items are readable" on public.portfolio_items
is 'Public items are readable only when unlinked or backed by a verified submission.';
