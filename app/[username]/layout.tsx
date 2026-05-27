import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getTheme } from "@/lib/theme";

// Fonts already loaded in globals.css — no extra fetch needed
const BUNDLED_FONTS = new Set(["Playfair Display", "Source Serif 4", "Inter", "Georgia"]);

// Google Fonts spec per font name
const GFONTS: Record<string, string> = {
  "Lora":               "Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600",
  "Cormorant Garamond": "Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500",
  "DM Serif Display":   "DM+Serif+Display:ital@0;1",
  "Libre Baskerville":  "Libre+Baskerville:ital,wght@0,400;0,700;1,400",
  "Merriweather":       "Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400",
  "EB Garamond":        "EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500",
  "Nunito":             "Nunito:wght@300;400;500;600",
  "Raleway":            "Raleway:wght@300;400;500;600",
};

function buildFontsUrl(heading: string, body: string): string | null {
  const families: string[] = [];
  if (!BUNDLED_FONTS.has(heading) && GFONTS[heading]) families.push(`family=${GFONTS[heading]}`);
  if (!BUNDLED_FONTS.has(body) && GFONTS[body] && body !== heading) families.push(`family=${GFONTS[body]}`);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const theme = await getTheme(user.id);
  const primary = theme.colorPrimary || "#0d1f3c";
  const accent = theme.colorAccent || "#c8a97e";
  const bg = theme.colorBg || "#f5f0e8";
  const fontHeading = theme.fontHeading || "Playfair Display";
  const fontBody = theme.fontBody || "Source Serif 4";
  const fontsUrl = buildFontsUrl(fontHeading, fontBody);

  return (
    <>
      {fontsUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      )}
      <div
        style={{
          ["--blog-primary" as string]: primary,
          ["--blog-accent" as string]: accent,
          ["--blog-bg" as string]: bg,
          ["--blog-font-heading" as string]: `'${fontHeading}', Georgia, serif`,
          ["--blog-font-body" as string]: `'${fontBody}', Georgia, serif`,
          background: bg,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </>
  );
}
