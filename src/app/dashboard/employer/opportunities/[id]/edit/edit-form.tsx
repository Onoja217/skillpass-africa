"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOpportunity } from "@/lib/opportunities";
import { opportunityTypes, workArrangements, type Opportunity } from "@/types/database";

export function EditForm({ opportunity }: { opportunity: Opportunity }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
    const skillsRaw = form.get("required_skills") as string;

    try {
      await updateOpportunity(opportunity.id, {
        title: form.get("title") as string,
        organization: form.get("organization") as string,
        description: form.get("description") as string,
        opportunity_type: form.get("opportunity_type") as any,
        required_skills: skillsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        location: (form.get("location") as string) || undefined,
        work_arrangement: form.get("work_arrangement") as any,
        application_deadline: (form.get("application_deadline") as string) || undefined,
        application_instructions: (form.get("application_instructions") as string) || undefined,
      });
      router.push("/dashboard/employer/opportunities");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <label>
          Title
          <input name="title" required minLength={3} maxLength={150} defaultValue={opportunity.title} className="input" />
        </label>

        <label>
          Organization
          <input name="organization" required minLength={2} maxLength={150} defaultValue={opportunity.organization} className="input" />
        </label>

        <label>
          Description
          <textarea name="description" required minLength={10} maxLength={3000} rows={5} defaultValue={opportunity.description} className="input" />
        </label>

        <label>
          Opportunity type
          <select name="opportunity_type" required defaultValue={opportunity.opportunity_type} className="input">
            {opportunityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          Required skills (comma-separated)
          <input name="required_skills" defaultValue={opportunity.required_skills.join(", ")} className="input" />
        </label>

        <label>
          Location
          <input name="location" defaultValue={opportunity.location ?? ""} className="input" />
        </label>

        <label>
          Work arrangement
          <select name="work_arrangement" required defaultValue={opportunity.work_arrangement} className="input">
            {workArrangements.map((arrangement) => (
              <option key={arrangement} value={arrangement}>{arrangement}</option>
            ))}
          </select>
        </label>

        <label>
          Application deadline
          <input name="application_deadline" type="date" defaultValue={opportunity.application_deadline ?? ""} className="input" />
        </label>

        <label>
          Application instructions
          <textarea name="application_instructions" rows={3} defaultValue={opportunity.application_instructions ?? ""} className="input" />
        </label>

        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}