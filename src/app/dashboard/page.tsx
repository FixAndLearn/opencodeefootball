import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ count: ordersCount }, { count: listingsCount }, { count: unreadCount }] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Your orders" value={ordersCount ?? 0} />
        <Stat label="Your listings" value={listingsCount ?? 0} />
        <Stat label="Unread notifications" value={unreadCount ?? 0} />
      </div>

      <nav className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link href="/messages" className="rounded-lg border px-4 py-2">Messages</Link>
        <Link href="/orders" className="rounded-lg border px-4 py-2">Orders</Link>
        <Link href="/favorites" className="rounded-lg border px-4 py-2">Favorites</Link>
        <Link href="/seller/register" className="rounded-lg border px-4 py-2">Become a seller</Link>
        <Link href="/settings" className="rounded-lg border px-4 py-2">Settings</Link>
      </nav>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
