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
    const description = String(body?.description ?? "");
    if (description.length < 20) {
      return badRequest("Description must be at least 20 characters");
    }

    const { data: existing } = await supabase
      .from("seller_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return conflict("Seller profile already exists");

    const { error } = await supabase
      .from("seller_profiles")
      .insert({ user_id: user.id, description, payout_method: "mpesa" });

    if (error) return serverError();
    return created({ status: "unverified" });
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
      .from("seller_profiles")
      .select("user_id, description, status, payout_method, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return serverError();
    return ok({ seller: data });
  } catch {
    return serverError();
  }
}
