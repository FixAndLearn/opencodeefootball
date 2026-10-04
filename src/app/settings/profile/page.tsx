"use client";

import { useEffect, useState } from "react";

interface ProfileForm {
  first_name: string;
  last_name: string;
  bio: string;
  country_code: string;
  phone: string;
  language: string;
  timezone: string;
}

const EMPTY: ProfileForm = {
  first_name: "",
  last_name: "",
  bio: "",
  country_code: "",
  phone: "",
  language: "en",
  timezone: "Africa/Nairobi",
};

export default function EditProfilePage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.profile) setForm({ ...EMPTY, ...json.data.profile });
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setStatus(res.ok ? "Profile updated." : json.error?.message ?? "Update failed");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Edit profile</h1>
      <form onSubmit={submit} className="space-y-4">
        {status && <p className="rounded-lg bg-neutral-50 p-3 text-sm">{status}</p>}
        <Input label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
        <Input label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        <label className="block">
          <span className="text-sm font-medium">Bio</span>
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <Input label="Country code" value={form.country_code} onChange={(v) => setForm({ ...form, country_code: v })} />
        <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Input label="Language" value={form.language} onChange={(v) => setForm({ ...form, language: v })} />
        <Input label="Timezone" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} />
        <button
          disabled={busy}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />
    </label>
  );
}
