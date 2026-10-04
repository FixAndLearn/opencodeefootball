import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">E</span>
          <span className="text-lg font-bold tracking-tight">eFootballMarket</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
          <Link href="/search" className="hover:text-neutral-900">Browse</Link>
          <Link href="/seller/register" className="hover:text-neutral-900">Sell</Link>
          <Link href="/support" className="hover:text-neutral-900">Support</Link>
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/notifications" className="text-neutral-600 hover:text-neutral-900">Notifications</Link>
              <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-neutral-600 hover:text-neutral-900">Log in</Link>
              <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
