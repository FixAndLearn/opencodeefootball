"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWithdrawalPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), payout_destination: destination }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(json.error?.message ?? "Withdrawal request failed");
    else {
      setNotice(`Withdrawal requested. Remaining available: KES ${json.data?.available?.toLocaleString?.() ?? "0"}`);
      setAmount("");
      setDestination("");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Request withdrawal</h1>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        <label className="block">
          <span className="text-sm font-medium">Amount (KES)</span>
          <input
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">M-Pesa payout number</span>
          <input
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="2547XXXXXXXX"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {busy ? "Requesting…" : "Request withdrawal"}
        </button>
      </form>
    </main>
  );
}
