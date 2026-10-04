"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/validation/schemas";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          username: values.username,
          country_code: values.country_code,
          phone: values.phone,
          marketing_opt_in: values.marketing_opt_in,
        },
      },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-neutral-600">
          We sent a verification link to your email address. Verify it to activate your account.
        </p>
        <Link href="/login" className="mt-6 inline-block text-brand-600">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </p>
        )}
        <label className="block">
          <span className="text-sm font-medium">First name</span>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" {...register("first_name")} />
          {errors.first_name && <p className="text-sm text-red-600">{errors.first_name.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Last name</span>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" {...register("last_name")} />
          {errors.last_name && <p className="text-sm text-red-600">{errors.last_name.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Username</span>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" {...register("username")} />
          {errors.username && <p className="text-sm text-red-600">{errors.username.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input type="email" className="mt-1 w-full rounded-lg border px-3 py-2" {...register("email")} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Country code (e.g. KE)</span>
          <input maxLength={2} className="mt-1 w-full rounded-lg border px-3 py-2 uppercase" {...register("country_code")} />
          {errors.country_code && <p className="text-sm text-red-600">{errors.country_code.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Phone number</span>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" {...register("phone")} />
          {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input type="password" className="mt-1 w-full rounded-lg border px-3 py-2" {...register("password")} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Confirm password</span>
          <input type="password" className="mt-1 w-full rounded-lg border px-3 py-2" {...register("confirm_password")} />
          {errors.confirm_password && <p className="text-sm text-red-600">{errors.confirm_password.message}</p>}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("accept_terms")} />
          I accept the Terms of Service and Privacy Policy
        </label>
        {errors.accept_terms && <p className="text-sm text-red-600">{errors.accept_terms.message}</p>}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("marketing_opt_in")} />
          Send me occasional marketplace updates
        </label>
        <button
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600">Log in</Link>
        </p>
      </form>
    </main>
  );
}
