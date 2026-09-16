"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, UserRole } from "@/types/database";

const validRoles: UserRole[] = ["learner", "mentor", "employer", "administrator"];
const validStatuses: AccountStatus[] = ["active", "suspended"];

export async function updateUserAccess(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const accountStatus = String(formData.get("account_status") ?? "") as AccountStatus;
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId || !validRoles.includes(role) || !validStatuses.includes(accountStatus)) {
    throw new Error("Invalid user access settings.");
  }

  if (reason.length > 500) throw new Error("Reason must be 500 characters or fewer.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_update_user", {
    target_user_id: userId,
    new_role: role,
    new_account_status: accountStatus,
    change_reason: reason || null,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("User access update failed.");

  revalidatePath("/dashboard/administrator/users");
  revalidatePath("/dashboard/administrator/audit");
  revalidatePath("/dashboard/administrator");
}
