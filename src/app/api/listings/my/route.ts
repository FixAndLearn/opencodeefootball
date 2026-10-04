import { createClient } from "@/lib/supabase/server";
import { ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("listings")
      .select("id, title, status, price_amount, currency, created_at")
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return serverError();
    return ok({ listings: data });
  } catch {
    return serverError();
  }
}
