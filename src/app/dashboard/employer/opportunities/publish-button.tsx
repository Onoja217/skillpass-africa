"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { togglePublish } from "@/lib/opportunities";

export function PublishButton({
  opportunityId,
  isPublished,
}: {
  opportunityId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      await togglePublish(opportunityId, !isPublished);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={isLoading} className="button">
      {isLoading ? "..." : isPublished ? "Unpublish" : "Publish"}
    </button>
  );
}