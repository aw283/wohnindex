import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auf Vercel nativ als Next.js deployen (alle Seiten sind statisch/SSG).
  // Kein output:'export' nötig – das verursachte mit Next 16 das Root-404.
  images: { unoptimized: true },
};

export default nextConfig;
