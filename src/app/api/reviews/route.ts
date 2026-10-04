import { createClient } from "@/lib/supabase/server";
import { ok, created, badRequest, unauthorized, conflict, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const orderId = body?.order_id;
    const rating = Number(body?.rating);
    const title = typeof body?.title === "string" ? body.title : null;
    const reviewBody = typeof body?.body === "string" ? body.body : null;

    if (typeof orderId !== "string" || !orderId) return badRequest("order_id is required");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return badRequest("rating must be an integer between 1 and 5");
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, buyer_id, seller_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return badRequest("Order not found");
    if (order.buyer_id !== user.id) return badRequest("Order not found");
    if (order.status !== "completed") return conflict("Order must be completed before review");

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        order_id: order.id,
        reviewer_id: user.id,
        seller_id: order.seller_id,
        rating,
        title,
        body: reviewBody,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return conflict("You already reviewed this order");
      return serverError();
    }

    await supabase.from("notifications").insert({
      user_id: order.seller_id,
      type: "review_received",
      title: "New review received",
      body: `A buyer left you a ${rating}-star review.`,
      link: "/seller/dashboard",
    });

    return created({ id: data.id });
  } catch {
    return serverError();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("seller_id");
    if (!sellerId) return badRequest("seller_id is required");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, rating, title, body, created_at")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return serverError();
    return ok({ reviews: data });
  } catch {
    return serverError();
  }
}
