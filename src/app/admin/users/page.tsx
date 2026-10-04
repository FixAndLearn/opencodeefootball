import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserActions } from "./UserActions";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/dashboard");

  const { data: users } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, status, country_code, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">User management</h1>
      {users && users.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{u.first_name} {u.last_name}</p>
                <p className="text-sm text-neutral-500">
                  @{u.username} · {u.country_code ?? "—"} · {u.status} · joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <UserActions userId={u.id} currentStatus={u.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">No users found.</p>
      )}
    </main>
  );
}
