import { createClient } from "@/lib/supabase/server";
import { ok, created, badRequest, unauthorized, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    const amount = Number(body?.amount);
    const payoutDestination = String(body?.payout_destination ?? "");
    if (!Number.isInteger(amount) || amount <= 0) {
      return badRequest("amount must be a positive integer");
    }
    if (!payoutDestination) return badRequest("payout_destination is required");

    const { data: completed } = await supabase
      .from("orders")
      .select("seller_net")
      .eq("seller_id", user.id)
      .eq("status", "completed");
    const gross = (completed ?? []).reduce((s, o) => s + (o.seller_net ?? 0), 0);

    const { data: paid } = await supabase
      .from("withdrawals")
      .select("amount")
      .eq("seller_id", user.id)
      .in("status", ["pending", "approved", "processing", "completed"]);
    const withdrawn = (paid ?? []).reduce((s, w) => s + w.amount, 0);

    const available = gross - withdrawn;
    if (amount > available) {
      return badRequest(`Insufficient withdrawable balance. Available: KES ${available}`);
    }

    const { data, error } = await supabase
      .from("withdrawals")
      .insert({
        seller_id: user.id,
        amount,
        currency: "KES",
        payout_method: "mpesa",
        payout_destination: payoutDestination,
      })
      .select("id")
      .single();

    if (error) return serverError();
    return created({ id: data.id, available: available - amount });
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
      .from("withdrawals")
      .select("id, amount, currency, status, payout_destination, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError();
    return ok({ withdrawals: data });
  } catch {
    return serverError();
  }
}
