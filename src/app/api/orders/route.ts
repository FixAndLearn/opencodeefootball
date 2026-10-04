import { createClient } from "@/lib/supabase/server";
import { ok, created, badRequest, unauthorized, conflict, serverError } from "@/lib/api/respond";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const listingId = body?.listing_id;
    if (typeof listingId !== "string" || !listingId) {
      return badRequest("listing_id is required");
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("id, seller_id, price_amount, currency, status")
      .eq("id", listingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!listing) return badRequest("Listing not found");
    if (listing.status !== "published") return conflict("Listing is not available for purchase");
    if (listing.seller_id === user.id) return badRequest("You cannot buy your own listing");

    const { data: sellerProfile } = await supabase
      .from("seller_profiles")
      .select("status")
      .eq("user_id", listing.seller_id)
      .maybeSingle();
    if (!sellerProfile) return conflict("Seller is not active");

    const platformFeePercent = 5;
    const platformFee = Math.round((listing.price_amount * platformFeePercent) / 100);
    const sellerNet = listing.price_amount - platformFee;

    const orderNumber = `EFM-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        amount_total: listing.price_amount,
        currency: listing.currency,
        platform_fee: platformFee,
        processing_fee: 0,
        seller_net: sellerNet,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return conflict("This listing already has an active order");
      return serverError();
    }

    await supabase.from("escrow_accounts").insert({
      order_id: order.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount: listing.price_amount,
      currency: listing.currency,
    });

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      to_status: "pending_payment",
      actor_id: user.id,
      note: "Order created",
    });

    await supabase.from("notifications").insert({
      user_id: listing.seller_id,
      type: "order_created",
      title: "New order received",
      body: `A buyer started an order for your listing. Order ${order.order_number}.`,
      link: `/orders`,
    });

    return created({ order });
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
      .from("orders")
      .select("id, order_number, status, amount_total, currency, created_at, listing_id")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return serverError();
    return ok({ orders: data });
  } catch {
    return serverError();
  }
}
