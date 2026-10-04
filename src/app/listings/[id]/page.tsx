import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FavoriteButton } from "./FavoriteButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("title, description, price_amount, currency, overall_strength")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return { title: "Listing not found" };
  return {
    title: data.title,
    description: data.description.slice(0, 160),
    openGraph: {
      title: data.title,
      description: `${data.currency} ${data.price_amount.toLocaleString()} · Overall ${data.overall_strength ?? "—"}`,
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, platforms(name), seller_profiles(status, description)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!listing || listing.status !== "published") notFound();

  await supabase.rpc("increment_listing_counter", {
    p_listing_id: id,
    p_column: "views_count",
  });

  const { data: images } = await supabase
    .from("listing_images")
    .select("id, storage_path, sort_order")
    .eq("listing_id", id)
    .order("sort_order");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-brand-600">← Back to marketplace</Link>

      <h1 className="mt-4 text-3xl font-bold">{listing.title}</h1>
      <p className="mt-1 text-neutral-600">
        {listing.platforms?.name} · Overall {listing.overall_strength ?? "—"} · Division:{" "}
        {listing.current_division ?? "—"}
      </p>

      {images && images.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.map((img) => (
            <div key={img.id} className="relative aspect-video overflow-hidden rounded-xl border">
              <Image
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listings/${img.storage_path}`}
                alt={listing.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="GP" value={listing.gp_balance?.toLocaleString() ?? "—"} />
        <Stat label="Coins" value={listing.coin_balance?.toLocaleString() ?? "—"} />
        <Stat label="Epic players" value={listing.epic_players ?? "—"} />
        <Stat label="Big Time players" value={listing.big_time_players ?? "—"} />
      </dl>

      <p className="mt-6 whitespace-pre-line text-neutral-700">{listing.description}</p>

      <div className="mt-8 flex items-center justify-between rounded-xl border p-5">
        <p className="text-2xl font-bold">
          {listing.currency} {listing.price_amount.toLocaleString()}
        </p>
        <BuyButton listingId={listing.id} />
      </div>

      <div className="mt-4">
        <FavoriteButton listingId={listing.id} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function BuyButton({ listingId }: { listingId: string }) {
  return (
    <a
      href={`/checkout/${listingId}`}
      className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white"
    >
      Buy now
    </a>
  );
}
