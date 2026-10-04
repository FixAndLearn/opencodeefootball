import { createClient } from "@/lib/supabase/server";
import { ok, unauthorized, forbidden, badRequest, notFound, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return forbidden();

    const body = await request.json().catch(() => null);
    const targetId = body?.user_id;
    const action = body?.action;
    if (typeof targetId !== "string" || !targetId) return badRequest("user_id is required");
    if (action !== "suspend" && action !== "ban" && action !== "activate") {
      return badRequest("action must be suspend, ban or activate");
    }

    const status = action === "activate" ? "active" : action === "suspend" ? "suspended" : "banned";

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", targetId)
      .select("id, status")
      .maybeSingle();

    if (error) return serverError();
    if (!profile) return notFound("User not found");

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: `user_${action}`,
      target_type: "profile",
      target_id: targetId,
      new_value: { status },
    });

    await supabase.from("security_logs").insert({
      user_id: targetId,
      event: `account_${action}d`,
      severity: "warn",
      metadata: { by: user.id },
    });

    return ok({ id: profile.id, status: profile.status });
  } catch {
    return serverError();
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return forbidden();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    let query = supabase
      .from("profiles")
      .select("id, username, first_name, last_name, status, country_code, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (q) query = query.or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return serverError();
    return ok({ users: data });
  } catch {
    return serverError();
  }
}
