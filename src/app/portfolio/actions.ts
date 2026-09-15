"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

function readPortfolioFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const submissionId = String(formData.get("submission_id") ?? "").trim() || null;
  const isPublic = formData.get("is_public") === "on";
  return { title, description, submissionId, isPublic };
}

async function validateSubmissionOwnership(submissionId: string | null, learnerId: string) {
  if (!submissionId) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("id,status")
    .eq("id", submissionId)
    .eq("learner_id", learnerId)
    .eq("status", "verified")
    .single();

  if (error || !data) throw new Error("Verified submission not found.");
}

export async function savePortfolioItem(formData: FormData) {
  const profile = await getCurrentProfile();
  const { title, description, submissionId, isPublic } = readPortfolioFields(formData);

  if (title.length < 2) throw new Error("A portfolio title is required.");
  if (title.length > 160) throw new Error("Portfolio title is too long.");
  if (description && description.length > 2000) throw new Error("Portfolio description is too long.");

  await validateSubmissionOwnership(submissionId, profile.id);

  const supabase = await createClient();
  const { error } = await supabase.from("portfolio_items").insert({
    learner_id: profile.id,
    submission_id: submissionId,
    title,
    description,
    is_public: isPublic,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}

export async function updatePortfolioItem(formData: FormData) {
  const profile = await getCurrentProfile();
  const id = String(formData.get("id") ?? "").trim();
  const { title, description, submissionId, isPublic } = readPortfolioFields(formData);

  if (!id) throw new Error("Portfolio item not found.");
  if (title.length < 2) throw new Error("A portfolio title is required.");
  if (title.length > 160) throw new Error("Portfolio title is too long.");
  if (description && description.length > 2000) throw new Error("Portfolio description is too long.");

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("portfolio_items")
    .select("id,submission_id")
    .eq("id", id)
    .eq("learner_id", profile.id)
    .single();

  if (existingError || !existing) throw new Error("Portfolio item not found.");

  await validateSubmissionOwnership(submissionId, profile.id);

  const { error } = await supabase
    .from("portfolio_items")
    .update({
      title,
      description,
      submission_id: submissionId,
      is_public: isPublic,
    })
    .eq("id", id)
    .eq("learner_id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}

export async function deletePortfolioItem(formData: FormData) {
  const profile = await getCurrentProfile();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Portfolio item not found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("learner_id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}
