"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModerateButtons({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    await fetch(`/api/admin/listings/${listingId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: action === "reject" ? "Does not meet listing standards" : undefined }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button disabled={busy} onClick={() => act("approve")} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white disabled:opacity-60">
        Approve
      </button>
      <button disabled={busy} onClick={() => act("reject")} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-60">
        Reject
      </button>
    </div>
  );
}
