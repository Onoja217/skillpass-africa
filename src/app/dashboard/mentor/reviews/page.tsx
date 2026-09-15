import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MentorReviewsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: submissions, error } = await supabase
    .from("skill_submissions")
    .select("id, learner_id, skill_name, title, description, submitted_at")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load learner submissions.");
  }

  return (
    <main>
      <section>
        <p className="eyebrow">Mentor / Verifier</p>
        <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", letterSpacing: "-.045em", margin: "10px 0" }}>
          Learner reviews
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 17 }}>
          Review learner evidence before recording a verification decision.
        </p>
      </section>

      <section style={{ display: "grid", gap: 16, marginTop: 32 }}>
        {submissions?.length ? (
          submissions.map((submission) => (
            <article
              key={submission.id}
              className="card"
              style={{ padding: 24 }}
            >
              <p style={{ color: "var(--muted)", marginTop: 0 }}>
                Submitted by learner
              </p>

              <h2 style={{ marginBottom: 8 }}>
                {submission.title}
              </h2>

              <p>
                <strong>Skill:</strong> {submission.skill_name}
              </p>

              {submission.description && (
                <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  {submission.description}
                </p>
              )}

              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                Submitted:{" "}
                {new Date(submission.submitted_at).toLocaleString()}
              </p>

              <a
                className="button"
                href={`/dashboard/mentor/reviews/${submission.id}`}
                style={{ marginTop: 16 }}
              >
                Review submission
              </a>
            </article>
          ))
        ) : (
          <div className="card" style={{ padding: 24 }}>
            <p style={{ margin: 0 }}>
              No learner submissions are waiting for review.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
