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
    const documentType = body?.document_type;
    const documentPath = body?.document_path;
    if (!documentType || !documentPath) {
      return badRequest("document_type and document_path are required");
    }

    let { data: seller } = await supabase
      .from("seller_profiles")
      .select("user_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seller) {
      const { data: createdSeller, error } = await supabase
        .from("seller_profiles")
        .insert({ user_id: user.id, status: "unverified", payout_method: "mpesa" })
        .select("user_id, status")
        .single();
      if (error) return serverError();
      seller = createdSeller;
    }

    const { data, error } = await supabase
      .from("seller_verification")
      .insert({
        seller_id: user.id,
        document_type: documentType,
        document_path: documentPath,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return serverError();

    await supabase
      .from("seller_profiles")
      .update({ status: "pending" })
      .eq("user_id", user.id);

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
      .from("seller_verification")
      .select("id, document_type, status, reviewer_notes, created_at")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError();
    return ok({ submissions: data });
  } catch {
    return serverError();
  }
}
