"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type VerificationStatus = "active" | "revoked" | "suspended";

export async function updateVerificationStatus(
  verificationId: string,
  status: VerificationStatus,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  if (!["active", "revoked", "suspended"].includes(status)) throw new Error("Invalid verification status.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "administrator") throw new Error("Only administrators can change verification status.");

  const { error } = await supabase
    .from("skill_verifications")
    .update({ verification_status: status })
    .eq("id", verificationId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/administrator/verifications");
  return { success: true };
}
