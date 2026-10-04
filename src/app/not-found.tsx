import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-neutral-600">The page you requested could not be found.</p>
      <Link href="/" className="mt-6 rounded-lg bg-brand-600 px-6 py-2 text-white">
        Back to marketplace
      </Link>
    </main>
  );
}
