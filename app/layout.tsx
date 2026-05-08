import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Substack Agent · a working memory for everything you've written",
  description:
    "Paste your Substack URL, build a private writing workspace, and get grounded feedback, ideas, and distribution drafts based on your actual posts.",
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
