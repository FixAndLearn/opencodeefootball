import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, price_amount, currency, overall_strength, created_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold">eFootballMarket</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/login" className="text-brand-600">Log in</Link>
          <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-white">
            Sign up
          </Link>
        </nav>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Latest listings</h2>
        {listings && listings.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id} className="rounded-xl border p-4">
                <Link href={`/listings/${l.id}`}>
                  <h3 className="font-semibold">{l.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Overall {l.overall_strength ?? "—"} · KES {l.price_amount.toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center text-neutral-500">
            <p className="text-lg font-medium">No listings available yet.</p>
            <p className="mt-1 text-sm">
              Verified sellers can publish their first listing to get started.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
