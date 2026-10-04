import { createClient } from "@/lib/supabase/server";
import { ok, created, badRequest, unauthorized, forbidden, conflict, serverError } from "@/lib/api/respond";

const REASONS = new Set([
  "incorrect_account", "wrong_details", "account_recovered", "missing_players",
  "fake_screenshots", "unauthorized_changes", "other",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const orderId = body?.order_id;
    const reason = body?.reason;
    const description = String(body?.description ?? "");

    if (typeof orderId !== "string" || !orderId) return badRequest("order_id is required");
    if (!REASONS.has(reason)) return badRequest("Invalid reason");
    if (description.length < 20) return badRequest("Description must be at least 20 characters");

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, seller_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return badRequest("Order not found");
    if (order.buyer_id !== user.id) return forbidden();
    if (!["payment_received", "waiting_seller", "seller_delivered", "buyer_reviewing"].includes(order.status)) {
      return conflict("This order cannot be disputed in its current state");
    }

    const { data, error } = await supabase
      .from("disputes")
      .insert({
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        reason,
        description,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return conflict("A dispute already exists for this order");
      return serverError();
    }

    await supabase.from("orders").update({ status: "disputed" }).eq("id", order.id);
    await supabase.from("escrow_accounts").update({ status: "disputed" }).eq("order_id", order.id);

    await supabase.from("notifications").insert({
      user_id: order.seller_id,
      type: "order_updated",
      title: "Dispute opened",
      body: `A buyer opened a dispute on order ${order.id}. Reason: ${reason}.`,
      link: "/orders",
    });

    return created({ id: data.id });
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
      .from("disputes")
      .select("id, order_id, reason, status, created_at")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) return serverError();
    return ok({ disputes: data });
  } catch {
    return serverError();
  }
}
