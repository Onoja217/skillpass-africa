import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

type ReviewPageProps = {
  params: Promise<{ submissionId: string }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { submissionId } = await params;
  const supabase = await createClient();

  const { data: submission, error } = await supabase
    .from("submissions")
    .select("id, learner_id, assessment_id, written_response, project_link, video_link, status, submitted_at")
    .eq("id", submissionId)
    .single();

  if (error || !submission) notFound();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("title, criteria, instructions, skill_id")
    .eq("id", submission.assessment_id)
    .single();

  return (
    <main>
      <section>
        <p className="eyebrow">Mentor / Verifier</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>
          Review submission
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17 }}>
          Assess the learner&apos;s evidence before recording a verification decision.
        </p>
      </section>

      <section className="card" style={{ padding: 24, marginTop: 32 }}>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>Learner submission</p>
        <h2>{assessment?.title ?? "Assessment submission"}</h2>
        <p><strong>Status:</strong> {submission.status}</p>

        {assessment?.instructions && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: "var(--muted)" }}>Instructions</p>
            <p style={{ lineHeight: 1.6 }}>{assessment.instructions}</p>
          </div>
        )}

        {assessment?.criteria && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: "var(--muted)" }}>Assessment criteria</p>
            <p style={{ lineHeight: 1.6 }}>{assessment.criteria}</p>
          </div>
        )}

        {submission.written_response && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: "var(--muted)" }}>Written response</p>
            <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{submission.written_response}</p>
          </div>
        )}

        {submission.project_link && (
          <p style={{ marginTop: 20 }}><strong>Project:</strong> <a href={submission.project_link} target="_blank" rel="noreferrer">View project</a></p>
        )}
        {submission.video_link && (
          <p style={{ marginTop: 12 }}><strong>Video:</strong> <a href={submission.video_link} target="_blank" rel="noreferrer">View video</a></p>
        )}
        <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 24 }}>
          Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "Not submitted"}
        </p>
      </section>

      <section className="card" style={{ padding: 24, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Assessment</h2>
        <ReviewForm submissionId={submission.id} />
        <Link className="button" href="/dashboard/mentor/reviews" style={{ marginTop: 16 }}>
          Back to reviews
        </Link>
      </section>
    </main>
  );
}
