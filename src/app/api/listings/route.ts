import { createClient } from "@/lib/supabase/server";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { listingSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data: seller } = await supabase
      .from("seller_profiles")
      .select("user_id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!seller) return forbidden("Become a seller before creating listings");

    const json = await request.json().catch(() => null);
    const parsed = listingSchema.safeParse(json);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { data, error } = await supabase
      .from("listings")
      .insert({ ...parsed.data, seller_id: user.id, status: "pending_review" })
      .select("id")
      .single();

    if (error) return serverError();
    return created({ id: data.id });
  } catch {
    return serverError();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const platform = searchParams.get("platform");
    const minPrice = Number(searchParams.get("minPrice") ?? 0) || null;
    const maxPrice = Number(searchParams.get("maxPrice") ?? 0) || null;
    const sort = searchParams.get("sort") ?? "newest";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

    const supabase = await createClient();
    let query = supabase
      .from("listings")
      .select("id, title, price_amount, currency, overall_strength, platform_id, created_at, seller_id")
      .eq("status", "published")
      .is("deleted_at", null);

    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (platform) query = query.eq("platform_id", platform);
    if (minPrice !== null) query = query.gte("price_amount", minPrice);
    if (maxPrice !== null) query = query.lte("price_amount", maxPrice);

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

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);

    if (error) return serverError();
    return ok({ listings: data, page, pageSize, total: count ?? data?.length ?? 0 });
  } catch {
    return serverError();
  }
}
