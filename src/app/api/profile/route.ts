import { createClient } from "@/lib/supabase/server";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api/respond";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name, bio, country_code, phone, language, timezone, marketing_opt_in")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return serverError();
    return ok({ profile: data });
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Update payload required");

    const allowed = [
      "first_name",
      "last_name",
      "bio",
      "country_code",
      "phone",
      "language",
      "timezone",
      "marketing_opt_in",
    ] as const;

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (Object.keys(update).length === 0) return badRequest("No updatable fields provided");

    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return serverError();
    return ok({ updated: Object.keys(update) });
  } catch {
    return serverError();
  }
}
