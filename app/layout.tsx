import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMO Infinitum",
  description: "A personal journal with no niche — raw, honest writing on existence, ideas, faith, doubt, and everything in between. By Cryptnate.",
  openGraph: {
    title: "AMO Infinitum",
    description: "A personal journal with no niche — raw, honest writing on existence, ideas, and everything in between.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@Cryptnate",
    creator: "@Cryptnate",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {children}
      </body>
    </html>
  );
}
