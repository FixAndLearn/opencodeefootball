import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ModerateButtons } from "./ModerateButtons";

export default async function ModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: isAdmin }, { data: isModerator }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("is_moderator"),
  ]);
  if (!isAdmin && !isModerator) redirect("/dashboard");

  const { data: pending } = await supabase
    .from("listings")
    .select("id, title, price_amount, currency, created_at, seller_id")
    .eq("status", "pending_review")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Listing moderation</h1>
      {pending && pending.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {pending.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-neutral-500">
                  {l.currency} {l.price_amount.toLocaleString()} · submitted{" "}
                  {new Date(l.created_at).toLocaleDateString()}
                </p>
              </div>
              <ModerateButtons listingId={l.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-neutral-500">
          No listings awaiting review.
        </p>
      )}
    </main>
  );
}
