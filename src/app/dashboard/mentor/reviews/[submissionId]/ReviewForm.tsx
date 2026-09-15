"use client";

import { useState, useTransition } from "react";
import { recordVerification } from "./actions";

type ReviewFormProps = {
  submissionId: string;
};

export default function ReviewForm({
  submissionId,
}: ReviewFormProps) {
  const [decision, setDecision] = useState<
    "approved" | "rejected" | "revision_requested"
  >("approved");
  const [rating, setRating] = useState("5");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    startTransition(async () => {
      try {
        await recordVerification(
          submissionId,
          decision,
          Number(rating),
          feedback,
        );

        setMessage("Verification recorded successfully.");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to record verification.",
        );
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "grid", gap: 20 }}
    >
      <div>
        <label
          htmlFor="decision"
          style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
        >
          Decision
        </label>

        <select
          id="decision"
          value={decision}
          onChange={(event) =>
            setDecision(
              event.target.value as
                | "approved"
                | "rejected"
                | "revision_requested",
            )
          }
          style={{ width: "100%", padding: 12 }}
        >
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
          <option value="revision_requested">
            Request revision
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor="rating"
          style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
        >
          Competency rating
        </label>

        <select
          id="rating"
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          style={{ width: "100%", padding: 12 }}
        >
          <option value="1">1 / 5</option>
          <option value="2">2 / 5</option>
          <option value="3">3 / 5</option>
          <option value="4">4 / 5</option>
          <option value="5">5 / 5</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="feedback"
          style={{ display: "block", marginBottom: 8, fontWeight: 600 }}
        >
          Feedback
        </label>

        <textarea
          id="feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Enter your assessment feedback..."
          rows={6}
          maxLength={2000}
          style={{ width: "100%", padding: 12, resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        className="button"
        disabled={isPending}
      >
        {isPending ? "Recording..." : "Record verification"}
      </button>

      {message && (
        <p style={{ color: "var(--muted)" }}>
          {message}
        </p>
      )}
    </form>
  );
}
