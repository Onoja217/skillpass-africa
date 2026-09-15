"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function submitAssessment(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile.role !== "learner") throw new Error("Only learners can submit assessments.");
  const supabase = await createClient();
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const submissionId = String(formData.get("submission_id") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const writtenResponse = String(formData.get("written_response") ?? "").trim() || null;
  const projectLink = String(formData.get("project_link") ?? "").trim() || null;
  const videoLink = String(formData.get("video_link") ?? "").trim() || null;
  const status = intent === "submit" ? "submitted" : "draft";
  const payload = { assessment_id: assessmentId, learner_id: profile.id, written_response: writtenResponse, project_link: projectLink, video_link: videoLink, status, ...(intent === "submit" ? { submitted_at: new Date().toISOString() } : {}) };
  const result = submissionId
    ? await supabase.from("submissions").update(payload).eq("id", submissionId).eq("learner_id", profile.id)
    : await supabase.from("submissions").insert(payload);
  if (result.error) throw new Error(result.error.message);
  revalidatePath(`/assessments/${assessmentId}`);
  redirect(`/assessments/${assessmentId}`);
}
