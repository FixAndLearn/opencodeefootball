import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

interface ListingRow {
  id: string;
  title: string;
  price_amount: number;
  currency: string;
  overall_strength: number | null;
  status: string;
}

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("listing_id, listings(id, title, price_amount, currency, overall_strength, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listings = (favorites ?? [])
    .map((f) => (Array.isArray(f.listings) ? f.listings[0] : f.listings) as ListingRow | null)
    .filter((l): l is ListingRow => Boolean(l) && (l as ListingRow).status === "published");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Favorites</h1>
      {listings.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <li key={l.id} className="rounded-xl border p-4">
              <Link href={`/listings/${l.id}`}>
                <h3 className="font-semibold">{l.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Overall {l.overall_strength ?? "—"} · {l.currency} {l.price_amount.toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">
          No favorites yet.
        </p>
      )}
    </main>
  );
}
