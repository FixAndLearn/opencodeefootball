import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, status, price_amount, currency, views_count, created_at")
    .eq("seller_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Link href="/seller/listings/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">
          New listing
        </Link>
      </div>
      {listings && listings.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {listings.map((l) => (
            <li key={l.id} className="flex items-center justify-between p-4">
              <div>
                <Link href={`/listings/${l.id}`} className="font-medium hover:underline">
                  {l.title}
                </Link>
                <p className="text-sm text-neutral-500">
                  {l.status} · {l.views_count} views · {new Date(l.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold">
                  {l.currency} {l.price_amount.toLocaleString()}
                </p>
                <Link href={`/seller/listings/${l.id}/images`} className="rounded-lg border px-3 py-1.5 text-sm">
                  Images
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">
          No listings yet. Create your first listing to start selling.
        </p>
      )}
    </main>
  );
}
