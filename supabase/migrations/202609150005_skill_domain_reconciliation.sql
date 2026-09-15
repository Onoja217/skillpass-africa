-- Reconcile the Issue #17 skill domain with the existing Supabase foundation.
-- The existing public.user_role and public.profiles objects are intentionally preserved.
-- This migration is safe to apply after the foundation migration was already applied manually.

begin;

-- The existing public.user_role enum already matches the application roles.
-- Do not recreate or alter it here.

-- Issue #17 submission lifecycle.
do $$
begin
  if to_regtype('public.submission_status') is null then
    create type public.submission_status as enum (
      'draft',
      'submitted',
      'under_review',
      'revision_requested',
      'verified',
      'rejected'
    );
  end if;
end
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 200),
  instructions text not null,
  criteria text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  response text,
  project_url text,
  video_url text,
  status public.submission_status not null default 'draft',
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, learner_id)
);

create table if not exists public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  project_url text,
  image_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skills_category_id_idx
  on public.skills(category_id);

create index if not exists assessments_skill_id_idx
  on public.assessments(skill_id);

create index if not exists assessments_created_by_idx
  on public.assessments(created_by);

create index if not exists submissions_assessment_id_idx
  on public.submissions(assessment_id);

create index if not exists submissions_learner_id_idx
  on public.submissions(learner_id);

create index if not exists submissions_status_idx
  on public.submissions(status);

create index if not exists submission_files_submission_id_idx
  on public.submission_files(submission_id);

create index if not exists submission_files_learner_id_idx
  on public.submission_files(learner_id);

create index if not exists portfolio_items_learner_id_idx
  on public.portfolio_items(learner_id);

create index if not exists portfolio_items_submission_id_idx
  on public.portfolio_items(submission_id);

create or replace function public.is_mentor_or_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('mentor'::public.user_role, 'administrator'::public.user_role)
  );
$$;

grant execute on function public.is_mentor_or_administrator() to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_learner_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.learner_id <> old.learner_id then
    raise exception 'learner_id cannot be changed';
  end if;

  if old.learner_id <> auth.uid() and not public.is_mentor_or_administrator() then
    raise exception 'not allowed to modify another learner submission';
  end if;

  if old.status not in ('draft', 'submitted')
     and not public.is_mentor_or_administrator() then
    raise exception 'submission is no longer editable';
  end if;

  return new;
end;
$$;

create or replace function public.validate_portfolio_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.submission_id is not null then
    if not exists (
      select 1
      from public.submissions s
      where s.id = new.submission_id
        and s.learner_id = new.learner_id
        and s.status = 'verified'
    ) then
      raise exception 'portfolio item must reference a verified submission owned by the learner';
    end if;
  end if;
  return new;
end;
$$;

-- Triggers are created conditionally so repeated application remains safe.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.assessments'::regclass
      and tgname = 'assessments_touch_updated_at'
  ) then
    create trigger assessments_touch_updated_at
      before update on public.assessments
      for each row execute function public.touch_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.submissions'::regclass
      and tgname = 'submissions_touch_updated_at'
  ) then
    create trigger submissions_touch_updated_at
      before update on public.submissions
      for each row execute function public.touch_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.submissions'::regclass
      and tgname = 'submissions_protect_learner'
  ) then
    create trigger submissions_protect_learner
      before update on public.submissions
      for each row execute function public.protect_learner_submission();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.portfolio_items'::regclass
      and tgname = 'portfolio_items_validate_submission'
  ) then
    create trigger portfolio_items_validate_submission
      before insert or update on public.portfolio_items
      for each row execute function public.validate_portfolio_submission();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.portfolio_items'::regclass
      and tgname = 'portfolio_items_touch_updated_at'
  ) then
    create trigger portfolio_items_touch_updated_at
      before update on public.portfolio_items
      for each row execute function public.touch_updated_at();
  end if;
end
$$;

-- RLS is additive and does not remove existing collaborator policies.
alter table public.categories enable row level security;
alter table public.skills enable row level security;
alter table public.assessments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;
alter table public.portfolio_items enable row level security;

-- Categories and skills are catalogue data. Public/authenticated reads are safe.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Anyone can read categories') then
    create policy "Anyone can read categories" on public.categories for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='skills' and policyname='Anyone can read skills') then
    create policy "Anyone can read skills" on public.skills for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='Mentors and administrators manage categories') then
    create policy "Mentors and administrators manage categories" on public.categories for all using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='skills' and policyname='Mentors and administrators manage skills') then
    create policy "Mentors and administrators manage skills" on public.skills for all using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());
  end if;
end
$$;

-- Assessments are readable to authenticated users; only mentors/admins create/manage them.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessments' and policyname='Authenticated users can read assessments') then
    create policy "Authenticated users can read assessments" on public.assessments for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessments' and policyname='Mentors and administrators create assessments') then
    create policy "Mentors and administrators create assessments" on public.assessments for insert to authenticated with check (public.is_mentor_or_administrator() and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessments' and policyname='Mentors and administrators update assessments') then
    create policy "Mentors and administrators update assessments" on public.assessments for update to authenticated using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assessments' and policyname='Mentors and administrators delete assessments') then
    create policy "Mentors and administrators delete assessments" on public.assessments for delete to authenticated using (public.is_mentor_or_administrator());
  end if;
end
$$;

-- Learners own their submissions; mentors/admins can review them.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submissions' and policyname='Learners can read own submissions') then
    create policy "Learners can read own submissions" on public.submissions for select to authenticated using (learner_id = auth.uid() or public.is_mentor_or_administrator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submissions' and policyname='Learners can create own submissions') then
    create policy "Learners can create own submissions" on public.submissions for insert to authenticated with check (learner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submissions' and policyname='Learners can update draft submissions') then
    create policy "Learners can update draft submissions" on public.submissions for update to authenticated using (learner_id = auth.uid() and status in ('draft','submitted')) with check (learner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submissions' and policyname='Learners can delete draft submissions') then
    create policy "Learners can delete draft submissions" on public.submissions for delete to authenticated using (learner_id = auth.uid() and status = 'draft');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submissions' and policyname='Mentors and administrators review submissions') then
    create policy "Mentors and administrators review submissions" on public.submissions for update to authenticated using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());
  end if;
end
$$;

-- Submission evidence metadata is private to the learner and authorized reviewers.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submission_files' and policyname='Learners can manage own submission files') then
    create policy "Learners can manage own submission files" on public.submission_files for all to authenticated using (learner_id = auth.uid()) with check (learner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='submission_files' and policyname='Mentors and administrators read submission files') then
    create policy "Mentors and administrators read submission files" on public.submission_files for select to authenticated using (public.is_mentor_or_administrator());
  end if;
end
$$;

-- Learners manage their own portfolio. Public reads are restricted to public + verified linked submissions.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='portfolio_items' and policyname='Learners manage own portfolio') then
    create policy "Learners manage own portfolio" on public.portfolio_items for all to authenticated using (learner_id = auth.uid()) with check (learner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='portfolio_items' and policyname='Mentors and administrators review portfolio') then
    create policy "Mentors and administrators review portfolio" on public.portfolio_items for select to authenticated using (public.is_mentor_or_administrator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='portfolio_items' and policyname='Public portfolio items are readable') then
    create policy "Public portfolio items are readable" on public.portfolio_items for select using (
      is_public = true
      and (
        submission_id is null
        or exists (
          select 1 from public.submissions s
          where s.id = portfolio_items.submission_id
            and s.status = 'verified'
        )
      )
    );
  end if;
end
$$;

-- Grant application access. RLS remains the authorization boundary.
grant select on public.categories, public.skills to anon, authenticated;
grant select, insert, update, delete on public.categories, public.skills to authenticated;
grant select on public.assessments to authenticated;
grant insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.submissions to authenticated;
grant select, insert, update, delete on public.submission_files to authenticated;
grant select, insert, update, delete on public.portfolio_items to authenticated;

-- Private evidence bucket. Existing bucket/policies are preserved if already present.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-evidence',
  'submission-evidence',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Learners upload own submission evidence') then
    create policy "Learners upload own submission evidence" on storage.objects for insert to authenticated with check (
      bucket_id = 'submission-evidence'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Learners read own submission evidence') then
    create policy "Learners read own submission evidence" on storage.objects for select to authenticated using (
      bucket_id = 'submission-evidence'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Learners delete own submission evidence') then
    create policy "Learners delete own submission evidence" on storage.objects for delete to authenticated using (
      bucket_id = 'submission-evidence'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Mentors and administrators read submission evidence') then
    create policy "Mentors and administrators read submission evidence" on storage.objects for select to authenticated using (
      bucket_id = 'submission-evidence'
      and public.is_mentor_or_administrator()
    );
  end if;
end
$$;

commit;
