import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hide the Next.js 16 floating dev tools panel. Production builds are
  // unaffected — the panel only renders during `next dev`.
  devIndicators: false,
};

export default nextConfig;
