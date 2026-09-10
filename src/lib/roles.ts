import type { UserRole } from "@/types/database";

export const roleDetails: Record<UserRole, { label: string; description: string }> = {
  learner: { label: "Learner", description: "Build and share your verified skills passport." },
  mentor: { label: "Mentor / Verifier", description: "Review evidence and verify practical skills." },
  employer: { label: "Employer", description: "Discover credible, work-ready talent." },
  administrator: { label: "Administrator", description: "Manage access and platform integrity." },
};

export function dashboardPath(role: UserRole) {
  return `/dashboard/${role}`;
}
