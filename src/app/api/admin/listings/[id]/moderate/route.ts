import { createClient } from "@/lib/supabase/server";
import { unauthorized, forbidden, notFound, ok, badRequest, serverError } from "@/lib/api/respond";

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

    const { data: isAdmin } = await supabase.rpc("is_admin");
    const { data: isModerator } = await supabase.rpc("is_moderator");
    if (!isAdmin && !isModerator) return forbidden();

    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (action !== "approve" && action !== "reject") {
      return badRequest("action must be 'approve' or 'reject'");
    }

    const update =
      action === "approve"
        ? { status: "published", published_at: new Date().toISOString(), rejection_reason: null }
        : { status: "rejected", rejection_reason: String(body?.reason ?? "Rejected by moderation") };

    const { data, error } = await supabase
      .from("listings")
      .update(update)
      .eq("id", id)
      .select("id, status")
      .maybeSingle();

    if (error) return serverError();
    if (!data) return notFound("Listing not found");

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: `listing_${action}`,
      target_type: "listing",
      target_id: id,
      new_value: update,
    });

    return ok({ id: data.id, status: data.status });
  } catch {
    return serverError();
  }
}
