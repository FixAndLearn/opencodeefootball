"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  ["incorrect_account", "Incorrect account"],
  ["wrong_details", "Wrong details"],
  ["account_recovered", "Account recovered by seller"],
  ["missing_players", "Missing players"],
  ["fake_screenshots", "Fake screenshots"],
  ["unauthorized_changes", "Unauthorized changes"],
  ["other", "Other"],
] as const;

export default function NewDisputePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();
  const [reason, setReason] = useState<string>(REASONS[0][0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, reason, description }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error?.message ?? "Could not open dispute");
    else router.push(`/orders`);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Open a dispute</h1>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="block">
          <span className="text-sm font-medium">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
            {REASONS.map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea required minLength={20} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {busy ? "Submitting…" : "Submit dispute"}
        </button>
      </form>
    </main>
  );
}
