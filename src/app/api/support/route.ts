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
    const message = String(body?.message ?? "").trim();
    if (message.length < 5) return badRequest("Please describe your issue in a few words");

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ kind: "support" })
      .select("id")
      .single();
    if (error) return serverError();

    await supabase.from("conversation_members").insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: "member",
    });

    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      kind: "text",
      body: message,
    });

    return created({ conversation_id: conversation.id });
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
      .from("conversations")
      .select("id, kind, created_at, conversation_members!inner(user_id)")
      .eq("kind", "support")
      .eq("conversation_members.user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError();
    return ok({ tickets: data });
  } catch {
    return serverError();
  }
}
