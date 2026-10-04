import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: completed }, { data: withdrawals }, { data: pending }] = await Promise.all([
    supabase.from("orders").select("id, seller_net, completed_at").eq("seller_id", user.id).eq("status", "completed"),
    supabase.from("withdrawals").select("amount, status, created_at, payout_destination").eq("seller_id", user.id).order("created_at", { ascending: false }),
    supabase.from("orders").select("amount_total").eq("seller_id", user.id).in("status", ["payment_received", "waiting_seller", "seller_delivered", "buyer_reviewing"]),
  ]);

  const gross = (completed ?? []).reduce((s, o) => s + (o.seller_net ?? 0), 0);
  const withdrawn = (withdrawals ?? [])
    .filter((w) => w.status === "completed")
    .reduce((s, w) => s + w.amount, 0);
  const inEscrow = (pending ?? []).reduce((s, o) => s + (o.amount_total ?? 0), 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Earnings</h1>
        <a href="/seller/withdrawals/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">Request withdrawal</a>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Completed earnings (KES)" value={gross.toLocaleString()} />
        <Stat label="In escrow (KES)" value={inEscrow.toLocaleString()} />
        <Stat label="Withdrawn (KES)" value={withdrawn.toLocaleString()} />
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Withdrawal history</h2>
      {withdrawals && withdrawals.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {withdrawals.map((w, i) => (
            <li key={i} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">KES {w.amount.toLocaleString()}</p>
                <p className="text-sm text-neutral-500">{w.payout_destination} · {new Date(w.created_at).toLocaleDateString()}</p>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">{w.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">No withdrawals yet.</p>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
