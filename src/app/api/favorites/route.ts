import { createClient } from "@/lib/supabase/server";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const listingId = body?.listing_id;
    if (typeof listingId !== "string" || !listingId) return badRequest("listing_id is required");

    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: user.id, listing_id: listingId });
    if (error && error.code !== "23505") return serverError();
    if (!error) {
      await supabase.rpc("increment_listing_counter", {
        p_listing_id: listingId,
        p_column: "favorites_count",
      });
    }
    return ok({ saved: true });
  } catch {
    return serverError();
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listing_id");
    if (!listingId) return badRequest("listing_id is required");

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    if (error) return serverError();
    return ok({ saved: false });
  } catch {
    return serverError();
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("favorites")
      .select("listing_id, created_at, listings(id, title, price_amount, currency, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError();
    return ok({ favorites: data });
  } catch {
    return serverError();
  }
}
