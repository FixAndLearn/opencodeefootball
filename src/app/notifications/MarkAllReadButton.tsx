"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkAllReadButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    if (ids.length === 0) return;
    setBusy(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={markAll}
      disabled={busy || ids.length === 0}
      className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
    >
      {busy ? "Marking…" : "Mark all as read"}
    </button>
  );
}
