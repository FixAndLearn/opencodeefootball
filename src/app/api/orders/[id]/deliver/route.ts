import { createClient } from "@/lib/supabase/server";
import { ok, badRequest, forbidden, notFound, conflict, unauthorized, serverError } from "@/lib/api/respond";

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

    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return badRequest("Delivery payload required");
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, seller_id, status")
      .eq("id", id)
      .maybeSingle();

    if (!order) return notFound("Order not found");
    if (order.seller_id !== user.id) return forbidden();
    if (order.status !== "payment_received" && order.status !== "waiting_seller") {
      return conflict("Order is not awaiting delivery");
    }

    const deliveredAt = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "seller_delivered",
        delivery_payload: body,
        delivered_at: deliveredAt,
      })
      .eq("id", id);

    if (error) return serverError();

    await supabase
      .from("escrow_accounts")
      .update({ status: "seller_delivered" })
      .eq("order_id", id);

    await supabase.from("order_status_history").insert({
      order_id: id,
      from_status: order.status,
      to_status: "seller_delivered",
      actor_id: user.id,
      note: "Seller submitted account delivery",
    });

    return ok({ delivered_at: deliveredAt });
  } catch {
    return serverError();
  }
}
