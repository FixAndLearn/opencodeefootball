import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderActions } from "./OrderActions";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, amount_total, currency, created_at, listing_id, buyer_id, seller_id, listings(title)")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>
      {orders && orders.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{o.order_number}</p>
                <p className="text-sm text-neutral-500">
                  {(o.listings as { title?: string } | null)?.title ?? "Listing"} · {o.status}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold">
                  {o.currency} {o.amount_total.toLocaleString()}
                </p>
                <OrderActions
                  orderId={o.id}
                  role={o.buyer_id === user.id ? "buyer" : "seller"}
                  status={o.status}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">
          No orders yet.
        </p>
      )}
      <Link href="/dashboard" className="mt-6 inline-block text-sm text-brand-600">← Back to dashboard</Link>
    </main>
  );
}
