/** Ampel-Motiv (3 Lichter) + Wortmarke – durchgängiges Branding. */
export function AmpelLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex flex-col gap-[3px] rounded-[4px] bg-navy p-[3px]">
        <span className="ampel-dot" style={{ background: "#dc2626" }} />
        <span className="ampel-dot" style={{ background: "#d97706" }} />
        <span className="ampel-dot" style={{ background: "#16a34a" }} />
      </span>
      <span
        className={`font-serif text-xl font-extrabold tracking-tight ${
          light ? "text-white" : "text-navy"
        }`}
      >
        Immoampel
      </span>
    </span>
  );
}
