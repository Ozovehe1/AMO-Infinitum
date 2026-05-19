import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMO Infinitum",
  description: "A space for thoughts without end — on life, meaning, and the art of paying attention.",
  openGraph: {
    title: "AMO Infinitum",
    description: "A space for thoughts without end.",
    type: "website",
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
