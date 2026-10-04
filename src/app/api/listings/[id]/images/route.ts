import { createClient } from "@/lib/supabase/server";
import { ok, created, badRequest, unauthorized, forbidden, notFound, serverError } from "@/lib/api/respond";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data: listing } = await supabase
      .from("listings")
      .select("id, seller_id")
      .eq("id", id)
      .maybeSingle();
    if (!listing) return notFound("Listing not found");
    if (listing.seller_id !== user.id) return forbidden();

    const body = await request.json().catch(() => null);
    const storagePath = body?.storage_path;
    const sortOrder = Number.isInteger(body?.sort_order) ? body.sort_order : 0;
    if (typeof storagePath !== "string" || !storagePath) {
      return badRequest("storage_path is required");
    }

    const { data, error } = await supabase
      .from("listing_images")
      .insert({ listing_id: id, storage_path: storagePath, sort_order: sortOrder })
      .select("id")
      .single();

    if (error) return serverError();
    return created({ id: data.id });
  } catch {
    return serverError();
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("listing_images")
      .select("id, storage_path, sort_order, width, height")
      .eq("listing_id", id)
      .order("sort_order");

    if (error) return serverError();
    return ok({ images: data });
  } catch {
    return serverError();
  }
}
