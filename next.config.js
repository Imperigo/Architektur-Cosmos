/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML Export — perfekt für die aktuelle MVP-Phase (keine SSR/API).
  // Wenn später DB-Integration mit Server Components kommt: hier auf
  // den OpenNext.js / Cloudflare-Workers-Pfad umstellen.
  output: 'export',

  // Trailing slashes für saubere URLs auf static hosts (architekturkosmos.ch/atlas/)
  trailingSlash: true,

  // Bild-Optimization deaktivieren — nicht verfügbar bei static export
  images: { unoptimized: true },
};

module.exports = nextConfig;
