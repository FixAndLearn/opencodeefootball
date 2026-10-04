import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, username, country_code, phone, bio, language, timezone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Account settings</h1>
      <dl className="divide-y rounded-xl border">
        <Row label="Name" value={`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "—"} />
        <Row label="Username" value={profile?.username ?? "—"} />
        <Row label="Email" value={user.email ?? "—"} />
        <Row label="Country" value={profile?.country_code ?? "—"} />
        <Row label="Phone" value={profile?.phone ?? "—"} />
        <Row label="Language" value={profile?.language ?? "en"} />
        <Row label="Timezone" value={profile?.timezone ?? "—"} />
      </dl>
      <p className="mt-4 text-sm text-neutral-500">
        Profile editing, password change, and data export are available from the account section.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
