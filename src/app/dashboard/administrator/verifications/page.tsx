import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import VerificationManagementCenter from "./VerificationManagementCenter";

export default async function AdministratorVerificationsPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "administrator") redirect(`/dashboard/${profile.role}`);

  const supabase = await createClient();
  const { data: verifications, error } = await supabase
    .from("skill_verifications")
    .select("id, learner_id, mentor_id, decision, competency_rating, verified_at, public_verification_id, verification_status, submission_id")
    .order("verified_at", { ascending: false });

  if (error) throw new Error("Unable to load verifications.");

  const learnerIds = [...new Set((verifications ?? []).map((item) => item.learner_id))];
  const mentorIds = [...new Set((verifications ?? []).map((item) => item.mentor_id))];
  const submissionIds = [...new Set((verifications ?? []).map((item) => item.submission_id))];

  const [{ data: learners }, { data: mentors }, { data: submissions }] = await Promise.all([
    learnerIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", learnerIds) : Promise.resolve({ data: [] }),
    mentorIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", mentorIds) : Promise.resolve({ data: [] }),
    submissionIds.length ? supabase.from("submissions").select("id, assessment_id").in("id", submissionIds) : Promise.resolve({ data: [] }),
  ]);

  const assessmentIds = [...new Set((submissions ?? []).map((item) => item.assessment_id))];
  const { data: assessments } = assessmentIds.length
    ? await supabase.from("assessments").select("id, title, skill_id").in("id", assessmentIds)
    : { data: [] };
  const skillIds = [...new Set((assessments ?? []).map((item) => item.skill_id))];
  const { data: skills } = skillIds.length
    ? await supabase.from("skills").select("id, name").in("id", skillIds)
    : { data: [] };

  const verificationIds = (verifications ?? []).map((item) => item.id);
  const { data: auditLogs } = verificationIds.length
    ? await supabase.from("verification_audit_logs").select("id, verification_id, actor_id, action, comments, created_at").in("verification_id", verificationIds).order("created_at", { ascending: false })
    : { data: [] };
  const actorIds = [...new Set((auditLogs ?? []).map((item) => item.actor_id))];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };

  const learnerMap = new Map((learners ?? []).map((item) => [item.id, item]));
  const mentorMap = new Map((mentors ?? []).map((item) => [item.id, item]));
  const submissionMap = new Map((submissions ?? []).map((item) => [item.id, item]));
  const assessmentMap = new Map((assessments ?? []).map((item) => [item.id, item]));
  const skillMap = new Map((skills ?? []).map((item) => [item.id, item]));
  const actorMap = new Map((actors ?? []).map((item) => [item.id, item]));
  const auditMap = new Map<string, NonNullable<typeof auditLogs>>();

  for (const entry of auditLogs ?? []) {
    const entries = auditMap.get(entry.verification_id) ?? [];
    entries.push(entry);
    auditMap.set(entry.verification_id, entries);
  }

  const records = (verifications ?? []).map((verification) => {
    const learner = learnerMap.get(verification.learner_id);
    const mentor = mentorMap.get(verification.mentor_id);
    const submission = submissionMap.get(verification.submission_id);
    const assessment = submission ? assessmentMap.get(submission.assessment_id) : undefined;
    const skill = assessment ? skillMap.get(assessment.skill_id) : undefined;

    return {
      id: verification.id,
      public_verification_id: verification.public_verification_id,
      decision: verification.decision,
      verification_status: verification.verification_status,
      competency_rating: verification.competency_rating,
      verified_at: verification.verified_at,
      learner_name: learner?.full_name ?? "Unknown learner",
      learner_email: learner?.email ?? "",
      mentor_name: mentor?.full_name ?? "Unknown mentor",
      skill_name: skill?.name ?? "Unknown skill",
      assessment_title: assessment?.title ?? "Unknown assessment",
      audit: (auditMap.get(verification.id) ?? []).map((entry) => ({
        id: entry.id,
        action: entry.action,
        comments: entry.comments,
        actor_name: actorMap.get(entry.actor_id)?.full_name ?? "Unknown actor",
        created_at: entry.created_at,
      })),
    };
  });

  return (
    <main>
      <section>
        <p className="eyebrow">Administrator</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Verification Management Center</h1>
        <p style={{ color: "var(--muted)", fontSize: 17 }}>Search verification records, inspect their audit history, open public credentials, and manage verification status.</p>
      </section>
      <VerificationManagementCenter verifications={records} />
    </main>
  );
}
