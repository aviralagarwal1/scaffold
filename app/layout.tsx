import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { authOptions } from "@/lib/server/auth/options";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "@/lib/copy";

function publicAppUrl(): URL {
  const raw = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: publicAppUrl(),
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION,
};

export const viewport: Viewport = {
  // Mobile browser chrome (Safari status bar tint, Chrome on Android address
  // bar) picks up this color. Editorial bronze keeps the brand intact when
  // the page first paints on phones; we fall back to the warm paper tone in
  // light mode so the chrome doesn't feel like a different app from the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#7d3d1a" },
  ],
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body>
        <Providers session={session}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
