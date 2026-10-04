import { createClient } from "@/lib/supabase/server";
import { ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    let query = supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.is("read_at", null);

    const { data, error } = await query;
    if (error) return serverError();
    return ok({ notifications: data });
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
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) return ok({ updated: 0 });

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) return serverError();
    return ok({ updated: ids.length });
  } catch {
    return serverError();
  }
}
