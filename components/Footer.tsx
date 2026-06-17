import Link from "next/link";
import { AmpelLogo } from "@/components/AmpelLogo";

export function Footer({ generatedAt }: { generatedAt?: string }) {
  return (
    <footer className="mt-auto bg-navy text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <AmpelLogo light />
            <p className="mt-3 max-w-md text-sm leading-relaxed">
              Standort-Ampel für Österreichs politische Bezirke – Investment,
              Lebensqualität und Zukunftsfestigkeit auf einen Blick.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/" className="hover:text-white">Ampel-Karte</Link>
            <Link href="/vergleich" className="hover:text-white">Bezirksvergleich</Link>
            <Link href="/methodik" className="hover:text-white">Methodik &amp; Quellen</Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">
          <p>
            Datenquellen: Statistik Austria, Umweltbundesamt, GeoSphere Austria u.&nbsp;a.
            (CC&nbsp;BY&nbsp;4.0).{" "}
            {generatedAt && <>Datenstand-Build: {generatedAt}. </>}
            Keine Gewähr für Richtigkeit; keine Anlageberatung.
          </p>
          <p className="mt-2 font-semibold text-white/80">powered by Immoampel</p>
        </div>
      </div>
    </footer>
  );
}
