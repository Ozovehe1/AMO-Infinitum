import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMO Infinitum — Start Your Blog",
  description: "AMO Infinitum is a platform for writers. Create your blog, publish your writing, and build your audience.",
  openGraph: {
    title: "AMO Infinitum",
    description: "A platform for writers who care about words.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
