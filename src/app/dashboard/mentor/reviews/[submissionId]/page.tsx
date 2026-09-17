import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

type ReviewPageProps = {
  params: Promise<{ submissionId: string }>;
};

type EvidenceFile = {
  id: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
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

  const { data: evidenceFiles, error: evidenceError } = await supabase
    .from("submission_files")
    .select("id, file_path, original_filename, mime_type, file_size")
    .eq("submission_id", submission.id)
    .order("created_at", { ascending: true });

  if (evidenceError) throw new Error("Unable to load submission evidence.");

  const evidence = await Promise.all(
    ((evidenceFiles ?? []) as EvidenceFile[]).map(async (file) => {
      const { data, error } = await supabase.storage
        .from("submission-evidence")
        .createSignedUrl(file.file_path, 60 * 10);
      return error || !data?.signedUrl ? null : { ...file, signedUrl: data.signedUrl };
    }),
  );

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
        <div style={{ marginTop: 20 }}>
          <p style={{ color: "var(--muted)" }}>Uploaded evidence</p>
          {evidence.filter(Boolean).length ? (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {evidence.filter((file): file is EvidenceFile & { signedUrl: string } => Boolean(file)).map((file) => (
                <li key={file.id}>
                  <a href={file.signedUrl} target="_blank" rel="noreferrer">{file.original_filename}</a>
                  <small style={{ marginLeft: 8, color: "var(--muted)" }}>{Math.ceil(file.file_size / 1024)} KB · {file.mime_type}</small>
                </li>
              ))}
            </ul>
          ) : <p style={{ color: "var(--muted)" }}>No readable evidence files were uploaded.</p>}
        </div>
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
