"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { SubmissionStatus } from "@/types/database";

const reviewStatuses: SubmissionStatus[] = ["under_review", "revision_requested", "verified", "rejected"];

export async function reviewSubmission(formData: FormData) {
  const profile = await getCurrentProfile();
  const canReview = profile.role === "administrator" || (profile.role === "mentor" && profile.mentor_status === "approved");
  if (!canReview) throw new Error("Only approved mentors and administrators can review submissions.");
  const id = String(formData.get("submission_id") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid submission.");
  if (!reviewStatuses.includes(rawStatus as SubmissionStatus)) throw new Error("Invalid review status.");
  const status = rawStatus as SubmissionStatus;
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id).in("status", ["submitted", "under_review", "revision_requested"]);
  if (error) throw new Error(error.message);
  revalidatePath("/reviews");
}
