"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOpportunity } from "@/lib/opportunities";
import { opportunityTypes, workArrangements } from "@/types/database";

export default function NewOpportunityPage() {
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
      await createOpportunity({
        title: form.get("title") as string,
        organization: form.get("organization") as string,
        description: form.get("description") as string,
        opportunity_type: opportunityTypes.find((type) => type === form.get("opportunity_type")) ?? opportunityTypes[0],
        required_skills: skillsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        location: (form.get("location") as string) || undefined,
        work_arrangement: workArrangements.find((arrangement) => arrangement === form.get("work_arrangement")) ?? workArrangements[0],
        application_deadline: (form.get("application_deadline") as string) || undefined,
        application_instructions: (form.get("application_instructions") as string) || undefined,
      });
      router.push("/dashboard/employer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  } return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", marginBottom: 24 }}>
        Post a new opportunity
      </h1>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <label>
          Title
          <input name="title" required minLength={3} maxLength={150} className="input" />
        </label>

        <label>
          Organization
          <input name="organization" required minLength={2} maxLength={150} className="input" />
        </label>

        <label>
          Description
          <textarea name="description" required minLength={10} maxLength={3000} rows={5} className="input" />
        </label>

        <label>
          Opportunity type
          <select name="opportunity_type" required className="input">
            {opportunityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          Required skills (comma-separated)
          <input name="required_skills" placeholder="React, SQL, Figma" className="input" />
        </label>

        <label>
          Location
          <input name="location" className="input" />
        </label>

        <label>
          Work arrangement
          <select name="work_arrangement" required className="input">
            {workArrangements.map((arrangement) => (
              <option key={arrangement} value={arrangement}>{arrangement}</option>
            ))}
          </select>
        </label>

        <label>
          Application deadline
          <input name="application_deadline" type="date" className="input" />
        </label>

        <label>
          Application instructions
          <textarea name="application_instructions" rows={3} className="input" />
        </label>

        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit opportunity"}
        </button>
      </form>
    </div>
  );
}