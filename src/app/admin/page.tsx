import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/dashboard");

  const [
    { count: userCount },
    { count: listingCount },
    { count: orderCount },
    { count: openDisputes },
    { count: pendingWithdrawals },
    { count: pendingVerifications },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("seller_verification").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Admin control center</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Users" value={userCount ?? 0} />
        <Stat label="Listings" value={listingCount ?? 0} />
        <Stat label="Orders" value={orderCount ?? 0} />
        <Stat label="Open disputes" value={openDisputes ?? 0} />
        <Stat label="Pending withdrawals" value={pendingWithdrawals ?? 0} />
        <Stat label="Pending verifications" value={pendingVerifications ?? 0} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
