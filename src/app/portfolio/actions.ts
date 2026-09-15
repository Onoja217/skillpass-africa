"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export async function savePortfolioItem(formData: FormData) {
  const profile = await getCurrentProfile();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const submissionId = String(formData.get("submission_id") ?? "").trim() || null;
  const isPublic = formData.get("is_public") === "on";
  if (title.length < 2) throw new Error("A portfolio title is required.");
  const supabase = await createClient();
  if (submissionId) {
    const { data } = await supabase.from("submissions").select("status").eq("id", submissionId).eq("learner_id", profile.id).single();
    if (!data) throw new Error("Submission not found.");
  }
  const { error } = await supabase.from("portfolio_items").insert({ learner_id: profile.id, submission_id: submissionId, title, description, is_public: isPublic });
  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}
