import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Scaffold",
  description:
    "Build a private AI-powered workspace around your publication archive, then get tailored feedback, ideas, and distribution drafts grounded in your writing.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
