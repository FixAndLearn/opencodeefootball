import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    platform?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  }>;
}) {
  const { q = "", platform = "", minPrice = "", maxPrice = "", sort = "newest" } =
    await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select("id, title, price_amount, currency, overall_strength, created_at, views_count")
    .eq("status", "published")
    .is("deleted_at", null);

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (platform) query = query.eq("platform_id", platform);
  if (minPrice) query = query.gte("price_amount", Number(minPrice));
  if (maxPrice) query = query.lte("price_amount", Number(maxPrice));

  switch (sort) {
    case "price_asc":
      query = query.order("price_amount", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_amount", { ascending: false });
      break;
    case "most_viewed":
      query = query.order("views_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: results } = await query.limit(50);

  if (q) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("search_history").insert({
      user_id: user?.id ?? null,
      query: q,
      results_count: results?.length ?? 0,
    });
  }

  const { data: platforms } = await supabase.from("platforms").select("id, name");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Search listings</h1>

      <form className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5" method="get">
        <input name="q" defaultValue={q} placeholder="Search title or description" className="col-span-2 rounded-lg border px-3 py-2" />
        <select name="platform" defaultValue={platform} className="rounded-lg border px-3 py-2">
          <option value="">All platforms</option>
          {(platforms ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input name="minPrice" defaultValue={minPrice} type="number" placeholder="Min KES" className="rounded-lg border px-3 py-2" />
        <input name="maxPrice" defaultValue={maxPrice} type="number" placeholder="Max KES" className="rounded-lg border px-3 py-2" />
        <select name="sort" defaultValue={sort} className="rounded-lg border px-3 py-2">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="most_viewed">Most viewed</option>
        </select>
        <button className="col-span-2 rounded-lg bg-brand-600 px-4 py-2 text-white sm:col-span-1">Apply</button>
      </form>

      {results && results.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((l) => (
            <li key={l.id} className="rounded-xl border p-4">
              <Link href={`/listings/${l.id}`}>
                <h3 className="font-semibold">{l.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Overall {l.overall_strength ?? "—"} · KES {l.price_amount.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-neutral-400">{l.views_count} views</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">
          No listings found.
        </p>
      )}
    </main>
  );
}
