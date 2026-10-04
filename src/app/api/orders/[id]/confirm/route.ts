import { createClient } from "@/lib/supabase/server";
import { ok, forbidden, notFound, conflict, unauthorized, serverError } from "@/lib/api/respond";

export async function POST(
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

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, listing_id, status, seller_net")
      .eq("id", id)
      .maybeSingle();

    if (!order) return notFound("Order not found");
    if (order.buyer_id !== user.id) return forbidden();
    if (order.status !== "seller_delivered" && order.status !== "buyer_reviewing") {
      return conflict("Nothing to confirm yet");
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({ status: "completed", completed_at: now })
      .eq("id", id);
    if (error) return serverError();

    const { data: escrow } = await supabase
      .from("escrow_accounts")
      .update({ status: "completed" })
      .eq("order_id", id)
      .select("id")
      .single();

    if (escrow) {
      await supabase.from("escrow_transactions").insert({
        escrow_id: escrow.id,
        kind: "release",
        amount: order.seller_net,
        currency: "KES",
        actor_id: user.id,
        note: "Funds released after buyer confirmation",
      });
      await supabase.from("escrow_status_history").insert({
        escrow_id: escrow.id,
        from_status: "seller_delivered",
        to_status: "completed",
        actor_id: user.id,
      });
    }

    await supabase.from("order_status_history").insert({
      order_id: id,
      from_status: order.status,
      to_status: "completed",
      actor_id: user.id,
      note: "Buyer confirmed delivery",
    });

    const { data: fullOrder } = await supabase
      .from("orders")
      .select("seller_id, order_number")
      .eq("id", id)
      .single();

    if (fullOrder) {
      await supabase.from("notifications").insert([
        {
          user_id: fullOrder.seller_id,
          type: "funds_released",
          title: "Funds released",
          body: `Order ${fullOrder.order_number} completed. Funds have been released to your balance.`,
          link: "/orders",
        },
        {
          user_id: user.id,
          type: "order_updated",
          title: "Order completed",
          body: `Order ${fullOrder.order_number} is complete. You can now leave a review.`,
          link: "/orders",
        },
      ]);
    }

    await supabase
      .from("listings")
      .update({ status: "sold", sold_at: now })
      .eq("id", order.listing_id);

    return ok({ completed_at: now });
  } catch {
    return serverError();
  }
}
