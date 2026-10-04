"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewReviewPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, rating, title, body }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(json.error?.message ?? "Could not submit review");
    else router.push("/orders");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Review your purchase</h1>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="block">
          <span className="text-sm font-medium">Rating</span>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-3 py-2">
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Review</span>
          <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {busy ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </main>
  );
}
