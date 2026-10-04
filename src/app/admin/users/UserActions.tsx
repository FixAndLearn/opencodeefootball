"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserActions({ userId, currentStatus }: { userId: string; currentStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "suspend" | "ban" | "activate") {
    setBusy(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {currentStatus !== "active" && (
        <button disabled={busy} onClick={() => act("activate")} className="rounded-lg border px-3 py-1.5 text-sm">
          Activate
        </button>
      )}
      {currentStatus !== "suspended" && (
        <button disabled={busy} onClick={() => act("suspend")} className="rounded-lg border px-3 py-1.5 text-sm">
          Suspend
        </button>
      )}
      {currentStatus !== "banned" && (
        <button disabled={busy} onClick={() => act("ban")} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">
          Ban
        </button>
      )}
    </div>
  );
}
