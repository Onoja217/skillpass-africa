"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function reviewSubmission(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!["mentor", "administrator"].includes(profile.role)) throw new Error("Only mentors and administrators can review submissions.");
  const id = String(formData.get("submission_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["under_review", "revision_requested", "verified", "rejected"].includes(status)) throw new Error("Invalid review status.");
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/reviews");
}
