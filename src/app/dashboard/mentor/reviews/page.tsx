import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dashboardPath } from "@/lib/roles";

export default async function MentorReviewsPage() {
  const profile = await getCurrentProfile();

  if (profile.role !== "mentor" || profile.mentor_status !== "approved") {
    redirect(dashboardPath(profile.role));
  }

  const supabase = await createClient();
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("id, learner_id, assessment_id, status, submitted_at")
    .in("status", ["submitted", "under_review", "revision_requested"])
    .order("submitted_at", { ascending: false });

  if (error) throw new Error("Unable to load learner submissions.");

  const assessmentIds = [...new Set((submissions ?? []).map((submission) => submission.assessment_id))];
  const { data: assessments } = assessmentIds.length
    ? await supabase.from("assessments").select("id, title, skill_id").in("id", assessmentIds)
    : { data: [] };

  const assessmentMap = new Map((assessments ?? []).map((assessment) => [assessment.id, assessment]));

  return (
    <main>
      <section>
        <p className="eyebrow">Mentor / Verifier</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>Learner reviews</h1>
        <p style={{ color: "var(--muted)", fontSize: 17 }}>Review learner assessment evidence before recording a verification decision.</p>
      </section>

      <section style={{ display: "grid", gap: 16, marginTop: 32 }}>
        {submissions?.length ? submissions.map((submission) => {
          const assessment = assessmentMap.get(submission.assessment_id);
          return (
            <article key={submission.id} className="card" style={{ padding: 24 }}>
              <p style={{ color: "var(--muted)", marginTop: 0 }}>Learner submission</p>
              <h2 style={{ marginBottom: 8 }}>{assessment?.title ?? "Assessment submission"}</h2>
              <p><strong>Status:</strong> {submission.status}</p>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "Not submitted"}
              </p>
              <a className="button" href={`/dashboard/mentor/reviews/${submission.id}`} style={{ marginTop: 16 }}>Review submission</a>
            </article>
          );
        }) : (
          <div className="card" style={{ padding: 24 }}><p style={{ margin: 0 }}>No learner submissions are waiting for review.</p></div>
        )}
      </section>
    </main>
  );
}
