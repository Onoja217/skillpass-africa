create or replace function public.get_admin_reports(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  report jsonb;
begin
  if not public.has_admin_permission('reports.view') then
    raise exception 'Reports access required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'overview', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'learners', (select count(*) from public.profiles where role = 'learner'),
      'mentors', (select count(*) from public.profiles where role = 'mentor'),
      'employers', (select count(*) from public.profiles where role = 'employer'),
      'administrators', (select count(*) from public.profiles where role = 'administrator'),
      'active_users', (select count(*) from public.profiles where account_status = 'active'),
      'suspended_users', (select count(*) from public.profiles where account_status = 'suspended'),
      'skills', (select count(*) from public.skills),
      'assessments', (select count(*) from public.assessments),
      'submissions', (select count(*) from public.submissions),
      'verified_skills', (select count(*) from public.skill_verifications where decision = 'approved' and verification_status = 'active'),
      'opportunities', (select count(*) from public.opportunities),
      'applications', (select count(*) from public.applications)
    ),
    'period_activity', jsonb_build_object(
      'new_users', (select count(*) from public.profiles where created_at >= p_from and created_at < p_to),
      'assessments_created', (select count(*) from public.assessments where created_at >= p_from and created_at < p_to),
      'submissions_created', (select count(*) from public.submissions where created_at >= p_from and created_at < p_to),
      'verifications_created', (select count(*) from public.skill_verifications where verified_at >= p_from and verified_at < p_to),
      'opportunities_created', (select count(*) from public.opportunities where created_at >= p_from and created_at < p_to),
      'applications_created', (select count(*) from public.applications where created_at >= p_from and created_at < p_to)
    ),
    'verification', jsonb_build_object(
      'approved', (select count(*) from public.skill_verifications where decision = 'approved' and verified_at >= p_from and verified_at < p_to),
      'rejected', (select count(*) from public.skill_verifications where decision = 'rejected' and verified_at >= p_from and verified_at < p_to),
      'revision_requested', (select count(*) from public.skill_verifications where decision = 'revision_requested' and verified_at >= p_from and verified_at < p_to),
      'active', (select count(*) from public.skill_verifications where verification_status = 'active' and verified_at >= p_from and verified_at < p_to),
      'suspended', (select count(*) from public.skill_verifications where verification_status = 'suspended' and verified_at >= p_from and verified_at < p_to),
      'revoked', (select count(*) from public.skill_verifications where verification_status = 'revoked' and verified_at >= p_from and verified_at < p_to),
      'average_rating', (select coalesce(round(avg(competency_rating)::numeric, 2), 0) from public.skill_verifications where competency_rating is not null and verified_at >= p_from and verified_at < p_to)
    ),
    'submissions', jsonb_build_object(
      'draft', (select count(*) from public.submissions where status = 'draft' and created_at >= p_from and created_at < p_to),
      'submitted', (select count(*) from public.submissions where status = 'submitted' and created_at >= p_from and created_at < p_to),
      'under_review', (select count(*) from public.submissions where status = 'under_review' and created_at >= p_from and created_at < p_to),
      'revision_requested', (select count(*) from public.submissions where status = 'revision_requested' and created_at >= p_from and created_at < p_to),
      'verified', (select count(*) from public.submissions where status = 'verified' and created_at >= p_from and created_at < p_to),
      'rejected', (select count(*) from public.submissions where status = 'rejected' and created_at >= p_from and created_at < p_to)
    ),
    'opportunities', jsonb_build_object(
      'total', (select count(*) from public.opportunities where created_at >= p_from and created_at < p_to),
      'published', (select count(*) from public.opportunities where is_published = true and created_at >= p_from and created_at < p_to),
      'jobs', (select count(*) from public.opportunities where opportunity_type = 'job' and created_at >= p_from and created_at < p_to),
      'internships', (select count(*) from public.opportunities where opportunity_type = 'internship' and created_at >= p_from and created_at < p_to),
      'apprenticeships', (select count(*) from public.opportunities where opportunity_type = 'apprenticeship' and created_at >= p_from and created_at < p_to),
      'volunteer', (select count(*) from public.opportunities where opportunity_type = 'volunteer' and created_at >= p_from and created_at < p_to)
    ),
    'applications', jsonb_build_object(
      'total', (select count(*) from public.applications where created_at >= p_from and created_at < p_to),
      'submitted', (select count(*) from public.applications where status = 'submitted' and created_at >= p_from and created_at < p_to),
      'reviewed', (select count(*) from public.applications where status = 'reviewed' and created_at >= p_from and created_at < p_to),
      'shortlisted', (select count(*) from public.applications where status = 'shortlisted' and created_at >= p_from and created_at < p_to),
      'rejected', (select count(*) from public.applications where status = 'rejected' and created_at >= p_from and created_at < p_to),
      'accepted', (select count(*) from public.applications where status = 'accepted' and created_at >= p_from and created_at < p_to),
      'acceptance_rate', (select coalesce(round((count(*) filter (where status = 'accepted')::numeric / nullif(count(*), 0)) * 100, 2), 0) from public.applications where created_at >= p_from and created_at < p_to)
    ),
    'learner_outcomes', jsonb_build_object(
      'learners_with_submissions', (select count(distinct learner_id) from public.submissions where created_at >= p_from and created_at < p_to),
      'learners_verified', (select count(distinct learner_id) from public.skill_verifications where decision = 'approved' and verification_status = 'active' and verified_at >= p_from and verified_at < p_to),
      'learners_with_applications', (select count(distinct learner_id) from public.applications where created_at >= p_from and created_at < p_to),
      'learners_accepted', (select count(distinct learner_id) from public.applications where status = 'accepted' and created_at >= p_from and created_at < p_to),
      'verified_to_application_rate', (select coalesce(round((count(distinct a.learner_id)::numeric / nullif(count(distinct v.learner_id), 0)) * 100, 2), 0) from public.skill_verifications v left join public.applications a on a.learner_id = v.learner_id and a.created_at >= p_from and a.created_at < p_to where v.decision = 'approved' and v.verification_status = 'active' and v.verified_at >= p_from and v.verified_at < p_to)
    ),
    'mentor_activity', jsonb_build_object(
      'active_mentors', (select count(distinct mentor_id) from public.skill_verifications where verified_at >= p_from and verified_at < p_to),
      'reviews_recorded', (select count(*) from public.skill_verifications where verified_at >= p_from and verified_at < p_to),
      'approved_reviews', (select count(*) from public.skill_verifications where decision = 'approved' and verified_at >= p_from and verified_at < p_to),
      'average_rating', (select coalesce(round(avg(competency_rating)::numeric, 2), 0) from public.skill_verifications where competency_rating is not null and verified_at >= p_from and verified_at < p_to)
    ),
    'employer_activity', jsonb_build_object(
      'active_employers', (select count(distinct employer_id) from public.opportunities where created_at >= p_from and created_at < p_to),
      'opportunities_created', (select count(*) from public.opportunities where created_at >= p_from and created_at < p_to),
      'published_opportunities', (select count(*) from public.opportunities where is_published = true and created_at >= p_from and created_at < p_to),
      'applications_received', (select count(*) from public.applications a join public.opportunities o on o.id = a.opportunity_id where a.created_at >= p_from and a.created_at < p_to and o.created_at >= p_from and o.created_at < p_to)
    ),
    'skills_by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category', category_name, 'skills', skill_count, 'assessments', assessment_count) order by category_name)
      from (
        select c.name as category_name, count(distinct s.id) as skill_count, count(distinct a.id) as assessment_count
        from public.categories c
        left join public.skills s on s.category_id = c.id
        left join public.assessments a on a.skill_id = s.id
        group by c.id, c.name
      ) grouped_categories
    ), '[]'::jsonb),
    'user_roles', coalesce((select jsonb_object_agg(role::text, role_count) from (select role, count(*) as role_count from public.profiles group by role order by role) grouped_roles), '{}'::jsonb),
    'application_trend', coalesce((select jsonb_agg(jsonb_build_object('date', day::date, 'count', count) order by day) from (select date_trunc('day', created_at) as day, count(*) as count from public.applications where created_at >= p_from and created_at < p_to group by 1) daily_applications), '[]'::jsonb),
    'user_trend', coalesce((select jsonb_agg(jsonb_build_object('date', day::date, 'count', count) order by day) from (select date_trunc('day', created_at) as day, count(*) as count from public.profiles where created_at >= p_from and created_at < p_to group by 1) daily_users), '[]'::jsonb),
    'verification_trend', coalesce((select jsonb_agg(jsonb_build_object('date', day::date, 'count', count) order by day) from (select date_trunc('day', verified_at) as day, count(*) as count from public.skill_verifications where verified_at >= p_from and verified_at < p_to group by 1) daily_verifications), '[]'::jsonb),
    'submission_trend', coalesce((select jsonb_agg(jsonb_build_object('date', day::date, 'count', count) order by day) from (select date_trunc('day', created_at) as day, count(*) as count from public.submissions where created_at >= p_from and created_at < p_to group by 1) daily_submissions), '[]'::jsonb),
    'recent_admin_activity', coalesce((select jsonb_agg(jsonb_build_object('action', action, 'description', description, 'created_at', created_at) order by created_at desc) from (select action, description, created_at from public.audit_logs where created_at >= p_from and created_at < p_to order by created_at desc limit 8), '[]'::jsonb)
  ) into report;

  return report;
end;
$$;

revoke all on function public.get_admin_reports(timestamptz, timestamptz) from public;
grant execute on function public.get_admin_reports(timestamptz, timestamptz) to authenticated;

comment on function public.get_admin_reports(timestamptz, timestamptz) is 'Returns administrator reporting aggregates only when the caller has reports.view.';
