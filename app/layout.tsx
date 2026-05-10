import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { authOptions } from "@/lib/server/auth/options";

export const metadata: Metadata = {
  title: "Scaffold",
  description:
    "Build a private AI-powered workspace around your library, then get tailored feedback, ideas, and distribution drafts grounded in your writing.",
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
