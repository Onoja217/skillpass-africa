"use client";

import { useState, useTransition } from "react";
import { updateVerificationStatus } from "./actions";

type VerificationStatus = "active" | "revoked" | "suspended";

export default function VerificationStatusForm({ verificationId, currentStatus }: { verificationId: string; currentStatus: VerificationStatus }) {
  const [status, setStatus] = useState<VerificationStatus>(currentStatus);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        await updateVerificationStatus(verificationId, status);
        setMessage("Verification status updated.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to update verification status.");
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
      <select value={status} onChange={(event) => setStatus(event.target.value as VerificationStatus)} style={{ padding: 10 }}>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="revoked">Revoked</option>
      </select>
      <button type="button" className="button" onClick={save} disabled={isPending}>
        {isPending ? "Saving..." : "Save status"}
      </button>
      {message && <span style={{ color: "var(--muted)" }}>{message}</span>}
    </div>
  );
}
