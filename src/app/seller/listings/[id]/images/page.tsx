"use client";

import { use, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function ListingImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setStatus("Only JPEG, PNG and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("Image must be 10MB or smaller.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("Not signed in.");
      setBusy(false);
      return;
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("listings").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setStatus(uploadError.message);
      setBusy(false);
      return;
    }
    const res = await fetch(`/api/listings/${id}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage_path: path }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setStatus(json.error?.message ?? "Could not attach image");
    } else {
      setStatus("Image uploaded.");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Upload listing images</h1>
      {status && <p className="mb-4 rounded-lg bg-neutral-50 p-3 text-sm">{status}</p>}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
        className="block w-full text-sm"
      />
      <p className="mt-3 text-xs text-neutral-500">JPEG, PNG or WebP. Up to 10MB each.</p>
    </main>
  );
}
