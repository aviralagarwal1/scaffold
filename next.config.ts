import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Hide the Next.js 16 floating dev tools panel. Production builds are
  // unaffected — the panel only renders during `next dev`.
  devIndicators: false,
  // next dev would otherwise rewrite its own agent block into CLAUDE.md and
  // AGENTS.md, which hold only the repo's instructions.
  agentRules: false,
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
