import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getGeneratedAt } from "@/lib/data";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Immoampel – Standort-Ampel für Österreichs Bezirke",
    template: "%s · Immoampel",
  },
  description:
    "Investment, Lebensqualität und Zukunftsfestigkeit für alle 94 politischen Bezirke Österreichs – auf einen Ampel-Blick. powered by Immoampel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer generatedAt={getGeneratedAt()} />
      </body>
    </html>
  );
}
