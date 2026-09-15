"use server";

import { createClient } from "@/lib/supabase/server";

type VerificationDecision =
  | "approved"
  | "rejected"
  | "revision_requested";

export async function recordVerification(
  submissionId: string,
  decision: VerificationDecision,
  competencyRating: number,
  feedback: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in.");

  if (!["approved", "rejected", "revision_requested"].includes(decision)) {
    throw new Error("Invalid verification decision.");
  }

  if (!Number.isInteger(competencyRating) || competencyRating < 1 || competencyRating > 5) {
    throw new Error("Competency rating must be between 1 and 5.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, mentor_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "mentor" || profile.mentor_status !== "approved") {
    throw new Error("Only approved mentors can verify learner submissions.");
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, learner_id, status")
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission) throw new Error("Submission not found.");

  if (!["submitted", "under_review", "revision_requested"].includes(submission.status)) {
    throw new Error("This submission is not available for mentor verification.");
  }

  const { error: verificationError } = await supabase
    .from("skill_verifications")
    .insert({
      submission_id: submission.id,
      learner_id: submission.learner_id,
      mentor_id: user.id,
      decision,
      competency_rating: competencyRating,
      feedback: feedback.trim() || null,
    });

  if (verificationError) throw new Error(verificationError.message);

  const { error: submissionUpdateError } = await supabase
    .from("submissions")
    .update({
      status: decision === "approved" ? "verified" : decision,
      reviewer_id: user.id,
      review_notes: feedback.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submission.id);

  if (submissionUpdateError) throw new Error(submissionUpdateError.message);

  return { success: true };
}
