import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MarkAllReadButton } from "./MarkAllReadButton";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, created_at, read_at")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <MarkAllReadButton ids={(notifications ?? []).filter((n) => !n.read_at).map((n) => n.id)} />
      </div>
      {notifications && notifications.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {notifications.map((n) => (
            <li key={n.id} className={`p-4 ${n.read_at ? "bg-white" : "bg-brand-50"}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-neutral-600">{n.body}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">
          No notifications.
        </p>
      )}
    </main>
  );
}
