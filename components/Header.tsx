import Link from "next/link";
import { AmpelLogo } from "@/components/AmpelLogo";

const NAV = [
  { href: "/", label: "Karte" },
  { href: "/vergleich", label: "Vergleich" },
  { href: "/methodik", label: "Methodik" },
];

export function Header() {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Immoampel Startseite">
          <AmpelLogo />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold text-stone-600 sm:gap-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 transition-colors hover:bg-stone-100 hover:text-navy"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
