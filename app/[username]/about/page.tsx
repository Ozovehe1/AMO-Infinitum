import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getThemeByUsername } from "@/lib/theme";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const theme = await getThemeByUsername(username);
  if (!theme) return {};
  return { title: `About — ${theme.siteName}` };
}

export default async function AboutPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [user, theme] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    getThemeByUsername(username),
  ]);
  if (!user || !theme) notFound();

  const accent = theme.colorAccent || "#c8a97e";
  const primary = theme.colorPrimary || "#0d1f3c";

  return (
    <>
      <Header username={username} theme={theme} />
      <main style={{ paddingTop: 64, background: "#fffef9", flex: 1 }}>
        {/* Hero strip */}
        <div style={{ background: primary, padding: "5rem 1.5rem" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <p style={{ color: accent, fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 1rem" }}>About</p>
            <h1 style={{ fontFamily: "var(--blog-font-heading, 'Playfair Display', Georgia, serif)", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, color: "#fffef9", lineHeight: 1.15, margin: "0 0 1.75rem" }}>
              {theme.siteName}
            </h1>
            {theme.aboutHeroSubtitle && (
              <p style={{ fontFamily: "var(--blog-font-body, 'Source Serif 4', Georgia, serif)", fontSize: "1.15rem", color: "rgba(255,254,249,0.72)", lineHeight: 1.75, margin: 0, maxWidth: 560, fontStyle: "italic" }}>
                {theme.aboutHeroSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "5rem 1.5rem" }}>
          {theme.aboutBody ? (
            <div className="prose-amo" dangerouslySetInnerHTML={{ __html: theme.aboutBody }} />
          ) : (
            <p style={{ fontFamily: "var(--blog-font-body, 'Source Serif 4', Georgia, serif)", fontSize: "1.05rem", color: "#3a5068", lineHeight: 1.8 }}>
              Welcome to {theme.siteName}.
            </p>
          )}
        </div>
      </main>
      <Footer username={username} theme={theme} />
    </>
  );
}
