import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { submitAssessment } from "@/app/assessments/actions";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: assessment } = await supabase.from("assessments").select("id,title,instructions,difficulty,deadline,criteria,skills(name,categories(name))").eq("id", id).single();
  if (!assessment) notFound();
  const { data: submission } = await supabase.from("submissions").select("id,written_response,project_link,video_link,status").eq("assessment_id", id).eq("learner_id", profile.id).maybeSingle();
  return <main className="shell" style={{ paddingBlock: 30, display: "grid", gap: 20, maxWidth: 900 }}>
    <section><p className="eyebrow">{(assessment as any).skills?.categories?.name} · {(assessment as any).skills?.name}</p><h1>{assessment.title}</h1><p style={{ color: "var(--muted)" }}>Difficulty: {assessment.difficulty}{assessment.deadline ? ` · Deadline: ${new Date(assessment.deadline).toLocaleString()}` : ""}</p></section>
    <section className="card" style={{ padding: 24 }}><h2>Instructions</h2><p style={{ whiteSpace: "pre-wrap" }}>{assessment.instructions}</p><h3>Assessment criteria</h3><p style={{ whiteSpace: "pre-wrap" }}>{assessment.criteria}</p></section>
    {profile.role === "learner" ? <form action={submitAssessment} className="card" style={{ padding: 24, display: "grid", gap: 16 }}><input type="hidden" name="assessment_id" value={id} />{submission?.id ? <input type="hidden" name="submission_id" value={submission.id} /> : null}<div className="field"><label htmlFor="written_response">Written response</label><textarea id="written_response" name="written_response" rows={8} defaultValue={submission?.written_response ?? ""} /></div><div className="field"><label htmlFor="project_link">Project link</label><input id="project_link" name="project_link" type="url" defaultValue={submission?.project_link ?? ""} placeholder="https://..." /></div><div className="field"><label htmlFor="video_link">Video link</label><input id="video_link" name="video_link" type="url" defaultValue={submission?.video_link ?? ""} placeholder="https://..." /></div><p>Status: <strong>{submission?.status ?? "draft"}</strong></p><button className="button" name="intent" value="save">Save draft</button><button className="button secondary" name="intent" value="submit">Submit for review</button></form> : null}
  </main>;
}
