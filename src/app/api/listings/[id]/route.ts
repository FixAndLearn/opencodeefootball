import { createClient } from "@/lib/supabase/server";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/api/respond";
import { listingSchema } from "@/lib/validation/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("seller_id", user.id)
      .maybeSingle();

    if (error) return serverError();
    if (!data) return notFound("Listing not found");
    return ok({ listing: data });
  } catch {
    return serverError();
  }
}

export async function PATCH(
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

    const body = await request.json().catch(() => null);
    const parsed = listingSchema.partial().safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("listings")
      .update({ ...parsed.data, status: "pending_review" })
      .eq("id", id)
      .eq("seller_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return serverError();
    if (!data) return notFound("Listing not found");
    return ok({ id: data.id });
  } catch {
    return serverError();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("listings")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", id)
      .eq("seller_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return serverError();
    if (!data) return notFound("Listing not found");
    return ok({ archived: true });
  } catch {
    return serverError();
  }
}
