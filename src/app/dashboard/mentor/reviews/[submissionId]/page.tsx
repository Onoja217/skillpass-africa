import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

type ReviewPageProps = {
  params: Promise<{
    submissionId: string;
  }>;
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { submissionId } = await params;

  const supabase = await createClient();

  const { data: submission, error } = await supabase
    .from("skill_submissions")
    .select(
      "id, learner_id, skill_name, title, description, evidence_url, submitted_at",
    )
    .eq("id", submissionId)
    .single();

  if (error || !submission) {
    notFound();
  }

  return (
    <main>
      <section>
        <p className="eyebrow">Mentor / Verifier</p>

        <h1
          style={{
            fontSize: "clamp(2rem,5vw,3.5rem)",
            letterSpacing: "-.045em",
            margin: "10px 0",
          }}
        >
          Review submission
        </h1>

        <p style={{ color: "var(--muted)", fontSize: 17 }}>
          Assess the learner&apos;s evidence before recording a verification
          decision.
        </p>
      </section>

      <section className="card" style={{ padding: 24, marginTop: 32 }}>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Learner submission
        </p>

        <h2>{submission.title}</h2>

        <p>
          <strong>Skill:</strong> {submission.skill_name}
        </p>

        {submission.description && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: "var(--muted)" }}>Description</p>
            <p style={{ lineHeight: 1.6 }}>{submission.description}</p>
          </div>
        )}

        {submission.evidence_url && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: "var(--muted)" }}>Evidence</p>
            <a
              href={submission.evidence_url}
              target="_blank"
              rel="noreferrer"
            >
              View learner evidence
            </a>
          </div>
        )}

        <p
          style={{
            color: "var(--muted)",
            fontSize: 14,
            marginTop: 24,
          }}
        >
          Submitted: {new Date(submission.submitted_at).toLocaleString()}
        </p>
      </section>

      <section className="card" style={{ padding: 24, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Assessment</h2>

        <ReviewForm submissionId={submission.id} />

        <Link
          className="button"
          href="/dashboard/mentor/reviews"
          style={{ marginTop: 16 }}
        >
          Back to reviews
        </Link>
      </section>
    </main>
  );
}
