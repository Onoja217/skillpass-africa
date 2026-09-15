import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { reviewSubmission } from "@/app/reviews/actions";

type ReviewSubmission = {
  id: string;
  status: string;
  written_response: string | null;
  project_link: string | null;
  video_link: string | null;
  learner_id: string;
  assessments: { title: string } | null;
  profiles: { full_name: string; email: string } | null;
};

export default async function ReviewsPage() {
  const profile = await getCurrentProfile();
  if (!["mentor", "administrator"].includes(profile.role)) return <main className="shell" style={{ paddingBlock: 30 }}><h1>Review workspace</h1><p>You do not have permission to review submissions.</p></main>;
  const supabase = await createClient();
  const { data: rawSubmissions } = await supabase
    .from("submissions")
    .select("id,status,written_response,project_link,video_link,learner_id,assessments(title),profiles!submissions_learner_id_fkey(full_name,email)")
    .in("status", ["submitted", "under_review", "revision_requested"])
    .order("submitted_at", { ascending: true });
  const submissions = (rawSubmissions ?? []) as ReviewSubmission[];
  return <main className="shell" style={{ paddingBlock: 30, display: "grid", gap: 18 }}><section><p className="eyebrow">Verification</p><h1>Submission reviews</h1><p style={{ color: "var(--muted)" }}>Review learner evidence and record a verification decision.</p></section>{submissions.map((item) => <article className="card" style={{ padding: 22, display: "grid", gap: 10 }} key={item.id}><p className="eyebrow">{item.assessments?.title}</p><h2 style={{ margin: 0 }}>{item.profiles?.full_name}</h2><p>{item.written_response || "No written response."}</p>{item.project_link ? <a href={item.project_link} target="_blank" rel="noreferrer">Project link</a> : null}{item.video_link ? <a href={item.video_link} target="_blank" rel="noreferrer">Video link</a> : null}<p>Status: <strong>{item.status}</strong></p><form action={reviewSubmission} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><input type="hidden" name="submission_id" value={item.id} /><select name="status" defaultValue={item.status}><option value="under_review">Under review</option><option value="revision_requested">Revision requested</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select><button className="button" type="submit">Save review</button></form></article>)}{!submissions.length ? <div className="card" style={{ padding: 22 }}>No submissions are waiting for review.</div> : null}</main>;
}
