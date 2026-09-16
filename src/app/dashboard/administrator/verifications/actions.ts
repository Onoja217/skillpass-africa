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

  const { data: permitted, error: permissionError } = await supabase.rpc("has_admin_permission", {
    required_permission: "verifications.review",
  });
  if (permissionError || !permitted) throw new Error("You do not have permission to manage verification records.");

  const { error } = await supabase
    .from("skill_verifications")
    .update({ verification_status: status })
    .eq("id", verificationId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/administrator/verifications");
  revalidatePath("/dashboard/administrator");
  return { success: true };
}
