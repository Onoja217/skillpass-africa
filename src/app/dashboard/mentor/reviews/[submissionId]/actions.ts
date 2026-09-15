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

  if (!user) {
    throw new Error("You must be signed in.");
  }

  if (
    !["approved", "rejected", "revision_requested"].includes(
      decision,
    )
  ) {
    throw new Error("Invalid verification decision.");
  }

  if (
    !Number.isInteger(competencyRating) ||
    competencyRating < 1 ||
    competencyRating > 5
  ) {
    throw new Error("Competency rating must be between 1 and 5.");
  }

  const { data: submission, error: submissionError } =
    await supabase
      .from("skill_submissions")
      .select("id, learner_id")
      .eq("id", submissionId)
      .single();

  if (submissionError || !submission) {
    throw new Error("Submission not found.");
  }

  const { error } = await supabase
    .from("skill_verifications")
    .insert({
      submission_id: submission.id,
      learner_id: submission.learner_id,
      mentor_id: user.id,
      decision,
      competency_rating: competencyRating,
      feedback: feedback.trim() || null,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
  };
}
