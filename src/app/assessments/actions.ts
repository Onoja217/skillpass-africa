"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { SubmissionStatus } from "@/types/database";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const maxFileSize = 10 * 1024 * 1024;

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
  const status: SubmissionStatus = intent === "submit" ? "submitted" : "draft";
  const payload = { assessment_id: assessmentId, learner_id: profile.id, written_response: writtenResponse, project_link: projectLink, video_link: videoLink, status, ...(intent === "submit" ? { submitted_at: new Date().toISOString() } : {}) };

  let savedId = submissionId;
  if (submissionId) {
    const result = await supabase.from("submissions").update(payload).eq("id", submissionId).eq("learner_id", profile.id);
    if (result.error) throw new Error(result.error.message);
  } else {
    const result = await supabase.from("submissions").insert(payload).select("id").single();
    if (result.error) throw new Error(result.error.message);
    savedId = result.data.id;
  }

  const files = formData.getAll("evidence").filter((item): item is File => item instanceof File && item.size > 0);
  for (const file of files) {
    if (file.size > maxFileSize || !allowedTypes.has(file.type)) throw new Error("Evidence file type or size is not allowed.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${profile.id}/${savedId}/${crypto.randomUUID()}-${safeName}`;
    const upload = await supabase.storage.from("submission-evidence").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    const record = await supabase.from("submission_files").insert({
      submission_id: savedId,
      file_path: path,
      original_filename: file.name,
      mime_type: file.type,
      file_size: file.size,
    });
    if (record.error) {
      await supabase.storage.from("submission-evidence").remove([path]);
      throw new Error(record.error.message);
    }
  }

  revalidatePath(`/assessments/${assessmentId}`);
  redirect(`/assessments/${assessmentId}`);
}
