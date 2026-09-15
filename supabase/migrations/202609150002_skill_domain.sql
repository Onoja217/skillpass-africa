create type public.submission_status as enum (
  'draft',
  'submitted',
  'under_review',
  'revision_requested',
  'verified',
  'rejected'
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  created_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  skill_id uuid not null references public.skills(id) on delete restrict,
  instructions text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  deadline timestamptz,
  criteria text not null,
  created_by_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  written_response text,
  project_link text,
  video_link text,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, learner_id)
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  file_path text not null check (char_length(file_path) <= 1000),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  created_at timestamptz not null default now()
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 2000),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_category_id_idx on public.skills(category_id);
create index assessments_skill_id_idx on public.assessments(skill_id);
create index assessments_created_by_id_idx on public.assessments(created_by_id);
create index submissions_learner_id_idx on public.submissions(learner_id);
create index submissions_assessment_id_idx on public.submissions(assessment_id);
create index submission_files_submission_id_idx on public.submission_files(submission_id);
create index portfolio_items_learner_id_idx on public.portfolio_items(learner_id);

create or replace function public.is_mentor_or_administrator()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('mentor', 'administrator'))
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.protect_learner_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_mentor_or_administrator() and auth.uid() = old.learner_id then
    if new.status not in ('draft', 'submitted') then
      raise exception 'Learners cannot set a reviewed submission status';
    end if;
    if old.status in ('under_review', 'revision_requested', 'verified', 'rejected') then
      raise exception 'Learners cannot modify a reviewed submission';
    end if;
    new.reviewed_at := old.reviewed_at;
  end if;
  return new;
end;
$$;

create trigger skills_touch_updated_at before update on public.skills
for each row execute procedure public.touch_updated_at();
create trigger assessments_touch_updated_at before update on public.assessments
for each row execute procedure public.touch_updated_at();
create trigger submissions_touch_updated_at before update on public.submissions
for each row execute procedure public.touch_updated_at();
create trigger submissions_protect_learner_fields before update on public.submissions
for each row execute procedure public.protect_learner_submission();
create trigger portfolio_items_touch_updated_at before update on public.portfolio_items
for each row execute procedure public.touch_updated_at();

alter table public.categories enable row level security;
alter table public.skills enable row level security;
alter table public.assessments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_files enable row level security;
alter table public.portfolio_items enable row level security;

create policy "Anyone can read categories" on public.categories for select using (true);
create policy "Anyone can read skills" on public.skills for select using (true);

create policy "Mentors and administrators can manage categories"
on public.categories for all to authenticated
using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());

create policy "Mentors and administrators can manage skills"
on public.skills for all to authenticated
using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());

create policy "Authenticated users can read assessments"
on public.assessments for select to authenticated using (true);

create policy "Mentors and administrators can create assessments"
on public.assessments for insert to authenticated
with check (public.is_mentor_or_administrator() and created_by_id = auth.uid());

create policy "Creators and administrators can update assessments"
on public.assessments for update to authenticated
using (created_by_id = auth.uid() or public.is_administrator())
with check (created_by_id = auth.uid() or public.is_administrator());

create policy "Administrators can delete assessments"
on public.assessments for delete to authenticated using (public.is_administrator());

create policy "Learners can manage their own submissions"
on public.submissions for all to authenticated
using (learner_id = auth.uid()) with check (learner_id = auth.uid());

create policy "Mentors and administrators can review submissions"
on public.submissions for select to authenticated using (public.is_mentor_or_administrator());

create policy "Mentors and administrators can update submissions"
on public.submissions for update to authenticated
using (public.is_mentor_or_administrator()) with check (public.is_mentor_or_administrator());

create policy "Learners can manage their submission files"
on public.submission_files for all to authenticated
using (exists (select 1 from public.submissions where submissions.id = submission_files.submission_id and submissions.learner_id = auth.uid()))
with check (exists (select 1 from public.submissions where submissions.id = submission_files.submission_id and submissions.learner_id = auth.uid()));

create policy "Mentors and administrators can review submission files"
on public.submission_files for select to authenticated using (public.is_mentor_or_administrator());

create policy "Learners can manage their portfolio"
on public.portfolio_items for all to authenticated
using (learner_id = auth.uid()) with check (learner_id = auth.uid());

create policy "Public portfolio items are readable"
on public.portfolio_items for select using (is_public = true);

create policy "Mentors and administrators can review portfolios"
on public.portfolio_items for select to authenticated using (public.is_mentor_or_administrator());

revoke all on table public.categories, public.skills, public.assessments, public.submissions, public.submission_files, public.portfolio_items from anon;
grant select on table public.categories, public.skills to authenticated;
grant select, insert, update, delete on table public.categories, public.skills to authenticated;
grant select, insert, update, delete on table public.assessments, public.submissions, public.submission_files, public.portfolio_items to authenticated;
grant execute on function public.is_mentor_or_administrator() to authenticated;

comment on table public.categories is 'Skill categories used by the SkillPass skills directory.';
comment on table public.skills is 'Practical skills that can be assessed and verified.';
comment on table public.assessments is 'Mentor-created practical assessments for skills.';
comment on table public.submissions is 'Learner assessment submissions and verification state.';
comment on table public.submission_files is 'Files attached to learner assessment submissions.';
comment on table public.portfolio_items is 'Learner portfolio entries, optionally backed by a verified submission.';
