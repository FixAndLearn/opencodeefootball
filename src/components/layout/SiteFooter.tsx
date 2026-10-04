import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-bold">eFootballMarket</p>
          <p className="mt-2 text-sm text-neutral-500">
            The trusted marketplace for eFootball accounts with escrow protection.
          </p>
        </div>
        <FooterCol title="Marketplace" links={[["Browse", "/search"], ["Sell an account", "/seller/register"], ["Favorites", "/favorites"]]} />
        <FooterCol title="Account" links={[["Dashboard", "/dashboard"], ["Orders", "/orders"], ["Settings", "/settings"]]} />
        <FooterCol title="Company" links={[["Support", "/support"], ["Login", "/login"], ["Register", "/register"]]} />
      </div>
      <p className="border-t border-neutral-200 py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} eFootballMarket. All rights reserved.
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-neutral-500">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="hover:text-neutral-900">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
