import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: activeListings },
    { count: pendingListings },
    { count: soldListings },
    { count: awaitingDelivery },
    { data: reviews },
    { data: completedOrders },
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "published"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "pending_review"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "sold"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", user.id).in("status", ["payment_received", "waiting_seller"]),
    supabase.from("reviews").select("rating").eq("seller_id", user.id),
    supabase.from("orders").select("seller_net").eq("seller_id", user.id).eq("status", "completed"),
  ]);

  const revenue = (completedOrders ?? []).reduce((sum, o) => sum + (o.seller_net ?? 0), 0);
  const avgRating =
    reviews && reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Seller dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Active listings" value={activeListings ?? 0} />
        <Stat label="Pending review" value={pendingListings ?? 0} />
        <Stat label="Sold listings" value={soldListings ?? 0} />
        <Stat label="Orders awaiting delivery" value={awaitingDelivery ?? 0} />
        <Stat label="Avg. rating" value={avgRating} />
        <Stat label="Completed revenue (KES)" value={revenue.toLocaleString()} />
      </div>
      <nav className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link href="/seller/listings/new" className="rounded-lg bg-brand-600 px-4 py-2 text-white">
          New listing
        </Link>
        <Link href="/seller/listings" className="rounded-lg border px-4 py-2">My listings</Link>
        <Link href="/seller/earnings" className="rounded-lg border px-4 py-2">Earnings</Link>
        <Link href="/orders" className="rounded-lg border px-4 py-2">Orders</Link>
        <Link href="/settings" className="rounded-lg border px-4 py-2">Settings</Link>
      </nav>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
