-- Align the applied Issue #17 Supabase schema with the Next.js application field names.
-- This migration is intentionally idempotent so it can be safely applied to the
-- existing skill-domain tables created by 202609150005_skill_domain_reconciliation.sql.

begin;

-- Assessments: created_by is exposed to the application as created_by_id.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assessments' and column_name = 'created_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'assessments' and column_name = 'created_by_id'
  ) then
    alter table public.assessments rename column created_by to created_by_id;
  end if;
end
$$;

-- Submissions: align response/link column names with the application.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'response'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'written_response'
  ) then
    alter table public.submissions rename column response to written_response;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'project_url'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'project_link'
  ) then
    alter table public.submissions rename column project_url to project_link;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'video_url'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'video_link'
  ) then
    alter table public.submissions rename column video_url to video_link;
  end if;
end
$$;

-- Submission evidence: align storage metadata names with the application.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submission_files' and column_name = 'storage_path'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submission_files' and column_name = 'file_path'
  ) then
    alter table public.submission_files rename column storage_path to file_path;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submission_files' and column_name = 'file_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submission_files' and column_name = 'original_filename'
  ) then
    alter table public.submission_files rename column file_name to original_filename;
  end if;
end
$$;

-- The application already knows the learner from the authenticated profile, so
-- make the existing required metadata column self-populating for evidence rows.
alter table public.submission_files
  alter column learner_id set default auth.uid();

commit;
