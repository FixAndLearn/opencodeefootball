"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: id }),
      });
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(json.error?.message ?? "Could not create order");
      else setOrderId(json.data.order.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function startPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-stk-push`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ order_id: orderId, phone }),
      },
    );
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error ?? "Payment initiation failed");
    else {
      setPaid(true);
      router.refresh();
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {paid ? (
        <p className="mt-6 rounded-lg bg-green-50 p-4 text-green-800">
          STK push sent. Approve the payment on your phone — your order status updates automatically.
        </p>
      ) : (
        <form onSubmit={startPayment} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">M-Pesa phone number</span>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2547XXXXXXXX"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <button
            disabled={busy || !orderId}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {busy ? "Sending STK push…" : "Pay with M-Pesa"}
          </button>
        </form>
      )}
    </main>
  );
}
