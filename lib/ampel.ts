import type { Ampel } from "@/lib/scoring";

export const AMPEL_LABEL: Record<Ampel, string> = {
  gruen: "Grün",
  gelb: "Gelb",
  rot: "Rot",
};

/** Füllfarben (Hex) – z.B. für die SVG-Karte. */
export const AMPEL_HEX: Record<Ampel, string> = {
  gruen: "#16a34a",
  gelb: "#d97706",
  rot: "#dc2626",
};

export const AMPEL_NO_DATA_HEX = "#d6d3d1"; // stone-300

/** Tailwind-Klassen für Badges/Flächen. */
export const AMPEL_CLASSES: Record<Ampel, { bg: string; text: string; ring: string }> = {
  gruen: { bg: "bg-[#dcfce7]", text: "text-[#15803d]", ring: "border-[#16a34a]" },
  gelb: { bg: "bg-[#fef3c7]", text: "text-[#b45309]", ring: "border-[#d97706]" },
  rot: { bg: "bg-[#fee2e2]", text: "text-[#b91c1c]", ring: "border-[#dc2626]" },
};

export function ampelHex(a: Ampel | null): string {
  return a ? AMPEL_HEX[a] : AMPEL_NO_DATA_HEX;
}
