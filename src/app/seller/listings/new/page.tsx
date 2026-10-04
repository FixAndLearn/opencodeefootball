"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { listingSchema, type ListingInput } from "@/lib/validation/schemas";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewListingPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListingInput>({
    resolver: zodResolver(listingSchema),
    defaultValues: { currency: "KES", transferable: true },
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/platforms?select=id,name`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
      .then((r) => r.json())
      .then(setPlatforms)
      .catch(() => setPlatforms([]));
  }, []);

  async function onSubmit(values: ListingInput) {
    setError(null);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Could not create listing");
      return;
    }
    router.push(`/listings/${json.data.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Create a listing</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Field label="Title" error={errors.title?.message}>
          <input className="input" {...register("title")} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea rows={5} className="input" {...register("description")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (KES)" error={errors.price_amount?.message}>
            <input type="number" className="input" {...register("price_amount", { valueAsNumber: true })} />
          </Field>
          <Field label="Platform" error={errors.platform_id?.message}>
            <select className="input" {...register("platform_id")}>
              <option value="">Select…</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Overall strength" error={errors.overall_strength?.message}>
            <input type="number" className="input" {...register("overall_strength", { valueAsNumber: true })} />
          </Field>
          <Field label="GP balance" error={errors.gp_balance?.message}>
            <input type="number" className="input" {...register("gp_balance", { valueAsNumber: true })} />
          </Field>
          <Field label="Coin balance" error={errors.coin_balance?.message}>
            <input type="number" className="input" {...register("coin_balance", { valueAsNumber: true })} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("transferable")} /> Account is transferable
        </label>
        <button disabled={isSubmitting} className="rounded-lg bg-brand-600 px-6 py-2 font-medium text-white disabled:opacity-60">
          {isSubmitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
      <style jsx>{`
        .input { width: 100%; border: 1px solid #d4d4d4; border-radius: 0.5rem; padding: 0.5rem 0.75rem; }
      `}</style>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </label>
  );
}
