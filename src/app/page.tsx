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
    <main>
      <section className="border-b border-neutral-200 bg-gradient-to-b from-brand-950 to-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-5xl">
            Buy and sell eFootball accounts with total confidence.
          </h1>
          <p className="mt-4 max-w-xl text-brand-100">
            Every payment is held in escrow until the buyer confirms account access. M-Pesa supported. No scams, no fake listings.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/search" className="rounded-lg bg-white px-6 py-3 font-medium text-brand-900 hover:bg-brand-50">
              Browse listings
            </Link>
            <Link href="/seller/register" className="rounded-lg border border-white/30 px-6 py-3 font-medium text-white hover:bg-white/10">
              Start selling
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Latest listings</h2>
          <Link href="/search" className="text-sm text-brand-600">View all →</Link>
        </div>

        {listings && listings.length > 0 ? (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id} className="group rounded-2xl border border-neutral-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <Link href={`/listings/${l.id}`}>
                  <h3 className="font-semibold group-hover:text-brand-600">{l.title}</h3>
                  <p className="mt-1 text-sm text-neutral-500">Overall {l.overall_strength ?? "—"}</p>
                  <p className="mt-4 text-lg font-bold text-brand-700">
                    {l.currency} {l.price_amount.toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-16 text-center">
            <p className="text-lg font-medium">No listings available yet.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Be the first — publish a listing after your seller account is verified.
            </p>
            <Link href="/seller/register" className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 font-medium text-white">
              Become a seller
            </Link>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-6 text-xl font-semibold">How it works</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            ["1. List or browse", "Sellers publish verified listings with real screenshots and full account stats."],
            ["2. Pay with M-Pesa", "Buyers pay via STK push. Funds are locked in escrow, never sent directly."],
            ["3. Confirm & receive", "Seller delivers access. Buyer confirms. Escrow releases the seller's payout."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-neutral-200 p-6">
              <p className="font-semibold">{title}</p>
              <p className="mt-2 text-sm text-neutral-500">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
