"use client";

import { useState } from "react";

export function FavoriteButton({ listingId }: { listingId: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function toggle() {
    if (state === "saving") return;
    setState("saving");
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId }),
    });
    setState(res.ok ? "saved" : "idle");
  }

  return (
    <button
      onClick={toggle}
      disabled={state === "saving"}
      className="rounded-lg border px-4 py-2 text-sm disabled:opacity-60"
    >
      {state === "saved" ? "Saved to favorites" : "Save to favorites"}
    </button>
  );
}
