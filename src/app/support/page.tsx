"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError(json.error?.message ?? "Could not open a support ticket");
    else router.push("/messages");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Contact support</h1>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="block">
          <span className="text-sm font-medium">How can we help?</span>
          <textarea
            required
            minLength={5}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <button disabled={busy} className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {busy ? "Sending…" : "Open support ticket"}
        </button>
      </form>
    </main>
  );
}
