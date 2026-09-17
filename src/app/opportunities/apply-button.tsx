
"use client";

import { useState } from "react";
import { applyToOpportunity } from "@/lib/applications";

export function ApplyButton({
  opportunityId,
  alreadyApplied,
}: {
  opportunityId: string;
  alreadyApplied: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "applied">(
    alreadyApplied ? "applied" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setError(null);
    try {
      await applyToOpportunity(opportunityId);
      setStatus("applied");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  if (status === "applied") {
    return <span style={{ color: "var(--green)" }}>Applied ✓</span>;
  }

  return (
    <div>
      <button onClick={handleClick} disabled={status === "loading"} className="button">
        {status === "loading" ? "Applying..." : "Apply"}
      </button>
      {error && <p style={{ color: "#991b1b", fontSize: 14, marginTop: 4 }}>{error}</p>}
    </div>
  );
}