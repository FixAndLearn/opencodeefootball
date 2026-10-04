"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderActions({
  orderId,
  role,
  status,
}: {
  orderId: string;
  role: "buyer" | "seller";
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(endpoint: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(endpoint, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(json.error?.message ?? "Action failed");
    else router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {role === "seller" && (status === "payment_received" || status === "waiting_seller") && (
        <button
          disabled={busy}
          onClick={() => call(`/api/orders/${orderId}/deliver`)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          Mark delivered
        </button>
      )}
      {role === "buyer" && (status === "seller_delivered" || status === "buyer_reviewing") && (
        <button
          disabled={busy}
          onClick={() => call(`/api/orders/${orderId}/confirm`)}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white"
        >
          Confirm delivery
        </button>
      )}
      {role === "buyer" && status === "completed" && (
        <a href={`/reviews/new/${orderId}`} className="rounded-lg border px-3 py-1.5 text-sm">
          Leave review
        </a>
      )}
      {role === "buyer" && ["payment_received", "waiting_seller", "seller_delivered", "buyer_reviewing"].includes(status) && (
        <a href={`/disputes/new/${orderId}`} className="rounded-lg border px-3 py-1.5 text-sm">
          Dispute
        </a>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
